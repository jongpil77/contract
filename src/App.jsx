import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Copy, QrCode, LogOut, CheckCircle2, Upload, History, Mail, 
  Settings, UserCheck, Trash2, ShieldCheck, Lock, X, Calendar, 
  FileText, Eye, PlayCircle, Hash, Clock, FileDown, ChevronDown, 
  AlertTriangle, ShieldAlert, Printer, Send
} from 'lucide-react';

/**
 * 정비수가 자동체결 시스템 - V2.0 (자동 기간 산출 & PDF/메일 시뮬레이션 탑재)
 */

// --- Constants & Test Data ---
const INITIAL_USERS = [
  { 
    id: 'u1', email: 'admin@axa.co.kr', password: 'admin', employeeId: 'admin', 
    name: '김관리', phone: '010-1234-5678', team: '보상부', role: 'ADMIN', 
    isActive: true, mustChangePassword: false 
  },
  { 
    id: 'u2', email: 'test@axa.co.kr', password: 'test', employeeId: 'test1234', 
    name: '테스터', phone: '010-9999-9999', team: '테스트팀', role: 'USER', 
    isActive: true, mustChangePassword: false 
  }
];

// DB: 전년도 계약일(lastContractDate) 필수
const VENDORS_DB = {
  '1234567890': {
    name: '(주)AXA 협력공장', ceoName: '이강인', phone: '01012345678',
    address: '서울특별시 중구 을지로 100 15층', 
    lastContractDate: '2024-03-15', // 작년 체결일
    lastContractAmount: 45000000
  },
  '9876543210': {
    name: '(주)글로벌네트웍스', ceoName: '손흥민', phone: '01098765432',
    address: '경기도 성남시 판교역로 231', 
    lastContractDate: '2023-11-20', // 재작년 체결일 (예시)
    lastContractAmount: 128000000
  }
};

// --- Helper Functions ---
const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount || 0);
const toCommaString = (val) => val.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fromCommaString = (val) => parseInt(val.replace(/,/g, '')) || 0;
const formatBizNo = (no) => no.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
const formatDate = (dateObj) => dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

// 계약 기간 자동 산출 로직
// 규칙: 시작일 = 작년 체결일 + 1년, 종료일 = 시작일이 속한 연도의 12월 31일
const calculateAutoPeriod = (lastDateStr) => {
  if (!lastDateStr) return { start: '', end: '' };
  
  const lastDate = new Date(lastDateStr);
  
  // 1. 시작일: 작년 체결일로부터 1년 뒤
  const startDate = new Date(lastDate);
  startDate.setFullYear(startDate.getFullYear() + 1);
  
  // 2. 종료일: 시작일이 속한 연도의 12월 31일
  const endDate = new Date(startDate.getFullYear(), 11, 31); // Month is 0-indexed (11 = Dec)
  
  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
};

const PW_POLICY_REGEX = /^(?=.*[a-z])(?=.*\d)[a-z\d]{8,}$/;

const AxaLogo = ({ size = "normal" }) => (
  <div className={`flex items-center gap-3 ${size === "large" ? 'mb-8' : ''}`}>
    <div className={`${size === "large" ? 'w-20 h-20' : 'w-11 h-11'} relative overflow-hidden flex items-center justify-center bg-white rounded-sm shadow-sm`}>
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/AXA_Logo.svg/512px-AXA_Logo.svg.png" alt="AXA" className="w-full h-full object-contain p-0.5" />
    </div>
    <div className="flex flex-col leading-none border-l border-blue-100 pl-3 text-left">
      <span className={`font-black tracking-tighter text-[#00008F] ${size === "large" ? 'text-2xl' : 'text-lg'}`}>정비수가 자동체결</span>
    </div>
  </div>
);

export default function App() {
  const [page, setPage] = useState('login'); 
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPwChangeModal, setShowPwChangeModal] = useState(false);
  const [today, setToday] = useState("");

  // Contract Logic States
  const [increaseRate] = useState(2.7);
  const [searchNo, setSearchNo] = useState('');
  const [foundVendor, setFoundVendor] = useState(null);
  const [autoPeriod, setAutoPeriod] = useState({ start: '', end: '' }); // 자동 산출 기간
  const [inputAmount, setInputAmount] = useState('');
  const [contracts, setContracts] = useState([]);
  
  // UI Flow States
  const [currentContract, setCurrentContract] = useState(null);
  const [showQRSection, setShowQRSection] = useState(false);
  const [showOverLimitConfirm, setShowOverLimitConfirm] = useState(false);
  
  // Vendor Side States
  const [vendorAuth, setVendorAuth] = useState({ name: '', bizNo: '' });
  const [isVendorAuthenticated, setIsVendorAuthenticated] = useState(false);
  const [isContractRead, setIsContractRead] = useState(false); // 계약서 내용 확인 여부
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);
  
  // PDF & Email Simulation States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(''); // 'pdf', 'email', 'done'

  useEffect(() => {
    setToday(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
  }, []);

  // --- Handlers ---
  const handleAmountInputChange = (e) => setInputAmount(toCommaString(e.target.value));

  const handleLogin = (e) => {
    e.preventDefault();
    const target = users.find(u => u.email === e.target.email.value && u.password === e.target.password.value);
    if (!target) return alert('로그인 정보가 올바르지 않습니다.');
    setCurrentUser(target);
    if (target.password === target.employeeId || target.mustChangePassword) setShowPwChangeModal(true);
    else setPage('dashboard');
  };

  const handleVendorSearch = () => {
    const v = VENDORS_DB[searchNo];
    if(v) {
      setFoundVendor(v);
      // 조회 성공 시 기간 자동 산출
      const period = calculateAutoPeriod(v.lastContractDate);
      setAutoPeriod(period);
    } else {
      alert('미등록 업체 (테스트용: 1234567890 또는 9876543210)');
      setFoundVendor(null);
      setAutoPeriod({ start: '', end: '' });
    }
  };

  const createContractAction = () => {
    const year = new Date().getFullYear();
    const newContract = {
      id: `CONT-${Date.now()}`,
      contractNo: `${year}-${currentUser.name}-${(contracts.length + 1).toString().padStart(3, '0')}`,
      vendorId: searchNo,
      amount: fromCommaString(inputAmount),
      periodStart: autoPeriod.start, // 자동 산출된 시작일
      periodEnd: autoPeriod.end,     // 자동 산출된 종료일
      status: 'PENDING',
      createdAt: new Date().toLocaleString(),
      vendorName: foundVendor.name,
      ceoName: foundVendor.ceoName,
      bizNo: searchNo,
      address: foundVendor.address,
      stampImage: null,
      vendorEmail: '',
    };
    setContracts([newContract, ...contracts]);
    alert('계약이 생성되었습니다.');
    setFoundVendor(null); 
    setInputAmount(''); 
    setShowOverLimitConfirm(false);
  };

  const handleApplyContract = () => {
    if (!inputAmount) return alert('금액을 입력해 주세요.');
    // 간단한 한도 체크 (예시: 전년 대비 10% 이상 상승 시 경고)
    const limitCheck = foundVendor.lastContractAmount * 1.1;
    if (fromCommaString(inputAmount) > limitCheck) setShowOverLimitConfirm(true);
    else createContractAction();
  };

  const handleVendorStampUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCurrentContract(prev => ({ ...prev, stampImage: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const copyLinkWithMsg = () => {
    navigator.clipboard.writeText(`[AXA손해보험] ${currentContract.vendorName}님, 2026년 정비수가 계약 체결을 위해 링크를 클릭해주세요.\nhttp://axa-connect.co.kr/sign/${currentContract.id}`);
    alert('메시지 링크가 복사되었습니다.');
  };

  const handleDeleteContract = (id) => {
    if(confirm('계약을 삭제하시겠습니까?')) setContracts(contracts.filter(c => c.id !== id));
  };

  // --- PDF & Mail Simulation ---
  const handleFinalProcess = () => {
    setShowFinalConfirmModal(false);
    setIsProcessing(true);

    // 1. PDF 생성 시뮬레이션
    setProcessStep('pdf');
    setTimeout(() => {
      // 2. 메일 발송 시뮬레이션
      setProcessStep('email');
      setTimeout(() => {
        // 3. 완료
        const updated = { ...currentContract, status: 'COMPLETED', completedAt: new Date().toLocaleString() };
        setContracts(contracts.map(c => c.id === updated.id ? updated : c));
        setPage('success');
        setIsProcessing(false);
        setProcessStep('');
      }, 2000); // 메일 전송 2초 소요
    }, 2000); // PDF 생성 2초 소요
  };

  // --- UI Renders ---
  
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F7FF] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-blue-50">
        <AxaLogo size="large" />
        <form onSubmit={handleLogin} className="space-y-4">
          <input name="email" type="email" required placeholder="회사 이메일" className="w-full px-6 py-4 rounded-2xl border border-blue-100 bg-blue-50/30 outline-none" />
          <input name="password" type="password" required placeholder="비밀번호" className="w-full px-6 py-4 rounded-2xl border border-blue-100 bg-blue-50/30 outline-none" />
          <button type="submit" className="w-full bg-[#00008F] text-white py-4 rounded-xl font-bold hover:bg-[#000066] transition-colors">로그인</button>
        </form>
        
        {/* 데모 정보 표시 */}
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-left border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 mb-2">DEMO ACCOUNT</p>
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span>ID: <span className="font-mono font-bold">admin@axa.co.kr</span></span>
            <span>PW: <span className="font-mono font-bold">admin</span></span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-[#F8FBFF] font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-50 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <AxaLogo />
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-[#00008F] bg-blue-50 px-4 py-2 rounded-2xl hidden sm:block">{today}</span>
          <div className="text-right"><p className="text-xs font-black text-[#00008F]">{currentUser?.name} 님</p></div>
          <button onClick={() => setPage('login')} className="p-2 text-blue-200 hover:text-[#00008F]"><LogOut size={22} /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* 계약 생성 섹션 */}
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-blue-50 p-6 lg:p-10">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-[#00008F]"><Search /> 협력업체 조회 및 계약 생성</h3>
            <div className="flex gap-3 mb-10">
              <input type="text" value={searchNo} onChange={e => setSearchNo(e.target.value)} placeholder="사업자번호 10자리" className="flex-1 px-8 py-5 rounded-2xl border-2 border-blue-50 outline-none text-xl font-bold placeholder:font-normal" />
              <button onClick={handleVendorSearch} className="bg-[#00008F] text-white px-8 lg:px-12 rounded-2xl font-black hover:bg-[#000066] transition-colors">조회</button>
            </div>
            
            {foundVendor && (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 업체 정보 */}
                  <div className="p-8 bg-[#F0F7FF]/50 rounded-3xl border border-blue-50">
                    <p className="text-xl font-black text-[#00008F] mb-2">{foundVendor.name}</p>
                    <p className="text-sm text-slate-500 mb-1">{formatBizNo(searchNo)} | {foundVendor.ceoName}</p>
                    <p className="text-sm text-slate-500">{foundVendor.address}</p>
                    <div className="mt-4 pt-4 border-t border-blue-100">
                      <p className="text-xs text-slate-400">전년도 체결정보</p>
                      <p className="font-bold text-slate-600">{foundVendor.lastContractDate} / {formatCurrency(foundVendor.lastContractAmount)}원</p>
                    </div>
                  </div>

                  {/* 자동 산출 정보 */}
                  <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-center">
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><Calendar size={12}/> 계약 기간 (자동산출)</p>
                      <p className="text-lg font-black text-slate-700">{autoPeriod.start} ~ {autoPeriod.end}</p>
                      <p className="text-[10px] text-blue-400 mt-1">* 작년 체결일 + 1년 기준</p>
                    </div>
                  </div>
                </div>

                {/* 금액 입력 및 생성 */}
                <div className="bg-[#00008F] text-white p-6 lg:p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <p className="text-blue-200 mb-1 text-sm">2026년 계약 체결 금액</p>
                    <div className="flex items-end gap-2">
                       <input type="text" value={inputAmount} onChange={handleAmountInputChange} placeholder="금액 입력" className="bg-transparent border-b-2 border-white/30 text-3xl font-black placeholder:text-white/20 outline-none w-48 text-right" />
                       <span className="text-xl font-bold">원</span>
                    </div>
                  </div>
                  <button onClick={handleApplyContract} className="w-full md:w-auto px-10 py-4 bg-white text-[#00008F] rounded-xl font-black hover:bg-blue-50 transition-colors shadow-lg">계약 생성</button>
                </div>
              </div>
            )}
          </section>

          {/* 목록 섹션 */}
          <section className="bg-white rounded-[2.5rem] border border-blue-50 p-6 lg:p-10 shadow-sm">
            <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-[#00008F]"><History /> 진행 중인 계약</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="text-[10px] text-blue-200 uppercase border-b border-blue-50">
                  <tr><th className="pb-4 pl-4">업체명</th><th className="pb-4">계약기간</th><th className="pb-4 text-right">금액</th><th className="pb-4 text-center">상태</th><th className="pb-4 text-right pr-4">관리</th></tr>
                </thead>
                <tbody className="divide-y divide-blue-50/50">
                  {contracts.map(c => (
                    <tr key={c.id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="py-5 pl-4 font-bold text-slate-700">{c.vendorName}</td>
                      <td className="py-5 text-sm text-slate-500">{c.periodStart} ~ {c.periodEnd}</td>
                      <td className="py-5 text-right font-black text-[#00008F]">{formatCurrency(c.amount)}원</td>
                      <td className="py-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{c.status === 'COMPLETED' ? '체결완료' : '서명대기'}</span></td>
                      <td className="py-5 text-right pr-4 flex justify-end gap-2">
                        <button onClick={() => { setCurrentContract(c); setPage('contract-view'); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Eye size={16}/></button>
                        {c.status !== 'COMPLETED' && <button onClick={() => handleDeleteContract(c.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>}
                      </td>
                    </tr>
                  ))}
                  {contracts.length === 0 && (
                    <tr><td colSpan="5" className="py-10 text-center text-slate-400">생성된 계약이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* 사이드바 (정보) */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
             <h4 className="font-bold text-[#00008F] mb-4">공지사항</h4>
             <ul className="text-xs space-y-2 text-slate-600">
               <li>• 2026년도 수가 인상 가이드라인 준수</li>
               <li>• 계약 기간 자동 산출 로직 적용됨</li>
               <li>• 서명 완료 시 PDF 자동 발송됨</li>
             </ul>
           </div>
        </div>
      </main>

      {/* 한도 초과 모달 */}
      {showOverLimitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2.5rem] text-center max-w-sm w-full space-y-6 animate-in zoom-in-95">
            <AlertTriangle size={48} className="mx-auto text-amber-500" />
            <div>
              <p className="font-black text-lg">한도 주의</p>
              <p className="text-sm text-slate-500 mt-2">입력하신 금액이 전년 대비<br/>예상 범위를 초과합니다.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowOverLimitConfirm(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">취소</button>
              <button onClick={createContractAction} className="flex-1 py-3 bg-[#00008F] text-white rounded-xl font-bold">진행 승인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 직원용 상세 뷰 (QR/링크 생성)
  const renderContractView = () => {
    const c = currentContract;
    if (!c) return null;
    return (
      <div className="min-h-screen bg-slate-100 p-4 lg:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* 헤더 */}
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="font-black text-xl text-[#00008F]">계약 발송 관리</h2>
              <p className="text-xs text-slate-500">{c.contractNo}</p>
            </div>
            <button onClick={() => setPage('dashboard')} className="p-2 hover:bg-slate-200 rounded-full"><X/></button>
          </div>

          {/* 본문 미리보기 (축약) */}
          <div className="p-10 flex-1 overflow-y-auto bg-slate-50/50">
            <div className="bg-white border p-8 shadow-sm max-w-xl mx-auto text-[10px] text-slate-400 select-none">
              <p className="text-center text-lg font-bold text-black mb-6">자동차 정비수가 계약서 (미리보기)</p>
              <p>본 계약은 AXA손해보험(이하 "갑")과 {c.vendorName}(이하 "을") 간의...</p>
              <div className="my-4 p-4 border rounded bg-slate-50">
                 <p>계약기간: {c.periodStart} ~ {c.periodEnd}</p>
                 <p>계약금액: {formatCurrency(c.amount)}원</p>
              </div>
              <p className="text-center mt-10">[ 상세 내용은 협력업체 화면에서 표시됩니다 ]</p>
            </div>
          </div>

          {/* 하단 액션바 */}
          <div className="p-6 bg-white border-t">
            {c.status === 'PENDING' ? (
              !showQRSection ? (
                <button onClick={() => setShowQRSection(true)} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold text-lg hover:bg-[#000066] transition-colors flex items-center justify-center gap-2">
                  <QrCode size={20}/> 체결 링크 및 QR 생성
                </button>
              ) : (
                <div className="bg-[#00008F] p-6 rounded-2xl text-white flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    <QrCode size={100} className="text-black" />
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <p className="font-bold text-lg">발송 준비 완료</p>
                    <p className="text-xs text-blue-200">협력업체 담당자에게 QR코드를 보여주거나<br/>링크를 메시지로 전송하세요.</p>
                    <div className="flex gap-2">
                      <button onClick={copyLinkWithMsg} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2"><Copy size={16}/> 링크 복사</button>
                      <button onClick={() => setPage('vendor-simulator')} className="flex-1 py-3 bg-white text-[#00008F] hover:bg-blue-50 rounded-xl font-bold flex items-center justify-center gap-2">
                        <PlayCircle size={16}/> (TEST) 협력업체 화면
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
               <div className="text-center py-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold border border-emerald-100">
                 <CheckCircle2 className="inline mr-2"/> 이미 체결이 완료된 계약입니다.
               </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 협력업체 시뮬레이터
  const renderVendorSimulator = () => {
    const c = currentContract;
    
    // 1. 본인인증 단계
    if (!isVendorAuthenticated) {
      return (
        <div className="min-h-screen bg-[#F0F7FF] p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <AxaLogo />
            <div className="text-center">
              <h3 className="text-xl font-black text-[#00008F]">전자계약 본인인증</h3>
              <p className="text-xs text-slate-500 mt-2">계약 체결을 위해 사업자 정보를 입력해주세요.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setIsVendorAuthenticated(true); }} className="space-y-4">
              <input required placeholder="대표자 성함" className="w-full px-6 py-4 rounded-2xl border border-blue-100 bg-slate-50 outline-none focus:border-[#00008F]" />
              <input required placeholder="사업자번호 (10자리)" className="w-full px-6 py-4 rounded-2xl border border-blue-100 bg-slate-50 outline-none focus:border-[#00008F]" />
              <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-2xl font-black shadow-lg shadow-blue-900/20">인증하기</button>
            </form>
          </div>
        </div>
      );
    }

    // 2. 계약서 상세 열람 (HTML View)
    if (!isContractRead) {
      return (
        <div className="min-h-screen bg-slate-100 p-4 pb-24">
           <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-none min-h-[141.4%] p-8 md:p-16 text-sm leading-relaxed text-slate-800">
             {/* 문서 헤더 */}
             <div className="text-center border-b-2 border-black pb-8 mb-8">
               <h1 className="text-3xl font-serif font-bold mb-2">자동차 정비수가 계약서</h1>
               <p className="text-slate-500">Contract No. {c.contractNo}</p>
             </div>

             {/* 문서 본문 */}
             <div className="space-y-6 font-serif">
               <p><strong>AXA손해보험 주식회사</strong>(이하 "갑"이라 한다)와 <strong>{c.vendorName}</strong>(이하 "을"이라 한다)는 다음과 같이 자동차 정비수가 계약을 체결한다.</p>
               
               <div>
                 <h4 className="font-bold mb-1">제1조 (목적)</h4>
                 <p>본 계약은 "갑"의 피보험차량 수리를 "을"에게 위탁함에 있어 필요한 제반 사항을 규정함을 목적으로 한다.</p>
               </div>

               <div>
                 <h4 className="font-bold mb-1">제2조 (계약 기간)</h4>
                 <p>본 계약의 기간은 다음과 같이 정한다.</p>
                 <div className="bg-slate-100 p-4 mt-2 border border-slate-200 text-center font-bold">
                   {c.periodStart} 부터 {c.periodEnd} 까지
                 </div>
               </div>

               <div>
                 <h4 className="font-bold mb-1">제3조 (정비수가)</h4>
                 <p>계약 기간 동안 적용할 시간당 공임 및 정비수가는 아래와 같다.</p>
                 <div className="bg-slate-100 p-4 mt-2 border border-slate-200 text-center">
                   <span className="text-xs text-slate-500 block mb-1">총 계약 금액</span>
                   <span className="text-xl font-bold border-b border-black">{formatCurrency(c.amount)} 원</span> (VAT 별도)
                 </div>
               </div>

               <div>
                 <h4 className="font-bold mb-1">제4조 (성실 의무)</h4>
                 <p>"을"은 "갑"의 요청에 따라 차량 수리를 성실히 수행하여야 하며, 수리 품질에 대해 책임을 진다.</p>
               </div>
               
               <p className="mt-8">위 계약 체결을 증명하기 위하여 본 계약서를 2통 작성하여 서명 날인 후, 전자문서 형태로 보관한다.</p>
               <p className="text-center mt-8">{new Date().toLocaleDateString('ko-KR')}</p>

               <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
                 <div>
                   <p className="font-bold mb-8">(갑)</p>
                   <p>주소: 서울특별시 용산구 한강대로</p>
                   <p>상호: AXA손해보험(주)</p>
                   <p>대표이사: 기욤 미라보 (인)</p>
                 </div>
                 <div>
                   <p className="font-bold mb-8">(을)</p>
                   <p>주소: {c.address}</p>
                   <p>상호: {c.vendorName}</p>
                   <p>대표자: {c.ceoName} (인)</p>
                 </div>
               </div>
             </div>
           </div>

           {/* 하단 고정 버튼 */}
           <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
             <div className="max-w-2xl mx-auto flex items-center justify-between">
               <label className="flex items-center gap-2 cursor-pointer select-none">
                 <input type="checkbox" className="w-5 h-5 accent-[#00008F]" />
                 <span className="text-sm font-bold">계약 내용을 모두 확인했습니다.</span>
               </label>
               <button onClick={() => setIsContractRead(true)} className="px-8 py-3 bg-[#00008F] text-white rounded-xl font-bold hover:bg-[#000066]">다음 단계</button>
             </div>
           </div>
        </div>
      );
    }

    // 3. 도장 날인 및 체결 단계
    return (
      <div className="min-h-screen bg-[#F0F7FF] p-4 flex flex-col items-center">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-right-8">
          <div className="text-center">
             <h3 className="text-xl font-black text-[#00008F]">최종 서명</h3>
             <p className="text-xs text-slate-500 mt-2">직인 또는 서명 이미지를 등록해주세요.</p>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 rounded-2xl text-center">
              <p className="text-sm text-blue-400">최종 체결 금액</p>
              <p className="text-2xl font-black text-[#00008F]">{formatCurrency(c.amount)}원</p>
            </div>
            
            <div className="border-4 border-dashed border-blue-100 rounded-3xl p-10 text-center relative hover:border-blue-300 transition-colors bg-white">
              {c.stampImage ? (
                <div className="relative">
                   <img src={c.stampImage} className="w-32 h-32 mx-auto object-contain" alt="stamp" />
                   <div className="absolute -bottom-6 left-0 right-0 text-xs text-emerald-500 font-bold flex justify-center items-center gap-1">
                     <CheckCircle2 size={12}/> 등록 완료
                   </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto text-blue-200" size={48} />
                  <p className="text-sm font-bold text-blue-300">터치하여 이미지 업로드</p>
                </div>
              )}
              <input type="file" onChange={handleVendorStampUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs font-bold mb-2">계약서 수신 이메일</p>
              <input type="email" placeholder="example@company.com" className="w-full px-6 py-4 rounded-2xl border bg-slate-50 outline-none" onChange={(e) => setCurrentContract({...c, vendorEmail: e.target.value})} />
            </div>
            
            <button onClick={() => setShowFinalConfirmModal(true)} disabled={!c.stampImage} className="w-full py-4 bg-[#00008F] text-white rounded-2xl font-black disabled:bg-slate-300 shadow-lg shadow-blue-900/10">계약 체결 승인</button>
          </div>
        </div>

        {/* 프로세스 모달 (PDF 생성 -> 메일 발송 시뮬레이션) */}
        {(showFinalConfirmModal || isProcessing) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            {!isProcessing ? (
              <div className="bg-white p-10 rounded-[2.5rem] text-center space-y-6 w-full max-w-sm animate-in zoom-in-95">
                <ShieldAlert size={48} className="mx-auto text-[#00008F]" />
                <div>
                  <p className="font-bold text-lg">최종 서명하시겠습니까?</p>
                  <p className="text-xs text-slate-500 mt-2">서명 후에는 수정이 불가능하며,<br/>PDF 계약서가 자동 발송됩니다.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowFinalConfirmModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">취소</button>
                  <button onClick={handleFinalProcess} className="flex-1 py-3 bg-[#00008F] text-white rounded-xl font-bold">체결</button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2.5rem] text-center space-y-8 w-full max-w-sm shadow-2xl">
                <div className="relative w-20 h-20 mx-auto">
                   <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-[#00008F] rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="space-y-2">
                   <p className="text-xl font-black text-[#00008F]">
                     {processStep === 'pdf' && 'PDF 문서 생성 중...'}
                     {processStep === 'email' && '외부 메일 서버 전송 중...'}
                   </p>
                   <p className="text-xs text-slate-400">
                     {processStep === 'pdf' && '계약 내용을 PDF 파일로 변환하고 있습니다.'}
                     {processStep === 'email' && '수신자: ' + (currentContract.vendorEmail || '미지정')}
                   </p>
                </div>
                <div className="flex justify-center gap-4 text-slate-300">
                  <Printer size={24} className={processStep === 'pdf' ? 'text-[#00008F] animate-pulse' : ''} />
                  <div className="w-8 border-t-2 border-dashed border-slate-200 self-center"></div>
                  <Mail size={24} className={processStep === 'email' ? 'text-[#00008F] animate-pulse' : ''} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FBFF] p-4">
      <div className="text-center space-y-8 bg-white p-12 rounded-[3rem] shadow-xl border border-blue-50 max-w-lg w-full animate-in zoom-in-95">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#00008F] mb-2">계약 체결 완료</h1>
          <p className="text-slate-500">모든 서명 절차가 성공적으로 완료되었습니다.<br/>계약서 PDF가 이메일로 발송되었습니다.</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl text-xs text-left space-y-2 text-slate-600">
           <p className="flex justify-between"><span>문서번호:</span> <span className="font-bold">{currentContract?.contractNo}</span></p>
           <p className="flex justify-between"><span>체결일시:</span> <span className="font-bold">{new Date().toLocaleString()}</span></p>
           <p className="flex justify-between"><span>발송상태:</span> <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={10}/> 전송됨</span></p>
        </div>
        <button onClick={() => { setPage('dashboard'); setIsContractRead(false); setIsVendorAuthenticated(false); setFoundVendor(null); setInputAmount(''); }} className="w-full px-10 py-4 bg-[#00008F] text-white rounded-2xl font-black hover:bg-[#000066] transition-colors">홈으로 이동</button>
      </div>
    </div>
  );

  switch(page) {
    case 'dashboard': return renderDashboard();
    case 'contract-view': return renderContractView(); // 직원용 상세
    case 'vendor-simulator': return renderVendorSimulator(); // 협력업체용 화면
    case 'success': return renderSuccess();
    default: return renderLogin();
  }
}