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

// [추가된 부분 1] React 빌드 결과물(정적 파일) 서빙 설정
app.use(express.static(path.join(__dirname, 'dist')));

// --- 기존 로직 (DB 및 함수들) ---
const contractsDB = new Map();

function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount || 0);
}

function generateContractHtml(contract) {
  // ... (기존 HTML 생성 코드 그대로 유지 - 너무 길어서 생략, 이전 코드 쓰시면 됩니다) ...
  // ★ 주의: 이 함수 내용은 이전 답변의 generateContractHtml 코드를 그대로 유지하세요.
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>자동차 정비수가 계약서</title>
  <style>
    body { font-family: "Noto Sans KR", Arial; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { text-align: center; border-bottom: 2px solid #333; pb-4 mb: 20px; font-size: 24px; }
    .contract-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; }
    .contract-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .label { font-weight: bold; color: #555; }
    .value { font-weight: bold; color: #00008F; }
    .content { font-size: 14px; line-height: 1.6; margin-bottom: 30px; }
    .article { margin-bottom: 15px; }
    .article-title { font-weight: bold; display: block; margin-bottom: 4px; }
    .stamp-area { text-align: center; margin-top: 30px; padding: 20px; border: 2px dashed #ccc; border-radius: 10px; cursor: pointer; position: relative; }
    .stamp-area:hover { border-color: #00008F; background: #f0f7ff; }
    input[type=file] { position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor: pointer; }
    button { width: 100%; padding: 15px; background: #00008F; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px; }
    button:disabled { background: #ccc; }
    .helper { font-size: 12px; color: #888; text-align: center; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>자동차 정비수가 계약서</h1>
    
    <div class="contract-info">
      <div class="contract-row"><span class="label">계약번호</span><span class="value">${contract.contractNo}</span></div>
      <div class="contract-row"><span class="label">업체명</span><span class="value">${contract.vendorName}</span></div>
      <div class="contract-row"><span class="label">사업자번호</span><span class="value">${contract.vendorId}</span></div>
    </div>

    <div class="content">
      <div class="article">
        <span class="article-title">제 1 조 (계약 금액)</span>
        2026년도 시간당 공임 및 정비수가는 금 <strong>${formatCurrency(contract.amount)}원</strong>으로 한다.
      </div>
      <div class="article">
        <span class="article-title">제 2 조 (계약 기간)</span>
        본 계약의 기간은 <strong>${contract.periodStart}</strong> 부터 <strong>${contract.periodEnd}</strong> 까지로 한다.
      </div>
      <div class="article">
        <span class="article-title">제 3 조 (성실의무)</span>
        "을"(${contract.vendorName})은 "갑"(AXA손해보험)의 위탁 업무를 성실히 수행한다.
      </div>
    </div>

    <form action="/sign/${contract.id}/complete" method="post" enctype="multipart/form-data">
      <div class="stamp-area" id="stampArea">
        <p>📋 여기를 눌러 직인/도장 이미지를 등록하세요</p>
        <img id="preview" style="max-width:100px; display:none; margin:0 auto;">
        <input type="file" name="stamp" accept="image/*" required onchange="previewStamp(this)">
      </div>
      
      <div style="margin-top: 20px;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" required id="agreeCheck">
          <span style="font-size:14px; font-weight:bold;">위 계약 내용을 확인하였으며 체결에 동의합니다.</span>
        </label>
      </div>

      <button type="submit" id="submitBtn">최종 서명 및 체결 완료</button>
      <p class="helper">체결 즉시 PDF가 담당자 메일로 발송됩니다.</p>
    </form>
  </div>

  <script>
    function previewStamp(input) {
      if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('preview').src = e.target.result;
          document.getElementById('preview').style.display = 'block';
          document.querySelector('#stampArea p').style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
      }
    }
  </script>
</body>
</html>`;
}

// --- API 라우트 ---

app.post('/api/contracts', (req, res) => {
  try {
    const contractData = req.body; 
    contractsDB.set(contractData.id, contractData);
    console.log(`[Contract Created] ${contractData.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sign/:id', (req, res) => {
  const contract = contractsDB.get(req.params.id);
  if (!contract) return res.status(404).send('<h1>유효하지 않은 계약 링크입니다.</h1>');
  if (contract.status === 'COMPLETED') return res.send('<h1>이미 체결 완료된 계약입니다.</h1>');
  res.send(generateContractHtml(contract));
});

app.post('/sign/:id/complete', upload.single('stamp'), async (req, res) => {
  // ... (기존 PDF 생성 및 메일 발송 코드 그대로 유지) ...
  const contractId = req.params.id;
  const contract = contractsDB.get(contractId);
  let pdfPath = null, htmlPath = null;

  if (!contract) return res.status(404).send('계약 정보 없음');

  try {
    const stampBase64 = req.file ? (await fs.readFile(req.file.path)).toString('base64') : '';
    
    // PDF용 HTML 생성
    const finalHtml = generateContractHtml({ ...contract }).replace(
      'id="preview" style="max-width:100px; display:none; margin:0 auto;">',
      `src="data:image/png;base64,${stampBase64}" style="width:100px;">`
    ).replace(/<input.*?>/g, '').replace(/<button.*?>.*?<\/button>/g, '');

    const uniqueId = Date.now();
    htmlPath = `/tmp/${uniqueId}.html`;
    pdfPath = `/tmp/${uniqueId}.pdf`;
    
    await fs.writeFile(htmlPath, finalHtml);
    
    await new Promise((resolve, reject) => {
      const wk = spawn('wkhtmltopdf', ['--encoding', 'utf-8', '--quiet', htmlPath, pdfPath]);
      wk.on('close', (code) => code === 0 ? resolve() : reject(new Error('PDF 변환 실패')));
      wk.on('error', reject);
    });

    const transporter = nodemailer.createTransport({
        host: process.env.SMTPHOST,
        port: Number(process.env.SMTPPORT || 465),
        secure: true,
        auth: { user: process.env.SMTPUSER, pass: process.env.SMTPPASS }
    });

    await transporter.sendMail({
      from: process.env.FROMEMAIL,
      to: contract.creatorEmail || process.env.TOEMAIL,
      subject: `[체결완료] ${contract.vendorName} - ${contract.contractNo}`,
      text: '계약이 체결되었습니다. 첨부파일을 확인하세요.',
      attachments: [{ filename: `${contract.contractNo}.pdf`, path: pdfPath }]
    });

    contract.status = 'COMPLETED';
    contractsDB.set(contractId, contract);
    res.send('<h1>계약 체결 완료!</h1><p>창을 닫으셔도 됩니다.</p>');

  } catch (err) {
    console.error(err);
    res.status(500).send(`오류: ${err.message}`);
  } finally {
    try {
        if (req.file) await fs.unlink(req.file.path).catch(()=>{});
        if (htmlPath) await fs.unlink(htmlPath).catch(()=>{});
        if (pdfPath) await fs.unlink(pdfPath).catch(()=>{});
    } catch {}
  }
});

// [추가된 부분 2] 위 API 경로 외의 모든 요청은 React 화면(index.html)으로 보냄
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));