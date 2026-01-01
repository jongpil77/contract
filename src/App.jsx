import React, { useState, useEffect } from 'react';
import { 
  Search, Copy, QrCode, LogOut, CheckCircle2, Upload, History, Mail, 
  Settings, FileSpreadsheet, PlusCircle, Trash2, ShieldCheck, X, 
  Calendar, FileText, PlayCircle, ChevronDown, ShieldAlert, Printer, 
  MapPin, Building2, User, UserPlus, Lock, LayoutDashboard
} from 'lucide-react';

/**
 * 정비수가 모바일 계약 체결 시스템 - V6.0
 * - 서버 주소 반영
 * - 부서명 콤보박스
 * - 계약번호 커스텀 생성 (연도-부서-이름-번호)
 */

// =================================================================
// [반영 완료] Railway 서버 주소
const SERVER_URL = "https://contract-axa.up.railway.app"; 
// =================================================================

// 부서 목록 상수
const TEAM_LIST = [
  "서울보상부", "경인보상부", "중부보상부", "남부보상부", "스마트보상부", "특수보상부"
];

// 초기 데이터
const INITIAL_RATES = {
  2018: 2.1, 2019: 2.4, 2020: 2.0, 2021: 2.5, 
  2022: 2.9, 2023: 3.0, 2024: 2.5, 2025: 2.6, 2026: 2.7
};

// 데모용 초기 사용자
const INITIAL_USERS = [
  { email: 'admin@axa.co.kr', password: 'admin', name: '김관리', team: '스마트보상부' }
];

const INITIAL_VENDORS = {
  '1234567890': {
    id: '1234567890',
    name: '(주)AXA 협력공장', ceoName: '이강인', phone: '010-1234-5678',
    address: '서울특별시 중구 을지로 100 15층', 
    lastContractDate: '2025-01-15',
    lastContractPeriod: '2025-01-15 ~ 2025-12-31',
    lastContractAmount: 45000000
  },
  '9876543210': {
    id: '9876543210',
    name: '(주)글로벌네트웍스', ceoName: '손흥민', phone: '010-9999-8888',
    address: '경기도 성남시 분당구 판교로 200', 
    lastContractDate: '2024-12-01',
    lastContractPeriod: '2024-12-01 ~ 2025-11-30',
    lastContractAmount: 85000000
  }
};

const REGIONS_DATA = {
  "서울특별시": ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  "부산광역시": ["강서구", "금정구", "남구", "동래구", "북구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"],
  "경기도": ["고양시", "남양주시", "부천시", "성남시", "수원시", "안산시", "안양시", "용인시", "화성시"],
  // ... 필요 시 추가
};

// 유틸리티
const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount || 0);
const toCommaString = (val) => val.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fromCommaString = (val) => parseInt(val.replace(/,/g, '')) || 0;
const formatBizNo = (no) => no.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');

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
  const [page, setPage] = useState('login'); 
  const [user, setUser] = useState(null); 
  const [users, setUsers] = useState(INITIAL_USERS);

  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [rates, setRates] = useState(INITIAL_RATES);
  const [contracts, setContracts] = useState([]);

  // Auth States
  const [authMode, setAuthMode] = useState('login'); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({ email: '', code: '', name: '', team: '', password: '' });
  const [serverCode, setServerCode] = useState(null);

  // Search & Dashboard States
  const [searchTab, setSearchTab] = useState('bizNo'); 
  const [searchBizNo, setSearchBizNo] = useState('');
  const [searchProvince, setSearchProvince] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchName, setSearchName] = useState('');   
  const [searchResults, setSearchResults] = useState([]); 
  const [foundVendor, setFoundVendor] = useState(null); 
  
  const [contractForm, setContractForm] = useState({ amount: '', startDate: '', endDate: '' });
  const [currentContract, setCurrentContract] = useState(null);
  const [showQRSection, setShowQRSection] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  // --- Handlers: Auth ---
  const handleLogin = (e) => {
    e.preventDefault();
    const targetUser = users.find(u => u.email === loginEmail && u.password === loginPw);
    if (targetUser) {
      setUser(targetUser);
      setPage('dashboard');
    } else {
      alert('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const requestSignupCode = () => {
    if(!signupForm.email.includes('@')) return alert('유효한 이메일을 입력하세요.');
    if(users.some(u => u.email === signupForm.email)) return alert('이미 가입된 이메일입니다.');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerCode(code);
    alert(`[인증번호 발송됨]\n\n인증번호: ${code}\n\n(테스트용: 팝업확인)`);
    setSignupStep(2);
  };

  const verifySignupCode = () => {
    if(signupForm.code === serverCode) {
      alert('인증되었습니다. 회원 정보를 입력해주세요.');
      setSignupStep(3);
    } else {
      alert('인증번호가 일치하지 않습니다.');
    }
  };

  const completeSignup = (e) => {
    e.preventDefault();
    if(signupForm.password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
    if(!signupForm.team) return alert('부서를 선택해주세요.');
    
    const newUser = {
      email: signupForm.email,
      password: signupForm.password,
      name: signupForm.name,
      team: signupForm.team
    };
    
    setUsers([...users, newUser]);
    alert('회원가입이 완료되었습니다! 로그인해주세요.');
    setAuthMode('login');
    setSignupStep(1);
    setSignupForm({ email: '', code: '', name: '', team: '', password: '' });
  };

  // --- Handlers: Search & Contract ---
  const handleSearchBizNo = () => {
    const v = vendors[searchBizNo];
    if(v) selectVendor(v);
    else { alert('등록된 업체가 아닙니다.'); setFoundVendor(null); }
  };

  const handleSearchRegionName = () => {
    if(!searchProvince && !searchName) return alert('검색 조건(지역 또는 업체명)을 입력해주세요.');
    const results = Object.values(vendors).filter(v => {
      const provinceMatch = searchProvince ? v.address.includes(searchProvince) : true;
      const districtMatch = searchDistrict ? v.address.includes(searchDistrict) : true;
      const nameMatch = searchName ? v.name.includes(searchName) : true;
      return provinceMatch && districtMatch && nameMatch;
    });
    setSearchResults(results);
    if(results.length === 0) alert('검색 결과가 없습니다.');
  };

  const selectVendor = (v) => {
    setFoundVendor(v);
    setSearchResults([]); 
    const thisYearRate = rates[2026] || 2.7;
    const calcAmount = Math.floor((v.lastContractAmount * (1 + thisYearRate / 100)) / 10) * 10;
    const todayStr = new Date().toISOString().split('T')[0];
    const endYearStr = `${new Date().getFullYear()}-12-31`;
    setContractForm({ amount: toCommaString(calcAmount), startDate: todayStr, endDate: endYearStr });
  };

  const createContract = async () => {
    if(!contractForm.amount || !contractForm.startDate || !contractForm.endDate) return alert('모든 필수 정보를 입력해주세요.');
    
    // [수정됨] 계약번호 생성 규칙: 연도-부서-이름-일련번호
    const year = new Date().getFullYear();
    const seq = (contracts.length + 1).toString().padStart(4, '0');
    // 공백 제거 등 안전하게 처리
    const safeTeam = user.team.replace(/\s+/g, '');
    const safeName = user.name.replace(/\s+/g, '');
    const contractNo = `${year}-${safeTeam}-${safeName}-${seq}`;

    const newContract = {
      id: `C${Date.now()}`,
      contractNo: contractNo, // 수정된 번호 적용
      vendorId: foundVendor.id, 
      vendorName: foundVendor.name,
      ceoName: foundVendor.ceoName,
      address: foundVendor.address,
      amount: fromCommaString(contractForm.amount),
      periodStart: contractForm.startDate,
      periodEnd: contractForm.endDate,
      status: 'PENDING',
      creatorEmail: user.email,
      creatorName: user.name,
      creatorTeam: user.team,
      createdAt: new Date().toLocaleString()
    };
    
    try {
      const res = await fetch(`${SERVER_URL}/api/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContract)
      });
      if(!res.ok) throw new Error('서버 통신 실패');
      setContracts([newContract, ...contracts]);
      setFoundVendor(null);
      setSearchBizNo(''); setSearchProvince(''); setSearchDistrict(''); setSearchName('');
      alert(`계약서가 생성되었습니다.\n번호: ${contractNo}`);
    } catch (err) {
      console.error(err);
      alert(`계약 생성 실패: ${err.message}`);
    }
  };

  const copyLinkWithMsg = () => {
    const link = `${SERVER_URL}/sign/${currentContract.id}`;
    navigator.clipboard.writeText(`[AXA손해보험] ${currentContract.vendorName}님, 2026년 정비수가 계약 체결을 부탁드립니다.\n\n▶ 계약서 확인 및 서명하기:\n${link}`);
    alert('메시지 내용이 복사되었습니다.');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
      setTimeout(() => {
        setVendors(prev => ({
          ...prev,
          '1111222233': {
            id: '1111222233',
            name: '(주)부산 모터스', ceoName: '박지성', phone: '010-8888-7777',
            address: '부산광역시 해운대구 센텀로 10', 
            lastContractDate: '2024-11-01',
            lastContractPeriod: '2024-11-01 ~ 2025-10-31',
            lastContractAmount: 70000000
          }
        }));
        alert(`${file.name} 업로드 완료. 신규 데이터가 추가되었습니다.`);
        setShowExcelModal(false);
      }, 1000);
    }
  };

  // --- UI Renders ---

  const renderAuth = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F7FF] p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 border border-blue-50">
        <div className="text-center mb-8">
          <AxaLogo size="large" />
          <p className="text-slate-500 mt-2 text-sm">
            {authMode === 'login' ? '직원 전용 로그인' : '신규 직원 회원가입'}
          </p>
        </div>

        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
            <div>
              <label className="block text-sm font-bold text-[#00008F] mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20}/>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@axa.co.kr" className="w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 outline-none focus:border-[#00008F]" required/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#00008F] mb-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20}/>
                <input type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="비밀번호 입력" className="w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 outline-none focus:border-[#00008F]" required/>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold text-lg hover:bg-[#000066]">로그인</button>
            <div className="pt-4 text-center">
              <button type="button" onClick={() => setAuthMode('signup')} className="text-sm text-slate-500 hover:text-[#00008F] underline">계정이 없으신가요? 회원가입</button>
            </div>
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
              <p className="text-xs font-bold text-[#00008F] mb-2 flex items-center justify-center gap-1"><ShieldCheck size={14}/> 테스트용 데모 계정</p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>아이디: <span className="font-mono font-bold select-all">admin@axa.co.kr</span></p>
                <p>비밀번호: <span className="font-mono font-bold select-all">admin</span></p>
              </div>
            </div>
          </form>
        )}

        {authMode === 'signup' && (
          <div className="space-y-4 animate-in slide-in-from-right-10">
            {signupStep === 1 && (
              <div className="space-y-4">
                 <div>
                  <label className="block text-sm font-bold text-[#00008F] mb-1">가입할 이메일</label>
                  <input type="email" value={signupForm.email} onChange={e => setSignupForm({...signupForm, email: e.target.value})} placeholder="example@axa.co.kr" className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none" />
                </div>
                <button onClick={requestSignupCode} className="w-full py-3 bg-[#00008F] text-white rounded-xl font-bold">인증번호 받기</button>
              </div>
            )}
            {signupStep === 2 && (
              <div className="space-y-4">
                 <div className="text-center mb-2"><span className="text-sm bg-blue-100 text-[#00008F] px-3 py-1 rounded-full">{signupForm.email}</span></div>
                 <div>
                  <label className="block text-sm font-bold text-[#00008F] mb-1">인증번호 6자리</label>
                  <input type="text" maxLength={6} value={signupForm.code} onChange={e => setSignupForm({...signupForm, code: e.target.value})} placeholder="123456" className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none text-center tracking-widest font-bold" />
                </div>
                <button onClick={verifySignupCode} className="w-full py-3 bg-[#00008F] text-white rounded-xl font-bold">인증 확인</button>
              </div>
            )}
            {signupStep === 3 && (
              <form onSubmit={completeSignup} className="space-y-3">
                 <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">이름</label>
                  <input required value={signupForm.name} onChange={e => setSignupForm({...signupForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none"/>
                 </div>
                 
                 {/* [수정됨] 부서 선택 콤보박스 */}
                 <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">부서/팀</label>
                  <div className="relative">
                    <select required value={signupForm.team} onChange={e => setSignupForm({...signupForm, team: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none appearance-none">
                      <option value="">부서를 선택하세요</option>
                      {TEAM_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16}/>
                  </div>
                 </div>

                 <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">비밀번호 (6자리 이상)</label>
                  <input required type="password" minLength={6} value={signupForm.password} onChange={e => setSignupForm({...signupForm, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none"/>
                 </div>
                 <button type="submit" className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold mt-2">가입 완료</button>
              </form>
            )}
            <div className="pt-2 text-center">
              <button type="button" onClick={() => { setAuthMode('login'); setSignupStep(1); }} className="text-sm text-slate-500 hover:text-[#00008F] underline">로그인 화면으로 돌아가기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-[#F8FBFF] font-sans pb-20">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <AxaLogo />
        <div className="flex gap-2">
          <div className="hidden sm:block text-right mr-2">
            <p className="text-xs font-bold text-[#00008F]">{user?.name} 님</p>
            <p className="text-[10px] text-slate-500">{user?.team}</p>
          </div>
          <button onClick={() => setShowRateModal(true)} className="p-2 bg-slate-100 rounded-full text-slate-600"><Settings size={20}/></button>
          <button onClick={() => setPage('login')} className="p-2 bg-slate-100 rounded-full text-slate-600"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <section className="flex justify-between items-center bg-white p-4 rounded-2xl border border-blue-50 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <FileSpreadsheet size={16}/> 업체 DB 관리
          </div>
          <button onClick={() => setShowExcelModal(true)} className="text-xs bg-blue-50 text-[#00008F] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
            <PlusCircle size={12}/> 엑셀 등록
          </button>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
          <h3 className="font-bold text-[#00008F] flex items-center gap-2 mb-4"><Search size={18}/> 업체 조회 및 계약 생성</h3>
          
          <div className="flex border-b border-slate-200 mb-6">
            <button onClick={() => { setSearchTab('bizNo'); setFoundVendor(null); setSearchResults([]); }} className={`flex-1 py-3 text-sm font-bold ${searchTab === 'bizNo' ? 'border-b-2 border-[#00008F] text-[#00008F]' : 'text-slate-400'}`}>사업자번호 조회</button>
            <button onClick={() => { setSearchTab('regionName'); setFoundVendor(null); setSearchResults([]); }} className={`flex-1 py-3 text-sm font-bold ${searchTab === 'regionName' ? 'border-b-2 border-[#00008F] text-[#00008F]' : 'text-slate-400'}`}>지역/업체명 조회</button>
          </div>

          {searchTab === 'bizNo' && (
            <div className="flex gap-2 mb-6">
              <input value={searchBizNo} onChange={e => setSearchBizNo(e.target.value)} placeholder="사업자번호 10자리" className="flex-1 px-4 py-3 rounded-xl border bg-slate-50 outline-none font-bold"/>
              <button onClick={handleSearchBizNo} className="bg-[#00008F] text-white px-6 rounded-xl font-bold">조회</button>
            </div>
          )}

          {searchTab === 'regionName' && (
            <div className="space-y-3 mb-6 animate-in fade-in">
              <div className="flex gap-2">
                <select value={searchProvince} onChange={e => { setSearchProvince(e.target.value); setSearchDistrict(''); }} className="w-1/3 px-4 py-3 rounded-xl border bg-slate-50 outline-none text-sm appearance-none">
                  <option value="">시/도 선택</option>
                  {Object.keys(REGIONS_DATA).map(province => (<option key={province} value={province}>{province}</option>))}
                </select>
                <select value={searchDistrict} onChange={e => setSearchDistrict(e.target.value)} className="w-1/3 px-4 py-3 rounded-xl border bg-slate-50 outline-none text-sm appearance-none" disabled={!searchProvince}>
                  <option value="">전체 (시/군/구)</option>
                  {searchProvince && REGIONS_DATA[searchProvince]?.map(district => (<option key={district} value={district}>{district}</option>))}
                </select>
              </div>
              <div className="flex gap-2">
                <input value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="업체명 (선택 입력)" className="flex-1 px-4 py-3 rounded-xl border bg-slate-50 outline-none text-sm font-bold"/>
                <button onClick={handleSearchRegionName} className="w-24 bg-[#00008F] text-white rounded-xl font-bold">검색</button>
              </div>
            </div>
          )}

          {searchResults.length > 0 && !foundVendor && (
            <div className="mb-6 space-y-2">
              <p className="text-xs font-bold text-slate-500 mb-2">검색 결과 {searchResults.length}건</p>
              {searchResults.map(v => (
                <div key={v.id} onClick={() => selectVendor(v)} className="p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-[#00008F] hover:bg-blue-50 transition-colors">
                  <p className="font-bold text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{v.address}</p>
                </div>
              ))}
            </div>
          )}

          {foundVendor && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="bg-[#F0F7FF] p-5 rounded-2xl border border-blue-100 relative">
                <button onClick={() => setFoundVendor(null)} className="absolute top-4 right-4 text-xs text-blue-400 underline">다시 검색</button>
                <p className="text-lg font-black text-[#00008F]">{foundVendor.name}</p>
                <p className="text-sm text-slate-600 mb-2">{foundVendor.ceoName} | {formatBizNo(foundVendor.id)}</p>
                <p className="text-xs text-slate-500">{foundVendor.address}</p>
                <div className="text-xs text-slate-500 pt-2 mt-2 border-t border-blue-200">
                  <p>• 기존: {foundVendor.lastContractPeriod} ({formatCurrency(foundVendor.lastContractAmount)}원)</p>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">2026 계약 수가 (인상률 {rates[2026]}% 자동적용)</label>
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

        {/* [수정됨] 계약 체결 현황 목록 */}
        <section className="space-y-4">
          <h3 className="font-bold text-slate-700 ml-2 flex items-center gap-2"><LayoutDashboard size={18}/> 계약 체결 현황</h3>
          {contracts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">생성된 계약이 없습니다.</div>
          ) : (
            contracts.map(c => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-[#00008F] transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {c.status === 'COMPLETED' ? '체결 완료' : '대기중'}
                    </span>
                    <span className="text-[10px] text-slate-400">{c.contractNo}</span>
                  </div>
                  <p className="font-bold text-slate-800">{c.vendorName}</p>
                </div>
                <button onClick={() => { setCurrentContract(c); setPage('contract-view'); }} className="p-2 bg-blue-50 text-[#00008F] rounded-lg opacity-80 group-hover:opacity-100">
                  <ChevronDown size={20}/>
                </button>
              </div>
            ))
          )}
        </section>
      </main>

      {/* 모달들 (생략 - 기존과 동일) */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
             <h3 className="font-bold text-lg mb-4 text-[#00008F]">연도별 인상률 관리</h3>
             <div className="space-y-3">
               {Object.keys(rates).map(year => (
                 <div key={year} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                   <span className="font-bold text-slate-600">{year}년</span>
                   <div className="flex items-center gap-2">
                     <input type="number" step="0.1" value={rates[year]} onChange={(e) => setRates({...rates, [year]: e.target.value})} className="w-16 p-1 text-right border rounded bg-white"/>
                     <span className="text-sm">%</span>
                   </div>
                 </div>
               ))}
             </div>
             <button onClick={() => setShowRateModal(false)} className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl font-bold">닫기</button>
          </div>
        </div>
      )}

      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center">
             <FileSpreadsheet size={48} className="mx-auto text-emerald-600 mb-4"/>
             <h3 className="font-bold text-lg mb-2">업체 정보 일괄 등록</h3>
             <label className="block w-full py-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 mb-4">
               <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload}/>
               <span className="text-sm font-bold text-slate-400">파일 선택 (.xlsx)</span>
             </label>
             <button onClick={() => setShowExcelModal(false)} className="text-sm text-slate-400 underline">취소</button>
          </div>
        </div>
      )}
    </div>
  );

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
                   <button onClick={copyLinkWithMsg} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl flex justify-center gap-2"><Copy size={18}/> 링크 복사</button>
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

  if(page === 'login') return renderAuth();
  if(page === 'dashboard') return renderDashboard();
  if(page === 'contract-view') return renderContractView();
  return renderAuth();
}