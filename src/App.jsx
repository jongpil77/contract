import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Copy, QrCode, LogOut, CheckCircle2, Upload, History, Mail, 
  Settings, UserCheck, Trash2, ShieldCheck, Lock, X, Calendar, 
  FileText, Eye, PlayCircle, Hash, Clock, FileDown, ChevronDown, 
  AlertTriangle, ShieldAlert, Printer, Send, FileSpreadsheet, PlusCircle
} from 'lucide-react';

/**
 * 정비수가 모바일 계약 체결 시스템 - V3.0 (Final Enterprise Version)
 */

// --- 1. 초기 데이터 및 상수 ---

// 연도별 인상률 데이터 (2018 ~ 2026)
const INITIAL_RATES = {
  2018: 2.1, 2019: 2.4, 2020: 2.0, 2021: 2.5, 
  2022: 2.9, 2023: 3.0, 2024: 2.5, 2025: 2.6, 2026: 2.7
};

// 샘플 업체 데이터 (엑셀 업로드 전 기본 데이터)
const INITIAL_VENDORS = {
  '1234567890': {
    name: '(주)AXA 협력공장', ceoName: '이강인', phone: '010-1234-5678',
    address: '서울특별시 중구 을지로 100 15층', 
    lastContractDate: '2025-01-15', // 직전 계약일
    lastContractPeriod: '2025-01-15 ~ 2025-12-31',
    lastContractAmount: 45000000
  }
};

// --- 2. 유틸리티 함수 ---
const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount || 0);
const toCommaString = (val) => val.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fromCommaString = (val) => parseInt(val.replace(/,/g, '')) || 0;
const formatBizNo = (no) => no.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');

// 로고 컴포넌트
const AxaLogo = ({ size = "normal" }) => (
  <div className={`flex items-center gap-3 ${size === "large" ? 'mb-8' : ''}`}>
    <div className={`${size === "large" ? 'w-20 h-20' : 'w-11 h-11'} relative overflow-hidden flex items-center justify-center bg-white rounded-sm shadow-sm`}>
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/AXA_Logo.svg/512px-AXA_Logo.svg.png" alt="AXA" className="w-full h-full object-contain p-0.5" />
    </div>
    <div className="flex flex-col leading-none border-l border-blue-100 pl-3 text-left">
      <span className={`font-black tracking-tighter text-[#00008F] ${size === "large" ? 'text-2xl' : 'text-lg'}`}>정비수가 모바일 계약</span>
    </div>
  </div>
);

export default function App() {
  // --- State Management ---
  const [page, setPage] = useState('login'); 
  const [userEmail, setUserEmail] = useState(''); // 로그인한 직원 이메일
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [rates, setRates] = useState(INITIAL_RATES);
  const [contracts, setContracts] = useState([]);

  // Login & Auth States
  const [loginStep, setLoginStep] = useState('email'); // email -> verify -> password
  const [inputEmail, setInputEmail] = useState('');
  const [serverCode, setServerCode] = useState(null); // 서버가 보낸 인증코드
  const [inputCode, setInputCode] = useState('');
  const [inputPw, setInputPw] = useState('');
  
  // Dashboard Logic States
  const [showRateModal, setShowRateModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [searchNo, setSearchNo] = useState('');
  const [foundVendor, setFoundVendor] = useState(null);
  
  // Contract Creation States
  const [contractForm, setContractForm] = useState({
    amount: '',
    startDate: '',
    endDate: ''
  });

  // Flow & Vendor View States
  const [currentContract, setCurrentContract] = useState(null);
  const [vendorAuth, setVendorAuth] = useState({ bizNo: '', ceoName: '' });
  const [isVendorAuthenticated, setIsVendorAuthenticated] = useState(false);
  const [isContractRead, setIsContractRead] = useState(false);
  const [isLegalChecked, setIsLegalChecked] = useState(false); // 내용 확인 및 동의 체크
  const [stampImage, setStampImage] = useState(null);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  const [showQRSection, setShowQRSection] = useState(false);

  // Simulation States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');

  // --- Handlers: Login Process ---
  
  const requestVerificationCode = (e) => {
    e.preventDefault();
    if(!inputEmail.includes('@') || !inputEmail.includes('.')) return alert('유효한 이메일 형식이 아닙니다.');
    
    // 인증번호 생성 및 발송 시뮬레이션
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerCode(code);
    alert(`[메일 발송됨]\n인증번호: ${code}\n\n(실제로는 이메일로 발송됩니다)`);
    setLoginStep('verify');
  };

  const verifyCode = (e) => {
    e.preventDefault();
    if(inputCode === serverCode) {
      alert('인증되었습니다. 비밀번호를 입력해주세요.');
      setLoginStep('password');
    } else {
      alert('인증번호가 일치하지 않습니다.');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if(inputPw.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
    setUserEmail(inputEmail);
    setPage('dashboard');
  };

  // --- Handlers: Admin (Rates & Excel) ---

  const handleRateChange = (year, val) => {
    setRates(prev => ({ ...prev, [year]: parseFloat(val) }));
  };

  const handleExcelUpload = (e) => {
    // 엑셀 파일 업로드 및 파싱 시뮬레이션
    const file = e.target.files[0];
    if(file) {
      setTimeout(() => {
        // 더미 데이터 추가
        setVendors(prev => ({
          ...prev,
          '9876543210': {
            name: '(주)신규 모터스', ceoName: '손흥민', phone: '010-9999-8888',
            address: '경기도 성남시 분당구 판교로 200', 
            lastContractDate: '2024-12-01',
            lastContractPeriod: '2024-12-01 ~ 2025-11-30',
            lastContractAmount: 85000000
          }
        }));
        alert(`${file.name} 파일의 데이터 25건이 DB에 등록되었습니다.`);
        setShowExcelModal(false);
      }, 1000);
    }
  };

  // --- Handlers: Contract Creation ---

  const searchVendor = () => {
    const v = vendors[searchNo];
    if(v) {
      setFoundVendor(v);
      // 자동 계산: 작년 금액 * (1 + 2026년 인상률)
      const thisYearRate = rates[2026] || 2.7;
      const calcAmount = Math.floor((v.lastContractAmount * (1 + thisYearRate / 100)) / 10) * 10; // 10원 단위 절사
      
      // 자동 기간: 오늘 ~ 연말 (예시)
      const todayStr = new Date().toISOString().split('T')[0];
      const endYearStr = `${new Date().getFullYear()}-12-31`;

      setContractForm({
        amount: toCommaString(calcAmount),
        startDate: todayStr,
        endDate: endYearStr
      });
    } else {
      alert('등록된 업체가 아닙니다. 엑셀 업로드를 통해 DB를 갱신해주세요.\n(테스트: 1234567890)');
      setFoundVendor(null);
    }
  };

  const createContract = () => {
    if(!contractForm.amount || !contractForm.startDate || !contractForm.endDate) return alert('모든 필수 정보를 입력해주세요.');
    
    const newContract = {
      id: `C${Date.now()}`,
      contractNo: `2026-AXA-${(contracts.length+1).toString().padStart(4,'0')}`,
      vendorId: searchNo,
      vendorName: foundVendor.name,
      ceoName: foundVendor.ceoName,
      address: foundVendor.address,
      amount: fromCommaString(contractForm.amount),
      periodStart: contractForm.startDate,
      periodEnd: contractForm.endDate,
      status: 'PENDING',
      creatorEmail: userEmail,
      createdAt: new Date().toLocaleString()
    };
    
    setContracts([newContract, ...contracts]);
    setFoundVendor(null);
    setSearchNo('');
    alert('계약서가 생성되었습니다. 하단 목록에서 링크를 전송하세요.');
  };

  // --- Handlers: Vendor Side ---

  const handleVendorAuth = (e) => {
    e.preventDefault();
    if(vendorAuth.bizNo === currentContract.vendorId && vendorAuth.ceoName === currentContract.ceoName) {
      setIsVendorAuthenticated(true);
    } else {
      alert('사업자번호 또는 대표자명이 일치하지 않습니다.');
    }
  };

  const handleFinalSubmit = () => {
    setShowFinalConfirmModal(false);
    setIsProcessing(true);
    setProcessStep('pdf');
    
    setTimeout(() => {
      setProcessStep('email');
      setTimeout(() => {
        // 완료 처리
        const updated = { 
          ...currentContract, 
          status: 'COMPLETED', 
          completedAt: new Date().toLocaleString(),
          stamp: stampImage
        };
        setContracts(contracts.map(c => c.id === updated.id ? updated : c));
        setPage('success');
        setIsProcessing(false);
      }, 2500);
    }, 2000);
  };

  // --- Render Components ---

  // 1. 로그인 화면
  const renderLogin = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F7FF] p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 border border-blue-50">
        <div className="text-center mb-10">
          <AxaLogo size="large" />
          <p className="text-slate-500 mt-2 text-sm">직원 전용 모바일 계약 시스템</p>
        </div>

        {loginStep === 'email' && (
          <form onSubmit={requestVerificationCode} className="space-y-4 animate-in fade-in">
            <div>
              <label className="block text-sm font-bold text-[#00008F] mb-1">직원 이메일</label>
              <input type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)} placeholder="axa@axa.co.kr" className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none focus:border-[#00008F]" required/>
            </div>
            <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold text-lg hover:bg-[#000066]">인증번호 받기</button>
          </form>
        )}

        {loginStep === 'verify' && (
          <form onSubmit={verifyCode} className="space-y-4 animate-in slide-in-from-right-10">
            <div>
              <label className="block text-sm font-bold text-[#00008F] mb-1">인증번호 입력</label>
              <input type="text" value={inputCode} onChange={e => setInputCode(e.target.value)} placeholder="6자리 숫자" maxLength={6} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none text-center tracking-widest text-lg font-bold" required/>
            </div>
            <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold text-lg">인증 확인</button>
            <button type="button" onClick={() => setLoginStep('email')} className="w-full py-2 text-slate-400 text-sm">이메일 다시 입력</button>
          </form>
        )}

        {loginStep === 'password' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-right-10">
            <div className="text-center mb-4">
              <span className="bg-blue-100 text-[#00008F] px-3 py-1 rounded-full text-xs font-bold">{inputEmail}</span>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#00008F] mb-1">비밀번호 설정/입력</label>
              <input type="password" value={inputPw} onChange={e => setInputPw(e.target.value)} placeholder="6자리 이상 입력" minLength={6} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none" required/>
            </div>
            <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold text-lg">시스템 로그인</button>
          </form>
        )}
      </div>
    </div>
  );

  // 2. 직원용 대시보드
  const renderDashboard = () => (
    <div className="min-h-screen bg-[#F8FBFF] font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <AxaLogo />
        <div className="flex gap-2">
          <button onClick={() => setShowRateModal(true)} className="p-2 bg-slate-100 rounded-full text-slate-600"><Settings size={20}/></button>
          <button onClick={() => setPage('login')} className="p-2 bg-slate-100 rounded-full text-slate-600"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* DB 관리 섹션 */}
        <section className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#00008F] flex items-center gap-2"><FileSpreadsheet size={18}/> 협력업체 DB 관리</h3>
            <button onClick={() => setShowExcelModal(true)} className="text-xs bg-blue-50 text-[#00008F] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
              <PlusCircle size={12}/> 엑셀 등록
            </button>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
            현재 등록된 업체 수: <span className="font-bold text-black">{Object.keys(vendors).length}개</span>
            <br/>마지막 업데이트: {new Date().toLocaleDateString()}
          </div>
        </section>

        {/* 계약 생성 섹션 */}
        <section className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
          <h3 className="font-bold text-[#00008F] flex items-center gap-2 mb-6"><Search size={18}/> 계약 생성 및 조회</h3>
          
          <div className="flex gap-2 mb-6">
            <input value={searchNo} onChange={e => setSearchNo(e.target.value)} placeholder="사업자번호 (예: 1234567890)" className="flex-1 px-4 py-3 rounded-xl border bg-slate-50 outline-none font-bold"/>
            <button onClick={searchVendor} className="bg-[#00008F] text-white px-6 rounded-xl font-bold">조회</button>
          </div>

          {foundVendor && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="bg-[#F0F7FF] p-5 rounded-2xl border border-blue-100">
                <p className="text-lg font-black text-[#00008F]">{foundVendor.name}</p>
                <p className="text-sm text-slate-600 mb-2">{foundVendor.ceoName} | {foundVendor.phone}</p>
                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-blue-200">
                  <p>• 기존 계약: {foundVendor.lastContractPeriod}</p>
                  <p>• 기존 수가: {formatCurrency(foundVendor.lastContractAmount)}원</p>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">2026 계약 수가 (인상률 {rates[2026]}% 적용됨)</label>
                  <input value={contractForm.amount} onChange={e => setContractForm({...contractForm, amount: toCommaString(e.target.value)})} className="w-full p-3 text-right font-black text-lg border rounded-xl outline-none text-[#00008F]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">시작일</label>
                    <input type="date" value={contractForm.startDate} onChange={e => setContractForm({...contractForm, startDate: e.target.value})} className="w-full p-3 text-sm border rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">종료일</label>
                    <input type="date" value={contractForm.endDate} onChange={e => setContractForm({...contractForm, endDate: e.target.value})} className="w-full p-3 text-sm border rounded-xl" />
                  </div>
                </div>
                <button onClick={createContract} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold shadow-lg">계약서 생성하기</button>
              </div>
            </div>
          )}
        </section>

        {/* 계약 목록 */}
        <section className="space-y-4">
          <h3 className="font-bold text-slate-700 ml-2">진행 중인 계약</h3>
          {contracts.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{c.vendorName}</p>
                <p className="text-xs text-slate-500">{c.contractNo}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {c.status === 'COMPLETED' ? '체결 완료' : '서명 대기'}
                </span>
              </div>
              <button onClick={() => { setCurrentContract(c); setPage('contract-view'); }} className="p-2 bg-blue-50 text-[#00008F] rounded-lg">
                <ChevronDown size={20}/>
              </button>
            </div>
          ))}
        </section>
      </main>
      
      {/* --- Modals --- */}
      
      {/* 인상률 설정 모달 */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
             <h3 className="font-bold text-lg mb-4 text-[#00008F]">연도별 인상률 관리</h3>
             <div className="space-y-3">
               {Object.keys(rates).map(year => (
                 <div key={year} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                   <span className="font-bold text-slate-600">{year}년</span>
                   <div className="flex items-center gap-2">
                     <input type="number" step="0.1" value={rates[year]} onChange={(e) => handleRateChange(year, e.target.value)} className="w-16 p-1 text-right border rounded bg-white"/>
                     <span className="text-sm">%</span>
                   </div>
                 </div>
               ))}
             </div>
             <button onClick={() => setShowRateModal(false)} className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl font-bold">닫기</button>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 모달 */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center">
             <FileSpreadsheet size={48} className="mx-auto text-emerald-600 mb-4"/>
             <h3 className="font-bold text-lg mb-2">업체 정보 일괄 등록</h3>
             <p className="text-xs text-slate-500 mb-6">엑셀 파일(.xlsx)을 업로드하면<br/>협력업체 DB가 자동으로 갱신됩니다.</p>
             <label className="block w-full py-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 mb-4">
               <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload}/>
               <span className="text-sm font-bold text-slate-400">파일 선택 또는 드래그</span>
             </label>
             <button onClick={() => setShowExcelModal(false)} className="text-sm text-slate-400 underline">취소</button>
          </div>
        </div>
      )}
    </div>
  );

  // 3. 직원용 상세 화면 (QR/링크 생성)
  const renderContractView = () => (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white p-4 flex justify-between items-center shadow-sm">
        <h2 className="font-bold">계약 관리</h2>
        <button onClick={() => setPage('dashboard')}><X/></button>
      </div>
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md text-center">
          <p className="text-sm text-slate-500 mb-1">{currentContract?.contractNo}</p>
          <h3 className="text-2xl font-black text-[#00008F] mb-6">{currentContract?.vendorName}</h3>
          
          {currentContract?.status === 'PENDING' ? (
             !showQRSection ? (
               <button onClick={() => setShowQRSection(true)} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold flex items-center justify-center gap-2">
                 <QrCode/> 체결용 링크/QR 생성
               </button>
             ) : (
               <div className="space-y-6 animate-in zoom-in-95">
                 <div className="bg-white border-2 border-[#00008F] p-4 rounded-xl inline-block">
                   <QrCode size={150} />
                 </div>
                 <p className="text-xs text-slate-500">협력업체 담당자에게 QR코드를 보여주세요.</p>
                 <div className="flex gap-2">
                   <button onClick={() => alert('링크 복사됨')} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl flex justify-center gap-2"><Copy size={18}/> 링크 복사</button>
                   <button onClick={() => setPage('vendor-auth')} className="flex-1 py-3 bg-[#00008F] text-white font-bold rounded-xl flex justify-center gap-2"><PlayCircle size={18}/> (테스트) 진입</button>
                 </div>
               </div>
             )
          ) : (
             <div className="text-emerald-600 font-bold flex flex-col items-center gap-2">
               <CheckCircle2 size={48}/>
               <p>계약 체결 완료됨</p>
               <p className="text-xs text-slate-400 mt-4">발송된 PDF는 담당자 메일함에서 확인하세요.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );

  // 4. 협력업체 화면 (인증 -> 계약서 -> 도장 -> 완료)
  
  // 4-1. 업체 인증
  const renderVendorAuth = () => (
    <div className="min-h-screen bg-[#F0F7FF] p-6 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-8 rounded-[2rem] shadow-xl text-center space-y-6">
        <AxaLogo />
        <div>
          <h3 className="font-bold text-lg text-[#00008F]">전자계약 본인확인</h3>
          <p className="text-xs text-slate-500 mt-1">계약서 열람을 위해 정보를 입력해주세요.</p>
        </div>
        <form onSubmit={handleVendorAuth} className="space-y-3">
          <input placeholder="사업자번호 (숫자만)" value={vendorAuth.bizNo} onChange={e => setVendorAuth({...vendorAuth, bizNo: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl outline-none border focus:border-[#00008F]"/>
          <input placeholder="대표자 성명" value={vendorAuth.ceoName} onChange={e => setVendorAuth({...vendorAuth, ceoName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl outline-none border focus:border-[#00008F]"/>
          <button className="w-full py-4 bg-[#00008F] text-white font-bold rounded-xl mt-4">확인</button>
        </form>
      </div>
    </div>
  );

  // 4-2. 계약서 내용 (HTML)
  const renderVendorContract = () => (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white p-8 max-w-2xl mx-auto min-h-screen shadow-sm text-sm leading-7">
        <div className="border-b-2 border-black pb-6 mb-6 text-center">
          <h1 className="text-2xl font-serif font-bold">정비수가 표준 계약서</h1>
          <p className="text-slate-500 text-xs mt-2">No. {currentContract.contractNo}</p>
        </div>
        
        <div className="space-y-6 font-serif text-slate-800">
           <p><strong>AXA손해보험(주)</strong>(이하 "갑")과 <strong>{currentContract.vendorName}</strong>(이하 "을")은 상호 신뢰를 바탕으로 다음과 같이 계약을 체결한다.</p>
           
           <div className="bg-slate-50 p-4 border rounded-lg">
             <p className="font-bold text-[#00008F]">제 1 조 (계약 금액)</p>
             <p>2026년도 정비수가는 금 <span className="underline font-bold text-lg">{formatCurrency(currentContract.amount)}</span>원으로 한다.</p>
           </div>

           <div>
             <p className="font-bold mb-1">제 2 조 (계약 기간)</p>
             <p>{currentContract.periodStart} 부터 {currentContract.periodEnd} 까지로 한다.</p>
           </div>

           <div>
             <p className="font-bold mb-1">제 3 조 (성실의무)</p>
             <p>"을"은 "갑"의 피보험차량에 대하여 최선의 정비 서비스를 제공하며, "갑"은 이에 대한 정비수가를 지급한다.</p>
           </div>

           <div className="mt-8 text-center">
             <p>{new Date().toLocaleDateString()}</p>
             <div className="flex justify-around mt-8 text-left">
               <div>
                 <p className="text-xs text-slate-500">(갑)</p>
                 <p className="font-bold">AXA손해보험(주)</p>
                 <p>대표이사 (인)</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">(을)</p>
                 <p className="font-bold">{currentContract.vendorName}</p>
                 <p>대표 {currentContract.ceoName} (인)</p>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* 하단 고정바: 동의 체크 및 다음 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg flex flex-col gap-3">
        <label className="flex items-center gap-3 p-3 bg-[#F0F7FF] rounded-xl cursor-pointer">
          <input type="checkbox" className="w-5 h-5 accent-[#00008F]" checked={isLegalChecked} onChange={e => setIsLegalChecked(e.target.checked)}/>
          <span className="text-sm font-bold text-[#00008F]">위 계약 내용을 충분히 이해하였으며 동의합니다.</span>
        </label>
        <button 
          disabled={!isLegalChecked}
          onClick={() => { setIsContractRead(true); setPage('vendor-stamp'); }} 
          className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold disabled:bg-slate-300"
        >
          직인 날인 하러 가기
        </button>
      </div>
    </div>
  );

  // 4-3. 도장 업로드 및 최종 승인
  const renderVendorStamp = () => (
    <div className="min-h-screen bg-[#F0F7FF] p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-xl space-y-6">
        <h3 className="text-xl font-bold text-center text-[#00008F]">전자 직인 날인</h3>
        
        <div className="border-2 border-dashed border-blue-200 rounded-2xl h-48 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
          {stampImage ? (
             <img src={stampImage} className="w-32 h-32 object-contain" alt="stamp"/>
          ) : (
             <div className="text-center text-slate-400">
               <Upload className="mx-auto mb-2"/>
               <p className="text-xs">사업자 직인/명판 이미지를<br/>업로드해주세요.</p>
             </div>
          )}
          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
            const file = e.target.files[0];
            if(file) {
              const reader = new FileReader();
              reader.onloadend = () => setStampImage(reader.result);
              reader.readAsDataURL(file);
            }
          }}/>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl text-xs text-slate-600">
           <p className="font-bold text-[#00008F] mb-1">최종 확인 사항</p>
           <p>1. 체결 금액: {formatCurrency(currentContract.amount)}원</p>
           <p>2. 계약 기간: {currentContract.periodStart} ~ {currentContract.periodEnd}</p>
        </div>

        <button onClick={() => setShowFinalConfirmModal(true)} disabled={!stampImage} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold disabled:bg-slate-300">
          최종 체결 승인
        </button>
      </div>

      {/* 최종 승인 모달 */}
      {(showFinalConfirmModal || isProcessing) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          {!isProcessing ? (
             <div className="bg-white w-full max-w-sm p-8 rounded-[2rem] text-center space-y-6">
               <ShieldCheck size={48} className="mx-auto text-[#00008F]"/>
               <div>
                 <h3 className="font-bold text-lg">정말 체결하시겠습니까?</h3>
                 <p className="text-xs text-slate-500 mt-2">승인 시 계약서가 PDF로 변환되어<br/>담당 직원({userEmail})에게 발송됩니다.</p>
               </div>
               <div className="flex gap-3">
                 <button onClick={() => setShowFinalConfirmModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">취소</button>
                 <button onClick={handleFinalSubmit} className="flex-1 py-3 bg-[#00008F] text-white rounded-xl font-bold">승인</button>
               </div>
             </div>
          ) : (
             <div className="bg-white w-full max-w-sm p-10 rounded-[2rem] text-center space-y-8">
               <div className="animate-spin w-12 h-12 border-4 border-[#00008F] border-t-transparent rounded-full mx-auto"></div>
               <div className="space-y-2">
                  <p className="font-bold text-lg text-[#00008F]">
                    {processStep === 'pdf' ? '계약서 PDF 생성 중...' : '담당자 메일 발송 중...'}
                  </p>
                  <div className="flex justify-center gap-4 text-slate-300 mt-4">
                    <FileText className={processStep === 'pdf' ? 'text-black animate-pulse' : ''}/>
                    <span>→</span>
                    <Mail className={processStep === 'email' ? 'text-black animate-pulse' : ''}/>
                  </div>
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="min-h-screen bg-[#F8FBFF] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
        <CheckCircle2 size={40}/>
      </div>
      <h1 className="text-2xl font-black text-[#00008F] mb-2">계약 체결 완료</h1>
      <p className="text-slate-500 mb-8">모든 절차가 완료되었습니다.<br/>담당자 메일로 계약서가 발송되었습니다.</p>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm w-full max-w-sm mb-8 text-left text-xs space-y-3">
        <p className="flex justify-between"><span>수신자:</span> <span className="font-bold">{userEmail}</span></p>
        <p className="flex justify-between"><span>업체명:</span> <span className="font-bold">{currentContract?.vendorName}</span></p>
        <p className="flex justify-between"><span>처리일시:</span> <span>{new Date().toLocaleString()}</span></p>
      </div>

      <button onClick={() => { setPage('dashboard'); setIsVendorAuthenticated(false); setIsContractRead(false); setIsLegalChecked(false); setStampImage(null); }} className="px-10 py-4 bg-[#00008F] text-white rounded-xl font-bold">
        직원 홈으로 이동
      </button>
    </div>
  );

  // --- Router ---
  if(page === 'login') return renderLogin();
  if(page === 'dashboard') return renderDashboard();
  if(page === 'contract-view') return renderContractView();
  
  // Vendor Flow
  if(page === 'vendor-auth') {
    if(!isVendorAuthenticated) return renderVendorAuth();
    if(!isContractRead) return renderVendorContract(); // HTML View
    return renderVendorStamp(); // Stamp & Submit
  }
  
  if(page === 'success') return renderSuccess();
  
  return renderLogin();
}