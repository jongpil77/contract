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

// --- [핵심] 1. 인메모리 DB (서버 재시작 시 초기화됨, 실제 운영 시 DB 필요) ---
// 키: 계약ID, 값: 계약정보 객체
const contractsDB = new Map();

// --- 2. 유틸리티 함수 ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount || 0);
}

// --- 3. HTML 동적 생성 템플릿 함수 (form.html 대체) ---
function generateContractHtml(contract) {
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

// --- 4. API 라우트 정의 ---

// [직원용] 계약 생성 API (React 앱에서 호출)
app.post('/api/contracts', (req, res) => {
  try {
    const contractData = req.body; // { id, contractNo, vendorName, amount... }
    // DB에 저장 (메모리)
    contractsDB.set(contractData.id, contractData);
    console.log(`[Contract Created] ${contractData.id} - ${contractData.vendorName}`);
    res.json({ success: true, message: '계약 정보가 서버에 등록되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [협력업체용] 계약서 조회 페이지 (동적 HTML 생성)
app.get('/sign/:id', (req, res) => {
  const contractId = req.params.id;
  const contract = contractsDB.get(contractId);

  if (!contract) {
    return res.status(404).send('<h1>유효하지 않거나 만료된 계약 링크입니다.</h1>');
  }

  if (contract.status === 'COMPLETED') {
    return res.send('<h1>이미 체결이 완료된 계약입니다.</h1>');
  }

  // 여기서 HTML을 즉석에서 생성하여 응답
  const html = generateContractHtml(contract);
  res.send(html);
});

// [협력업체용] 최종 서명 처리 및 PDF 발송
app.post('/sign/:id/complete', upload.single('stamp'), async (req, res) => {
  const contractId = req.params.id;
  const contract = contractsDB.get(contractId);
  let pdfPath = null;
  let htmlPath = null;

  if (!contract) return res.status(404).send('계약 정보를 찾을 수 없습니다.');

  try {
    // 1. 도장 이미지 처리
    const stampBase64 = req.file ? (await fs.readFile(req.file.path)).toString('base64') : '';
    
    // 2. PDF 변환용 HTML 재생성 (도장 포함)
    // (화면용 HTML과 비슷하지만 인쇄용 스타일 적용 가능)
    const finalHtml = generateContractHtml({ ...contract }).replace(
      'id="preview" style="max-width:100px; display:none; margin:0 auto;">',
      `src="data:image/png;base64,${stampBase64}" style="width:100px;">`
    ).replace(/<input.*?>/g, '').replace(/<button.*?>.*?<\/button>/g, ''); // 버튼 등 제거

    // 3. 파일 저장 및 PDF 변환
    const uniqueId = Date.now();
    htmlPath = `/tmp/${uniqueId}.html`;
    pdfPath = `/tmp/${uniqueId}.pdf`;
    
    await fs.writeFile(htmlPath, finalHtml);
    
    await new Promise((resolve, reject) => {
      const wk = spawn('wkhtmltopdf', ['--encoding', 'utf-8', '--quiet', htmlPath, pdfPath]);
      wk.on('close', (code) => code === 0 ? resolve() : reject(new Error('PDF 변환 실패')));
      wk.on('error', reject);
    });

    // 4. 메일 발송
    const transporter = nodemailer.createTransport({
        host: process.env.SMTPHOST,
        port: Number(process.env.SMTPPORT || 465),
        secure: true,
        auth: { user: process.env.SMTPUSER, pass: process.env.SMTPPASS }
    });

    await transporter.sendMail({
      from: process.env.FROMEMAIL,
      to: contract.creatorEmail || process.env.TOEMAIL, // 직원의 이메일로 발송
      subject: `[계약체결완료] ${contract.vendorName} - ${contract.contractNo}`,
      text: '협력업체가 서명을 완료했습니다. 첨부된 계약서를 확인하세요.',
      attachments: [{ filename: `${contract.contractNo}.pdf`, path: pdfPath }]
    });

    // 5. 상태 업데이트
    contract.status = 'COMPLETED';
    contract.completedAt = new Date().toLocaleString();
    contractsDB.set(contractId, contract);

    res.send('<h1>계약 체결이 완료되었습니다.</h1><p>창을 닫으셔도 됩니다.</p>');

  } catch (err) {
    console.error(err);
    res.status(500).send(`오류 발생: ${err.message}`);
  } finally {
    // 정리
    try {
        if (req.file) await fs.unlink(req.file.path).catch(()=>{});
        if (htmlPath) await fs.unlink(htmlPath).catch(()=>{});
        if (pdfPath) await fs.unlink(pdfPath).catch(()=>{});
    } catch {}
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contract Server running on port ${PORT}`));