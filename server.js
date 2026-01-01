import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: '/tmp/uploads' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 유틸리티: 사업자번호 검증
function isValidBizNo(bizNo) {
  if (!bizNo || !/^\d{10}$/.test(bizNo)) return false;
  const d = bizNo.split('').map(Number);
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let tmp = 0;
  for (let i = 0; i < 9; i++) tmp += d[i] * w[i];
  tmp += Math.floor(d[8] * 5 / 10);
  const check = (10 - (tmp % 10)) % 10;
  return check === d[9];
}

// 유틸리티: 파일명 안전 처리
function sanitizeName(name) {
  return String(name || '').replace(/[\/:*?"<>|]/g, '').trim();
}

// HTML 템플릿 생성
function renderHtml({ vendorName, bizNo, periodFrom, periodTo, increaseRate, stampBase64 }) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: "Noto Sans KR", Arial; margin: 24px; }
    h1 { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #999; padding: 8px; text-align: left; }
    th { background: #f0f0f0; width: 120px; }
    .stamp-container { margin-top: 20px; text-align: right; }
    .stamp { width: 100px; height: 100px; object-fit: contain; vertical-align: middle; }
    footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <h1>수가 계약서</h1>
  <table>
    <tr><th>업체명</th><td>${vendorName}</td></tr>
    <tr><th>사업자번호</th><td>${bizNo}</td></tr>
    <tr><th>계약기간</th><td>${periodFrom} ~ ${periodTo}</td></tr>
    <tr><th>인상률</th><td>${increaseRate}%</td></tr>
  </table>
  <div class="stamp-container">
    <span>(인)</span>
    <img class="stamp" src="data:image/png;base64,${stampBase64}" alt="직인">
  </div>
  <footer>
    본 문서는 전자적으로 생성되었습니다. (생성일시: ${new Date().toLocaleString('ko-KR')})
  </footer>
</body>
</html>`;
}

// 메일 발송 함수
async function sendMail(pdfPath, filename, meta) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTPHOST,
    port: Number(process.env.SMTPPORT || 465),
    secure: true, // 465 포트 사용 시 true
    auth: {
      user: process.env.SMTPUSER,
      pass: process.env.SMTPPASS
    }
  });

  await transporter.sendMail({
    from: process.env.FROMEMAIL,
    to: process.env.TOEMAIL,
    subject: `[CONTRACT] ${meta.bizNo} ${meta.vendorName}`,
    text: `수가 계약서가 접수되었습니다.\n\n업체명: ${meta.vendorName}\n사업자번호: ${meta.bizNo}\n계약기간: ${meta.periodFrom} ~ ${meta.periodTo}\n인상률: ${meta.increaseRate}%`,
    attachments: [{ filename, path: pdfPath }]
  });
}

// n8n 감사로그 전송 (옵션)
async function postN8nAudit(meta, pdfPath) {
  if (!process.env.N8NWEBHOOKURL) return;
  try {
    const pdfBase64 = (await fs.readFile(pdfPath)).toString('base64');
    // Node.js 18+ 에서는 fetch 기본 지원
    await fetch(process.env.N8NWEBHOOKURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...meta, pdfBase64 })
    });
  } catch (e) {
    console.warn('[AUDIT] n8n webhook 실패:', e.message);
  }
}

// 라우트: 폼 페이지
app.get('/', async (req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, 'views', 'form.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Form loading error');
  }
});

// 라우트: PDF 생성 및 처리
app.post('/contracts/generate', upload.single('stamp'), async (req, res) => {
  let htmlPath = null;
  let pdfPath = null;

  try {
    const { vendorName, periodFrom, periodTo, increaseRate } = req.body;
    const bizNo = String(req.body.bizNo || '').replace(/\D/g, '');

    // 1. 유효성 검사
    if (!isValidBizNo(bizNo)) {
      return res.status(400).send('<script>alert("유효하지 않은 사업자등록번호입니다."); history.back();</script>');
    }
    if (!req.file) {
      return res.status(400).send('<script>alert("도장 이미지가 필요합니다."); history.back();</script>');
    }

    const stampBase64 = (await fs.readFile(req.file.path)).toString('base64');
    const htmlContent = renderHtml({ vendorName, bizNo, periodFrom, periodTo, increaseRate, stampBase64 });

    // 2. 임시 파일 경로 설정
    const uniqueId = Date.now();
    htmlPath = `/tmp/${uniqueId}.html`;
    pdfPath = `/tmp/${uniqueId}.pdf`;

    // 3. HTML 저장 및 PDF 변환
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    
    await new Promise((resolve, reject) => {
      const wk = spawn('wkhtmltopdf', ['--encoding', 'utf-8', '--quiet', htmlPath, pdfPath]);
      wk.on('error', reject);
      wk.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`wkhtmltopdf exited with code ${code}`))));
    });

    // 4. 파일명 생성 (사업자번호_업체명_날짜.pdf)
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${bizNo}_${sanitizeName(vendorName)}_${ymd}.pdf`;

    // 5. 메일 발송
    await sendMail(pdfPath, filename, { vendorName, bizNo, periodFrom, periodTo, increaseRate });

    // 6. n8n 감사로그 (비동기 처리)
    postN8nAudit({ vendorName, bizNo, periodFrom, periodTo, increaseRate, filename }, pdfPath);

    res.send('<script>alert("계약서가 성공적으로 제출되었습니다."); window.location.href="/";</script>');

  } catch (err) {
    console.error(err);
    res.status(500).send(`처리 중 오류가 발생했습니다: ${err.message}`);
  } finally {
    // 리소스 정리 (업로드 파일 및 임시 파일 삭제)
    try {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        if (htmlPath) await fs.unlink(htmlPath).catch(() => {});
        if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contract PDF Server running on port ${PORT}`));