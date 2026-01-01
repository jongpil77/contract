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
app.use(express.static(path.join(__dirname, 'dist')));

// --- DB (메모리) ---
const contractsDB = new Map();

// ... (기존 formatCurrency, generateContractHtml 함수 등은 그대로 유지) ...

// [API] 직원용 계약 생성
app.post('/api/contracts', (req, res) => {
  try {
    const contractData = req.body; 
    contractsDB.set(contractData.id, contractData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [API] 업체용: 계약 조회 및 인증 (추가된 부분!)
app.post('/api/vendor/login', (req, res) => {
  const { contractId, bizNo } = req.body;
  const contract = contractsDB.get(contractId);

  if (!contract) {
    return res.status(404).json({ error: '존재하지 않는 계약입니다.' });
  }
  
  // 사업자번호(숫자만 남겨서 비교)
  const cleanInputBiz = String(bizNo).replace(/-/g, '').trim();
  const cleanTargetBiz = String(contract.vendorId).replace(/-/g, '').trim();

  if (cleanInputBiz !== cleanTargetBiz) {
    return res.status(401).json({ error: '사업자번호가 일치하지 않습니다.' });
  }

  // 인증 성공 시 계약 정보 반환
  res.json({ success: true, contract });
});

// [API] 업체용: 최종 서명 및 PDF 발송
app.post('/sign/:id/complete', upload.single('stamp'), async (req, res) => {
  // ... (기존 PDF 변환 및 메일 발송 로직 그대로 유지) ...
  // (지면상 생략, 기존 코드 그대로 두시면 됩니다)
});

// 모든 요청을 React로 넘김 (새로고침 시 404 방지)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
app.use(express.static(path.join(__dirname, 'dist')));

// --- DB (메모리) ---
const contractsDB = new Map();

// ... (기존 formatCurrency, generateContractHtml 함수 등은 그대로 유지) ...

// [API] 직원용 계약 생성
app.post('/api/contracts', (req, res) => {
  try {
    const contractData = req.body; 
    contractsDB.set(contractData.id, contractData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [API] 업체용: 계약 조회 및 인증 (추가된 부분!)
app.post('/api/vendor/login', (req, res) => {
  const { contractId, bizNo } = req.body;
  const contract = contractsDB.get(contractId);

  if (!contract) {
    return res.status(404).json({ error: '존재하지 않는 계약입니다.' });
  }
  
  // 사업자번호(숫자만 남겨서 비교)
  const cleanInputBiz = String(bizNo).replace(/-/g, '').trim();
  const cleanTargetBiz = String(contract.vendorId).replace(/-/g, '').trim();

  if (cleanInputBiz !== cleanTargetBiz) {
    return res.status(401).json({ error: '사업자번호가 일치하지 않습니다.' });
  }

  // 인증 성공 시 계약 정보 반환
  res.json({ success: true, contract });
});

// [API] 업체용: 최종 서명 및 PDF 발송
app.post('/sign/:id/complete', upload.single('stamp'), async (req, res) => {
  // ... (기존 PDF 변환 및 메일 발송 로직 그대로 유지) ...
  // (지면상 생략, 기존 코드 그대로 두시면 됩니다)
});

// 모든 요청을 React로 넘김 (새로고침 시 404 방지)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));