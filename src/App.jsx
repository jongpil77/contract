import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Copy, QrCode, LogOut, CheckCircle2, Upload, History, Mail, 
  Settings, UserCheck, Trash2, ShieldCheck, Lock, X, Calendar, 
  FileText, Eye, PlayCircle, Hash, Clock, FileDown, ChevronDown, 
  AlertTriangle, ShieldAlert
} from 'lucide-react';

/**
 * 정비수가 자동체결 시스템 - 데모 계정 추가 버전
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

const VENDORS_DB = {
  '1234567890': {
    name: '(주)AXA 협력공장', ceoName: '이강인', phone: '01012345678',
    address: '서울특별시 중구 을지로 100 15층', lastContractDate: '2024-03-15', lastContractAmount: 45000000
  },
  '9876543210': {
    name: '(주)글로벌네트웍스', ceoName: '손흥민', phone: '01098765432',
    address: '경기도 성남시 판교역로 231', lastContractDate: '2023-11-20', lastContractAmount: 128000000
  }
};

// --- Helper Functions ---
const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount || 0);
const toCommaString = (val) => val.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fromCommaString = (val) => parseInt(val.replace(/,/g, '')) || 0;
const formatBizNo = (no) => no.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');

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

  const [increaseRate] = useState(2.7);
  const [searchNo, setSearchNo] = useState('');
  const [foundVendor, setFoundVendor] = useState(null);
  const [inputAmount, setInputAmount] = useState('');
  const [currentContract, setCurrentContract] = useState(null);
  const [showQRSection, setShowQRSection] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOverLimitConfirm, setShowOverLimitConfirm] = useState(false);
  
  const [vendorAuth, setVendorAuth] = useState({ name: '', bizNo: '' });
  const [isVendorAuthenticated, setIsVendorAuthenticated] = useState(false);
  const [showFullContract, setShowFullContract] = useState(false);
  const [isLegalChecked, setIsLegalChecked] = useState(false);
  const [contracts, setContracts] = useState([]);

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

  const handleSignup = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get('email');
    if (users.some(u => u.email === email)) return alert('이미 가입된 이메일입니다.');
    setUsers([...users, {
      id: `u${Date.now()}`, email, password: fd.get('empId'), employeeId: fd.get('empId'),
      name: fd.get('name'), team: fd.get('team'), phone: fd.get('phone'),
      role: 'USER', isActive: true, mustChangePassword: true
    }]);
    alert('회원가입 완료! 초기 비밀번호는 사번입니다.');
    setPage('login');
  };

  const handlePwChange = (e) => {
    e.preventDefault();
    const newPw = e.target.newPw.value;
    if (newPw !== e.target.confirmPw.value) return alert('비밀번호가 일치하지 않습니다.');
    if (!PW_POLICY_REGEX.test(newPw)) return alert('소문자+숫자 포함 8자 이상이어야 합니다.');
    setUsers(users.map(u => u.id === currentUser.id ? { ...u, password: newPw, mustChangePassword: false } : u));
    setShowPwChangeModal(false);
    setPage('dashboard');
  };

  const calculationDetails = useMemo(() => {
    if (!foundVendor) return null;
    return { limitAmount: Math.floor((foundVendor.lastContractAmount * (1 + increaseRate / 100)) / 10) * 10 };
  }, [foundVendor, increaseRate]);

  const createContractAction = () => {
    const year = new Date().getFullYear();
    const newContract = {
      id: `CONT-${Date.now()}`,
      contractNo: `${year}-${currentUser.name}-${(contracts.length + 1).toString().padStart(3, '0')}`,
      vendorId: searchNo,
      amount: fromCommaString(inputAmount),
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
    setFoundVendor(null); setInputAmount(''); setShowOverLimitConfirm(false);
  };

  const handleApplyContract = () => {
    if (!inputAmount) return alert('금액을 입력해 주세요.');
    if (fromCommaString(inputAmount) > calculationDetails.limitAmount) setShowOverLimitConfirm(true);
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
    navigator.clipboard.writeText(`[AXA손해보험] ${currentContract.vendorName}님, 정비수가 계약 체결을 위해 링크를 클릭해주세요. http://axa-connect.co.kr/sign/${currentContract.id}`);
    alert('메시지 링크가 복사되었습니다.');
  };

  const handleDeleteContract = (id) => {
    if(confirm('계약을 삭제하시겠습니까?')) setContracts(contracts.filter(c => c.id !== id));
  };

  const handleFinalSign = () => {
    const updated = { ...currentContract, status: 'COMPLETED', completedAt: new Date().toLocaleString() };
    setContracts(contracts.map(c => c.id === updated.id ? updated : c));
    setPage('success');
    setShowConfirmModal(false);
  };

  // --- UI Renders ---
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F7FF] p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-blue-50">
        <AxaLogo size="large" />
        <form onSubmit={handleLogin} className="space-y-4">
          <input name="email" type="email" required placeholder="회사 이메일" className="w-full px-6 py-4 rounded-2xl border border-blue-100 bg-blue-50/30 outline-none" />
          <input name="password" type="password" required placeholder="비밀번호" className="w-full px-6 py-4 rounded-2xl border border-blue-100 bg-blue-50/30 outline-none" />
          <button type="submit" className="w-full bg-[#00008F] text-white py-4 rounded-xl font-bold hover:bg-[#000066]">로그인</button>
        </form>
        <button onClick={() => setPage('signup')} className="mt-8 text-sm font-bold text-blue-500 flex items-center justify-center gap-2 mx-auto">신규 회원 가입</button>
        
        {/* 데모 정보 표시 (테스트용) */}
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-left">
          <p className="text-[10px] font-bold text-slate-400 mb-2">데모 계정 정보</p>
          <p className="text-xs text-slate-600">ID: <span className="font-mono">test@axa.co.kr</span></p>
          <p className="text-xs text-slate-600">PW: <span className="font-mono">test</span></p>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-[#F8FBFF]">
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-50 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <AxaLogo />
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-[#00008F] bg-blue-50 px-4 py-2 rounded-2xl">{today}</span>
          <div className="text-right"><p className="text-xs font-black text-[#00008F]">{currentUser?.name}</p></div>
          <button onClick={() => setPage('login')} className="p-2 text-blue-200 hover:text-[#00008F]"><LogOut size={22} /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-blue-50 p-10">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-[#00008F]"><Search /> 협력업체 조회</h3>
            <div className="flex gap-3 mb-10">
              <input type="text" value={searchNo} onChange={e => setSearchNo(e.target.value)} placeholder="사업자번호 10자리" className="flex-1 px-8 py-5 rounded-2xl border-2 border-blue-50 outline-none text-xl font-bold" />
              <button onClick={() => { const v = VENDORS_DB[searchNo]; if(v) setFoundVendor(v); else alert('미등록 업체 (테스트용: 1234567890 또는 9876543210)'); }} className="bg-[#00008F] text-white px-12 rounded-2xl font-black">조회</button>
            </div>
            {foundVendor && (
              <div className="animate-in fade-in space-y-6">
                <div className="p-8 bg-[#F0F7FF]/50 rounded-3xl border border-blue-50">
                  <p className="text-xl font-black text-[#00008F]">{foundVendor.name}</p>
                  <p className="text-sm text-slate-500">{foundVendor.address}</p>
                  <p className="text-lg font-black text-[#00008F] mt-4">최근 계약: {formatCurrency(foundVendor.lastContractAmount)}원</p>
                </div>
                <div className="bg-[#00008F] text-white p-10 rounded-[2.5rem] flex justify-between items-center">
                  <div>
                    <p className="text-blue-100 mb-1">2026 체결 한도</p>
                    <p className="text-3xl font-black">{formatCurrency(calculationDetails.limitAmount)}원</p>
                  </div>
                  <div className="space-y-3">
                    <input type="text" value={inputAmount} onChange={handleAmountInputChange} placeholder="체결 금액" className="px-5 py-3 rounded-xl text-black text-right font-bold" />
                    <button onClick={handleApplyContract} className="w-full bg-white text-[#00008F] py-3 rounded-xl font-black">적용</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-[2.5rem] border border-blue-50 p-10 shadow-sm">
            <h3 className="text-xl font-black flex items-center gap-3 mb-8 text-[#00008F]"><History /> 체결 현황</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] text-blue-200 uppercase border-b border-blue-50">
                  <tr><th className="pb-4">고유번호</th><th className="pb-4">업체명</th><th className="pb-4 text-right">금액</th><th className="pb-4 text-center">상태</th><th className="pb-4 text-right">관리</th></tr>
                </thead>
                <tbody className="divide-y divide-blue-50/50">
                  {contracts.map(c => (
                    <tr key={c.id} className="group hover:bg-blue-50/30">
                      <td className="py-5 font-bold text-[#00008F]">{c.contractNo}</td>
                      <td className="py-5">{c.vendorName}</td>
                      <td className="py-5 text-right font-black">{formatCurrency(c.amount)}원</td>
                      <td className="py-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${c.status === 'COMPLETED' ? 'bg-blue-100 text-[#00008F]' : 'bg-slate-100 text-slate-400'}`}>{c.status === 'COMPLETED' ? '체결완료' : '진행중'}</span></td>
                      <td className="py-5 text-right flex justify-end gap-2">
                        <button onClick={() => { setCurrentContract(c); setPage('contract-view'); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Eye size={16}/></button>
                        {c.status !== 'COMPLETED' && <button onClick={() => handleDeleteContract(c.id)} className="p-2 text-rose-500"><Trash2 size={16}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {showOverLimitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] text-center max-w-sm space-y-6">
            <AlertTriangle size={48} className="mx-auto text-rose-500" />
            <p className="font-bold">한도를 초과했습니다. 진행하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowOverLimitConfirm(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">취소</button>
              <button onClick={createContractAction} className="flex-1 py-3 bg-[#00008F] text-white rounded-xl">진행</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContractView = () => {
    const c = currentContract;
    if (!c) return null;
    return (
      <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl bg-white shadow-2xl p-16 rounded-sm space-y-10">
          <h1 className="text-3xl font-black text-center underline">자 동 차 정 비 수 가 체 결 계 약 서</h1>
          <div className="space-y-6">
            <p><strong>수탁업체:</strong> {c.vendorName}</p>
            <p><strong>체결금액:</strong> {formatCurrency(c.amount)}원</p>
            <div className="grid grid-cols-2 gap-10 mt-20">
              <div><p className="text-[10px] text-slate-400">발주처 (갑)</p><p className="font-bold">AXA손해보험 (인)</p></div>
              <div className="border-2 border-dashed p-4 rounded-xl relative">
                <p className="text-[10px] text-slate-400">수탁업체 (을)</p><p className="font-bold">{c.ceoName}</p>
                {c.stampImage && <img src={c.stampImage} className="absolute right-2 top-2 w-16 h-16 object-contain mix-blend-multiply" alt="stamp" />}
              </div>
            </div>
          </div>
          {showQRSection && (
            <div className="bg-[#00008F] p-8 rounded-3xl text-white flex items-center gap-6">
              <div className="bg-white p-2 rounded-xl"><QrCode size={100} className="text-black" /></div>
              <div className="flex-1 space-y-3">
                <button onClick={copyLinkWithMsg} className="w-full py-3 bg-blue-600 rounded-xl font-bold flex items-center justify-center gap-2"><Copy size={16}/> 링크 복사</button>
                <button onClick={() => setPage('vendor-simulator')} className="w-full py-3 bg-white/10 rounded-xl font-bold">서명 테스트 이동</button>
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <button onClick={() => setPage('dashboard')} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold">닫기</button>
            {c.status === 'PENDING' && !showQRSection && <button onClick={() => setShowQRSection(true)} className="flex-1 py-4 bg-[#00008F] text-white rounded-xl font-bold">체결 링크 생성</button>}
          </div>
        </div>
      </div>
    );
  };

  const renderVendorSimulator = () => {
    const c = currentContract;
    return (
      <div className="min-h-screen bg-[#F0F7FF] p-4 flex flex-col items-center">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8">
          <AxaLogo />
          <h3 className="text-xl font-black text-[#00008F]">협력업체 본인인증</h3>
          {!isVendorAuthenticated ? (
            <form onSubmit={(e) => { e.preventDefault(); setIsVendorAuthenticated(true); }} className="space-y-4">
              <input required placeholder="대표자 성함" className="w-full px-6 py-4 rounded-2xl border bg-slate-50" />
              <input required placeholder="사업자번호" className="w-full px-6 py-4 rounded-2xl border bg-slate-50" />
              <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-2xl font-black">인증하기</button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-2xl text-center">
                <p className="text-sm">체결 금액</p>
                <p className="text-2xl font-black text-[#00008F]">{formatCurrency(c.amount)}원</p>
              </div>
              <div className="border-4 border-dashed rounded-3xl p-10 text-center relative">
                {c.stampImage ? <img src={c.stampImage} className="w-32 h-32 mx-auto object-contain" alt="stamp" /> : <Upload className="mx-auto text-blue-200" size={48} />}
                <input type="file" onChange={handleVendorStampUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <p className="mt-4 text-xs font-bold text-blue-400">명판/도장 업로드</p>
              </div>
              <input type="email" placeholder="이메일 주소" className="w-full px-6 py-4 rounded-2xl border" onChange={(e) => setCurrentContract({...c, vendorEmail: e.target.value})} />
              <label className="flex gap-2 items-center text-xs cursor-pointer">
                <input type="checkbox" onChange={(e) => setIsLegalChecked(e.target.checked)} /> 위 내용을 확인했습니다.
              </label>
              <button onClick={() => setShowConfirmModal(true)} disabled={!c.stampImage || !isLegalChecked} className="w-full py-4 bg-[#00008F] text-white rounded-2xl font-black disabled:bg-slate-300">최종 체결</button>
            </div>
          )}
        </div>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-white p-10 rounded-[2.5rem] text-center space-y-6">
              <ShieldAlert size={48} className="mx-auto text-rose-500" />
              <p className="font-bold">계약을 최종 체결하시겠습니까?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">취소</button>
                <button onClick={handleFinalSign} className="flex-1 py-3 bg-[#00008F] text-white rounded-xl">체결 완료</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FBFF]">
      <div className="text-center space-y-6">
        <CheckCircle2 size={80} className="text-emerald-500 mx-auto" />
        <h1 className="text-4xl font-black text-[#00008F]">계약 체결 완료</h1>
        <button onClick={() => setPage('dashboard')} className="px-10 py-4 bg-[#00008F] text-white rounded-2xl font-black">홈으로 이동</button>
      </div>
    </div>
  );

  switch(page) {
    case 'dashboard': return renderDashboard();
    case 'signup': return renderSignup();
    case 'contract-view': return renderContractView();
    case 'vendor-simulator': return renderVendorSimulator();
    case 'success': return renderSuccess();
    default: return renderLogin();
  }
}