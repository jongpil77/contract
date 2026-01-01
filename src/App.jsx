import React, { useState, useEffect } from 'react';
import { 
  Search, Copy, QrCode, LogOut, CheckCircle2, Upload, History, Mail, 
  Settings, FileSpreadsheet, PlusCircle, Trash2, ShieldCheck, X, 
  Calendar, FileText, PlayCircle, ChevronDown, ShieldAlert, Printer, 
  MapPin, Building2, User, UserPlus, Lock, LayoutDashboard, FileUp,
  AlertTriangle, Calculator, UserCog, Ban
} from 'lucide-react';

/**
 * 정비수가 모바일 계약 체결 시스템 - V9.0 (Final Complete)
 * - 관리자 권한 분리 (admin@axa.co.kr만 인상률 수정)
 * - 상태 표시 UI 개선 (애니메이션, 위치 변경)
 * - 원 단위 절사
 * - 전국 지역 데이터 반영
 */

const SERVER_URL = "https://contract-axa.up.railway.app"; 

// --- 1. 지역 데이터 (전국 시군구 전체 반영) ---
const REGIONS_DATA = {
  "서울특별시": ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  "부산광역시": ["강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"],
  "대구광역시": ["남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  "인천광역시": ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"],
  "광주광역시": ["광산구", "남구", "동구", "북구", "서구"],
  "대전광역시": ["대덕구", "동구", "서구", "유성구", "중구"],
  "울산광역시": ["남구", "동구", "북구", "울주군", "중구"],
  "세종특별자치시": ["세종시 전체"],
  "경기도": ["가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시"],
  "강원특별자치도": ["강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군", "원주시", "인제군", "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군", "화천군", "횡성군"],
  "충청북도": ["괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시", "충주시"],
  "충청남도": ["계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군"],
  "전북특별자치도": ["고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군"],
  "전라남도": ["강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군"],
  "경상북도": ["경산시", "경주시", "고령군", "구미시", "군위군", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시"],
  "경상남도": ["거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군"],
  "제주특별자치도": ["서귀포시", "제주시"]
};

// --- 2. 초기 설정 데이터 ---
const TEAM_LIST = ["서울보상부", "경인보상부", "중부보상부", "남부보상부", "스마트보상부", "특수보상부"];

const INITIAL_USERS = [
  { id: 1, email: 'admin@axa.co.kr', password: 'admin', name: '김관리', team: '스마트보상부', role: 'ADMIN' },
  { id: 2, email: 'user@axa.co.kr', password: 'user', name: '이담당', team: '서울보상부', role: 'USER' }
];

const INITIAL_VENDORS = {
  '1234567890': {
    id: '1234567890',
    name: '(주)AXA 협력공장', ceoName: '이강인', phone: '010-1234-5678',
    address: '서울특별시 중구 을지로 100 15층', 
    lastContractDate: '2025-01-15',
    lastContractAmount: 30000 
  },
  '9876543210': {
    id: '9876543210',
    name: '(주)장기 미계약 공장', ceoName: '손흥민', phone: '010-9999-8888',
    address: '경기도 성남시 분당구 판교로 200', 
    lastContractDate: '2023-01-01',
    lastContractAmount: 28000
  },
  '1122334455': {
    id: '1122334455',
    name: '부산 정비소', ceoName: '박지성', phone: '010-8888-7777',
    address: '부산광역시 해운대구 센텀중앙로 10', 
    lastContractDate: '2024-05-20',
    lastContractAmount: 32000
  }
};

// 유틸리티
const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount || 0);
const toCommaString = (val) => val.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fromCommaString = (val) => parseInt(val.replace(/,/g, '')) || 0;
const formatBizNo = (no) => no.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
const getTodayString = () => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

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
  const [contracts, setContracts] = useState([]);

  // --- 인상률 관리 State ---
  const [rates, setRates] = useState({});
  const [calcMethod, setCalcMethod] = useState('compound');

  // Auth States
  const [authMode, setAuthMode] = useState('login'); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({ email: '', code: '', name: '', team: '', password: '' });
  const [serverCode, setServerCode] = useState(null);

  // Search & Contract States
  const [searchTab, setSearchTab] = useState('bizNo'); 
  const [searchBizNo, setSearchBizNo] = useState('');
  const [searchProvince, setSearchProvince] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchName, setSearchName] = useState('');   
  const [searchResults, setSearchResults] = useState([]); 
  const [foundVendor, setFoundVendor] = useState(null); 
  
  const [contractForm, setContractForm] = useState({ amount: '', startDate: '', endDate: '' });
  const [limitAmount, setLimitAmount] = useState(0); 
  const [limitDetail, setLimitDetail] = useState({ base: 0, increase: 0 });

  // Flow States
  const [currentContract, setCurrentContract] = useState(null);
  const [vendorAuth, setVendorAuth] = useState({ bizNo: '' });
  const [isVendorAuthenticated, setIsVendorAuthenticated] = useState(false);
  const [stampImage, setStampImage] = useState(null);
  const [vendorEmail, setVendorEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('user'); // default to user
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showLimitWarningModal, setShowLimitWarningModal] = useState(false);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);

  // --- 초기화: 연도별 인상률 자동 생성 ---
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const newRates = { ...rates };
    for(let y = 2018; y <= currentYear + 1; y++) {
      if(newRates[y] === undefined) {
        if(y===2024) newRates[y] = 2.5;
        else if(y===2025) newRates[y] = 2.6;
        else if(y===2026) newRates[y] = 2.7;
        else newRates[y] = 0.0;
      }
    }
    setRates(newRates);
  }, []);

  // --- Handlers: Auth ---
  const handleLogin = (e) => {
    e.preventDefault();
    const targetUser = users.find(u => u.email === loginEmail && u.password === loginPw);
    if (targetUser) {
      setUser(targetUser);
      // 관리자면 시스템 설정 탭 기본값, 아니면 유저 탭
      setSettingsTab(targetUser.email === 'admin@axa.co.kr' ? 'system' : 'user');
      setPage('dashboard');
    } else {
      alert('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const requestSignupCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerCode(code);
    alert(`[인증번호: ${code}]`);
    setSignupStep(2);
  };

  const verifySignupCode = () => {
    if(signupForm.code === serverCode) {
      alert('인증되었습니다.');
      setSignupStep(3);
    } else alert('인증번호 불일치');
  };

  const completeSignup = (e) => {
    e.preventDefault();
    setUsers([...users, { ...signupForm, id: Date.now(), role: 'USER' }]);
    alert('가입 완료! 로그인해주세요.');
    setAuthMode('login');
    setSignupStep(1);
  };

  // --- Handlers: Settings ---
  const handleChangeTeam = (newTeam) => {
    const updatedUser = { ...user, team: newTeam };
    setUser(updatedUser);
    setUsers(users.map(u => u.email === user.email ? updatedUser : u));
    alert('소속 부서가 변경되었습니다.');
  };

  const handleResetPassword = () => {
    if(confirm('비밀번호를 초기화 하시겠습니까?\n초기값: 15661566')) {
      const updatedUser = { ...user, password: '15661566' };
      setUser(updatedUser);
      setUsers(users.map(u => u.email === user.email ? updatedUser : u));
      alert('비밀번호가 15661566으로 변경되었습니다.');
    }
  };

  // --- Handlers: Contract Logic ---
  const calculateLimit = (vendor) => {
    const lastYear = new Date(vendor.lastContractDate).getFullYear();
    let baseAmount = vendor.lastContractAmount;
    let accumulatedRate = 1.0;

    for(let y = lastYear + 1; y <= 2026; y++) {
      const rate = (rates[y] || 0) / 100;
      if(calcMethod === 'compound') accumulatedRate *= (1 + rate);
      else accumulatedRate += rate;
    }

    // [수정] 원 단위 절사 (소수점 제거)
    const limit = Math.floor(baseAmount * accumulatedRate); 
    
    setLimitDetail({ 
      base: baseAmount, 
      increase: limit - baseAmount,
      rateStr: ((accumulatedRate - 1) * 100).toFixed(2)
    });
    return limit;
  };

  const selectVendor = (v) => {
    setFoundVendor(v);
    setSearchResults([]);
    const limit = calculateLimit(v);
    setLimitAmount(limit);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const endYearStr = `${new Date().getFullYear()}-12-31`;
    setContractForm({ amount: toCommaString(limit), startDate: todayStr, endDate: endYearStr });
  };

  const handleCreateClick = () => {
    if(!contractForm.amount) return alert('금액을 입력해주세요.');
    const inputVal = fromCommaString(contractForm.amount);
    
    if (inputVal > limitAmount) {
      setShowLimitWarningModal(true);
    } else {
      finalizeCreateContract();
    }
  };

  const finalizeCreateContract = async () => {
    const year = new Date().getFullYear();
    const seq = (contracts.length + 1).toString().padStart(4, '0');
    const contractNo = `${year}-${user.team}-${user.name}-${seq}`;

    const newContract = {
      id: `C${Date.now()}`,
      contractNo,
      vendorId: foundVendor.id, 
      vendorName: foundVendor.name,
      ceoName: foundVendor.ceoName,
      address: foundVendor.address,
      amount: fromCommaString(contractForm.amount),
      periodStart: contractForm.startDate,
      periodEnd: contractForm.endDate,
      status: 'PENDING',
      creatorEmail: user.email,
      createdAt: new Date().toLocaleString()
    };
    
    setContracts([newContract, ...contracts]);
    setFoundVendor(null);
    setShowLimitWarningModal(false);
    alert(`계약서가 생성되었습니다.\n[${contractNo}]`);
  };

  const handleDeleteContract = (id) => {
    if(confirm('정말 이 계약을 취소(삭제)하시겠습니까?')) {
      setContracts(contracts.filter(c => c.id !== id));
    }
  };

  // --- Handlers: Search ---
  const handleSearchBizNo = () => {
    const v = vendors[searchBizNo];
    if(v) selectVendor(v);
    else { alert('등록된 업체가 아닙니다.'); setFoundVendor(null); }
  };

  const handleSearchRegionName = () => {
    // 최소한 지역 또는 업체명 중 하나는 있어야 함
    if(!searchProvince && !searchName) return alert('지역 또는 업체명을 입력해주세요.');
    const results = Object.values(vendors).filter(v => {
      const prov = searchProvince ? v.address.includes(searchProvince) : true;
      const dist = searchDistrict ? v.address.includes(searchDistrict) : true;
      const name = searchName ? v.name.includes(searchName) : true;
      return prov && dist && name;
    });
    setSearchResults(results);
    if(results.length === 0) alert('검색 결과가 없습니다.');
  };

  // --- Handlers: Vendor Flow ---
  const handleVendorLogin = () => {
    if(vendorAuth.bizNo === currentContract.vendorId) setIsVendorAuthenticated(true);
    else alert('사업자번호가 일치하지 않습니다.');
  };

  const handleFinalSubmit = async () => {
    setShowFinalConfirmModal(false);
    setIsProcessing(true);
    setProcessStep('pdf'); 
    setTimeout(() => {
      setProcessStep('email'); 
      setTimeout(() => {
        const updated = { ...currentContract, status: 'COMPLETED', completedAt: new Date().toLocaleString() };
        setContracts(contracts.map(c => c.id === updated.id ? updated : c));
        setPage('success');
        setIsProcessing(false);
      }, 2000);
    }, 2000);
  };

  const copyLinkWithMsg = () => {
    const link = `${SERVER_URL}/sign/${currentContract.id}`;
    navigator.clipboard.writeText(`[AXA손해보험] ${currentContract.vendorName}님, 계약 체결 부탁드립니다.\n${link}`);
    alert('링크가 복사되었습니다.');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
      setTimeout(() => {
        // 더미 데이터 추가
        setVendors(prev => ({...prev, '9999888877': {id:'9999888877', name:'(주)신규 모터스', ceoName:'김신규', address:'서울 강남구', lastContractDate:'2024-12-01', lastContractAmount:45000}}));
        alert('업로드 완료');
        setShowExcelModal(false);
      }, 1000);
    }
  };

  // --- UI Renders ---

  const renderLogin = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F7FF] p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 border border-blue-50">
        <div className="text-center mb-8"><AxaLogo size="large" /></div>
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="admin@axa.co.kr" className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none" required/>
            <input type="password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} placeholder="비밀번호" className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none" required/>
            <button className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold">로그인</button>
            <p onClick={()=>setAuthMode('signup')} className="text-center text-xs text-slate-400 cursor-pointer">회원가입</p>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              <p>Admin: admin@axa.co.kr / admin</p>
              <p>User: user@axa.co.kr / user</p>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {signupStep === 1 && (
              <>
                <input value={signupForm.email} onChange={e=>setSignupForm({...signupForm, email:e.target.value})} placeholder="이메일" className="w-full px-4 py-3 rounded-xl border"/>
                <button onClick={requestSignupCode} className="w-full py-3 bg-[#00008F] text-white rounded-xl">인증번호 받기 (Skip)</button>
              </>
            )}
            {signupStep === 2 && (
              <>
                <input placeholder="인증번호 6자리" className="w-full px-4 py-3 rounded-xl border"/>
                <button onClick={()=>setSignupStep(3)} className="w-full py-3 bg-[#00008F] text-white rounded-xl">확인</button>
              </>
            )}
            {signupStep === 3 && (
              <form onSubmit={completeSignup} className="space-y-3">
                <input required value={signupForm.name} onChange={e=>setSignupForm({...signupForm, name:e.target.value})} placeholder="이름" className="w-full px-4 py-3 rounded-xl border"/>
                <select required value={signupForm.team} onChange={e=>setSignupForm({...signupForm, team:e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-white">
                  <option value="">부서 선택</option>
                  {TEAM_LIST.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <input required type="password" value={signupForm.password} onChange={e=>setSignupForm({...signupForm, password:e.target.value})} placeholder="비밀번호" className="w-full px-4 py-3 rounded-xl border"/>
                <button className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold">가입 완료</button>
              </form>
            )}
            <p onClick={()=>{setAuthMode('login'); setSignupStep(1);}} className="text-center text-xs text-slate-400 cursor-pointer">로그인으로 돌아가기</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => {
    const stats = {
      total: contracts.length,
      pending: contracts.filter(c => c.status === 'PENDING').length,
      completed: contracts.filter(c => c.status === 'COMPLETED').length
    };

    return (
      <div className="min-h-screen bg-[#F8FBFF] font-sans pb-20">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-30">
          <div>
            <AxaLogo />
            <p className="text-xs text-slate-500 font-bold mt-1 ml-1">{getTodayString()}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{setSettingsTab('user'); setShowSettingsModal(true);}} className="p-2 bg-slate-100 rounded-full text-slate-600"><Settings size={20}/></button>
            <button onClick={()=>setPage('login')} className="p-2 bg-slate-100 rounded-full text-slate-600"><LogOut size={20}/></button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-bold mb-1">전체 계약</p>
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <p className="text-xs text-amber-500 font-bold mb-1">진행 중</p>
              <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <p className="text-xs text-emerald-500 font-bold mb-1">체결 완료</p>
              <p className="text-2xl font-black text-emerald-500">{stats.completed}</p>
            </div>
          </div>

          <section className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm">
            <h3 className="font-bold text-[#00008F] flex items-center gap-2 mb-4"><Search size={18}/> 업체 조회 및 계약</h3>
            
            <div className="flex border-b border-slate-200 mb-6">
              <button onClick={()=>{setSearchTab('bizNo'); setFoundVendor(null);}} className={`flex-1 py-3 text-sm font-bold ${searchTab==='bizNo'?'text-[#00008F] border-b-2 border-[#00008F]':'text-slate-400'}`}>사업자번호</button>
              <button onClick={()=>{setSearchTab('regionName'); setFoundVendor(null);}} className={`flex-1 py-3 text-sm font-bold ${searchTab==='regionName'?'text-[#00008F] border-b-2 border-[#00008F]':'text-slate-400'}`}>지역/업체명</button>
            </div>

            {searchTab === 'bizNo' && (
              <div className="flex gap-2 mb-6">
                <input value={searchBizNo} onChange={e=>setSearchBizNo(e.target.value)} placeholder="사업자번호 10자리" className="flex-1 px-4 py-3 rounded-xl border outline-none"/>
                <button onClick={handleSearchBizNo} className="bg-[#00008F] text-white px-6 rounded-xl font-bold">조회</button>
              </div>
            )}

            {searchTab === 'regionName' && (
              <div className="space-y-3 mb-6">
                <div className="flex gap-2">
                  <select value={searchProvince} onChange={e=>{setSearchProvince(e.target.value); setSearchDistrict('');}} className="w-1/3 px-4 py-3 rounded-xl border bg-slate-50 outline-none text-sm">
                    <option value="">시/도</option>
                    {Object.keys(REGIONS_DATA).map(k=><option key={k} value={k}>{k}</option>)}
                  </select>
                  <select value={searchDistrict} onChange={e=>setSearchDistrict(e.target.value)} className="w-1/3 px-4 py-3 rounded-xl border bg-slate-50 outline-none text-sm" disabled={!searchProvince}>
                    <option value="">시/군/구</option>
                    {searchProvince && REGIONS_DATA[searchProvince].map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input value={searchName} onChange={e=>setSearchName(e.target.value)} placeholder="업체명 (선택)" className="flex-1 px-4 py-3 rounded-xl border outline-none"/>
                  <button onClick={handleSearchRegionName} className="w-20 bg-[#00008F] text-white rounded-xl font-bold">검색</button>
                </div>
              </div>
            )}

            {searchResults.length > 0 && !foundVendor && (
              <div className="mb-6 space-y-2">
                {searchResults.map(v=>(
                  <div key={v.id} onClick={()=>selectVendor(v)} className="p-4 border rounded-xl hover:bg-slate-50 cursor-pointer">
                    <p className="font-bold">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.address}</p>
                    <p className="text-xs text-[#00008F] mt-1">기존 수가: {formatCurrency(v.lastContractAmount)}원</p>
                  </div>
                ))}
              </div>
            )}

            {foundVendor && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="bg-[#F0F7FF] p-5 rounded-2xl border border-blue-100 relative">
                  <button onClick={()=>setFoundVendor(null)} className="absolute top-4 right-4 text-xs text-blue-400 underline">다시 검색</button>
                  <p className="text-lg font-black text-[#00008F]">{foundVendor.name}</p>
                  <p className="text-sm text-slate-600 mb-1">{foundVendor.ceoName} | {formatBizNo(foundVendor.id)}</p>
                  
                  {/* [시각화 개선] 산출 내역 */}
                  <div className="mt-3 bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
                    <p className="text-xs text-slate-400 font-bold mb-2">한도 산출 내역 (인상률 {limitDetail.rateStr}%)</p>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-400">기존 수가</span>
                        <span className="text-slate-600">{formatCurrency(limitDetail.base)}</span>
                      </div>
                      <PlusCircle size={14} className="text-slate-300"/>
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-400">인상분</span>
                        <span className="text-slate-600">{formatCurrency(limitDetail.increase)}</span>
                      </div>
                      <span className="text-slate-300">=</span>
                      <div className="text-center">
                        <span className="block text-[10px] text-blue-300">한도 금액</span>
                        <span className="text-[#00008F] font-black text-lg">{formatCurrency(limitAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">체결 금액</label>
                    <input value={contractForm.amount} onChange={e=>setContractForm({...contractForm, amount:toCommaString(e.target.value)})} className="w-full p-3 text-right font-black text-lg border rounded-xl outline-none text-[#00008F]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={contractForm.startDate} onChange={e=>setContractForm({...contractForm, startDate:e.target.value})} className="w-full p-3 text-sm border rounded-xl" />
                    <input type="date" value={contractForm.endDate} onChange={e=>setContractForm({...contractForm, endDate:e.target.value})} className="w-full p-3 text-sm border rounded-xl" />
                  </div>
                  <button onClick={handleCreateClick} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold shadow-lg">계약서 생성하기</button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-slate-700 ml-2">계약 진행 현황</h3>
            {contracts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-2xl border">생성된 계약이 없습니다.</div>
            ) : (
              contracts.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center group transition-all hover:border-[#00008F]">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{c.vendorName}</p>
                    <p className="text-xs text-slate-500 mb-2">{c.contractNo}</p>
                  </div>
                  
                  {/* [UI 개선] 상태 표시 좌측 배치 + 삭제 버튼 */}
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-full font-bold shadow-sm ${
                      c.status==='COMPLETED' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-amber-100 text-amber-600 animate-pulse'
                    }`}>
                      {c.status==='COMPLETED' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                      {c.status==='COMPLETED' ? '완료' : '진행중'}
                    </span>
                    <button onClick={()=>{setCurrentContract(c); setPage('contract-view');}} className="px-4 py-2 bg-blue-50 text-[#00008F] rounded-xl text-xs font-bold hover:bg-[#00008F] hover:text-white transition-colors">
                      VIEW
                    </button>
                    <button onClick={()=>handleDeleteContract(c.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>

        {/* 한도 초과 경고 모달 */}
        {showLimitWarningModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center animate-in zoom-in-95">
              <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4"/>
              <h3 className="font-bold text-lg mb-2">한도 금액 초과</h3>
              <p className="text-xs text-slate-500 mb-6">
                산출된 한도({formatCurrency(limitAmount)}원)를 초과했습니다.<br/>
                계속 진행하시려면 승인이 필요합니다.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => finalizeCreateContract()} className="w-full py-3 bg-[#00008F] text-white rounded-xl font-bold">
                  본사 사전승인 완료 (진행)
                </button>
                <button onClick={() => setShowLimitWarningModal(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
                  재확인 (취소)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 설정 모달 (권한 분리) */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-[#00008F]">설정</h3>
                 <button onClick={()=>setShowSettingsModal(false)}><X size={20}/></button>
               </div>
               
               <div className="flex border-b mb-6">
                 {/* 관리자만 시스템 설정 탭 보임 */}
                 {user?.role === 'ADMIN' && (
                   <button onClick={()=>setSettingsTab('system')} className={`flex-1 py-2 font-bold text-sm ${settingsTab==='system'?'text-[#00008F] border-b-2 border-[#00008F]':'text-slate-400'}`}>시스템 설정</button>
                 )}
                 <button onClick={()=>setSettingsTab('user')} className={`flex-1 py-2 font-bold text-sm ${settingsTab==='user'?'text-[#00008F] border-b-2 border-[#00008F]':'text-slate-400'}`}>내 정보 설정</button>
               </div>

               {settingsTab === 'system' && user?.role === 'ADMIN' && (
                 <div className="space-y-4">
                   <div className="bg-slate-50 p-3 rounded-xl flex gap-2">
                     <button onClick={()=>setCalcMethod('simple')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calcMethod==='simple'?'bg-white shadow text-[#00008F]':'text-slate-400'}`}>단리 적용</button>
                     <button onClick={()=>setCalcMethod('compound')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calcMethod==='compound'?'bg-white shadow text-[#00008F]':'text-slate-400'}`}>복리 적용</button>
                   </div>
                   <div className="space-y-2 max-h-40 overflow-y-auto">
                     {Object.keys(rates).sort().map(y => (
                       <div key={y} className="flex justify-between p-2 bg-slate-50 rounded-lg text-sm">
                         <span>{y}년</span>
                         <div className="flex items-center gap-1"><input type="number" step="0.1" value={rates[y]} onChange={(e)=>setRates({...rates, [y]:parseFloat(e.target.value)})} className="w-14 text-right bg-white rounded border p-1"/>%</div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {settingsTab === 'user' && (
                 <div className="space-y-4">
                   <div>
                     <p className="text-xs font-bold text-slate-500 mb-1">소속 부서 변경</p>
                     <select value={user.team} onChange={(e)=>handleChangeTeam(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-sm">
                       {TEAM_LIST.map(t=><option key={t} value={t}>{t}</option>)}
                     </select>
                   </div>
                   <button onClick={handleResetPassword} className="w-full py-3 border border-rose-200 text-rose-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                     <Lock size={16}/> 비밀번호 초기화
                   </button>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContractView = () => (
    <div className="min-h-screen bg-slate-100 flex flex-col p-6">
      <div className="bg-white p-6 rounded-3xl shadow-lg flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg">계약서 미리보기</h2>
          <button onClick={()=>setPage('dashboard')}><X/></button>
        </div>
        <div className="prose prose-sm max-w-none text-sm">
          <h1 className="text-center font-serif text-xl border-b pb-4">자동차 정비수가 계약서</h1>
          <p className="mt-4"><strong>계약번호:</strong> {currentContract.contractNo}</p>
          <p><strong>계약금액:</strong> {formatCurrency(currentContract.amount)} 원</p>
          <p><strong>계약기간:</strong> {currentContract.periodStart} ~ {currentContract.periodEnd}</p>
          <p className="mt-8 text-slate-400 text-center">[ 이하 표준 계약서 내용 ]</p>
        </div>
        
        {/* 발송 버튼 추가 */}
        {currentContract.status === 'PENDING' && (
          <div className="mt-8 pt-4 border-t">
            <button onClick={()=>setPage('send-view')} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold flex justify-center gap-2">
              <Printer size={18}/> 계약서 발송 및 서명 요청
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSendView = () => (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md text-center">
        <QrCode size={120} className="mx-auto mb-6 text-[#00008F]"/>
        <h3 className="font-bold text-lg mb-2">계약 체결 링크 발송</h3>
        <p className="text-xs text-slate-500 mb-6">협력업체 담당자에게 아래 링크를 전달하세요.</p>
        <button onClick={copyLinkWithMsg} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold flex justify-center gap-2 mb-3">
          <Copy size={18}/> 링크 복사
        </button>
        <button onClick={()=>setPage('vendor-login')} className="w-full py-4 bg-slate-100 font-bold rounded-xl flex justify-center gap-2">
          <PlayCircle size={18}/> (테스트) 업체 접속 시뮬레이션
        </button>
        <button onClick={()=>setPage('dashboard')} className="mt-4 text-xs text-slate-400 underline">닫기</button>
      </div>
    </div>
  );

  // --- Vendor Flow Pages (Login, Sign, Success) ---
  const renderVendorLogin = () => (
    <div className="min-h-screen bg-[#F0F7FF] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md p-8 rounded-[2rem] shadow-xl text-center">
        <AxaLogo />
        <h3 className="font-bold text-lg mt-6 mb-2">전자계약 본인인증</h3>
        <p className="text-xs text-slate-500 mb-6">사업자등록번호를 입력해주세요.</p>
        <input value={vendorAuth.bizNo} onChange={e=>setVendorAuth({bizNo:e.target.value})} placeholder="사업자번호 (숫자만)" className="w-full p-4 border rounded-xl mb-4 outline-none"/>
        <button onClick={()=>{
          if(vendorAuth.bizNo === currentContract.vendorId) setPage('vendor-sign');
          else alert('사업자번호 불일치');
        }} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold">인증하기</button>
      </div>
    </div>
  );

  const renderVendorSign = () => (
    <div className="min-h-screen bg-slate-50 p-6 pb-32">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
        <h3 className="font-bold text-lg border-b pb-2 mb-4">계약 내용 확인</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• 계약 기간: <span className="font-bold text-black">{currentContract.periodStart} ~ {currentContract.periodEnd}</span></li>
          <li>• 정비 수가: <span className="font-bold text-[#00008F]">{formatCurrency(currentContract.amount)}원</span></li>
        </ul>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
        <h3 className="font-bold mb-4">직인/도장 이미지 등록</h3>
        <div className="border-2 border-dashed border-slate-300 rounded-xl h-40 flex items-center justify-center relative overflow-hidden bg-slate-50">
          {stampImage ? <img src={stampImage} className="w-32 h-32 object-contain" /> : <div className="text-slate-400"><Upload className="mx-auto mb-2"/>이미지 업로드</div>}
          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>{
            if(e.target.files[0]) {
              const reader = new FileReader();
              reader.onloadend = () => setStampImage(reader.result);
              reader.readAsDataURL(e.target.files[0]);
            }
          }}/>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg">
        <input value={vendorEmail} onChange={e=>setVendorEmail(e.target.value)} placeholder="(선택) 수신 이메일" className="w-full p-3 border rounded-xl mb-3 text-sm"/>
        <button onClick={()=>setShowFinalConfirmModal(true)} disabled={!stampImage} className="w-full py-4 bg-[#00008F] text-white rounded-xl font-bold disabled:bg-slate-300">계약 체결 승인</button>
      </div>
      {(showFinalConfirmModal || isProcessing) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          {!isProcessing ? (
             <div className="bg-white w-full max-w-sm p-8 rounded-[2rem] text-center space-y-6">
               <ShieldCheck size={48} className="mx-auto text-[#00008F]"/>
               <div><h3 className="font-bold text-lg">최종 승인하시겠습니까?</h3></div>
               <div className="flex gap-3">
                 <button onClick={()=>setShowFinalConfirmModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">취소</button>
                 <button onClick={handleFinalSubmit} className="flex-1 py-3 bg-[#00008F] text-white rounded-xl font-bold">승인</button>
               </div>
             </div>
          ) : (
             <div className="bg-white w-full max-w-sm p-10 rounded-[2rem] text-center space-y-8">
               <div className="animate-spin w-12 h-12 border-4 border-[#00008F] border-t-transparent rounded-full mx-auto"></div>
               <p className="font-bold text-lg text-[#00008F]">{processStep === 'pdf' ? 'PDF 생성 중...' : '메일 전송 중...'}</p>
             </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="min-h-screen bg-[#F8FBFF] flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 size={60} className="text-emerald-500 mb-6"/>
      <h1 className="text-2xl font-black text-[#00008F] mb-2">체결 완료</h1>
      <p className="text-slate-500 mb-8">계약서가 메일로 발송되었습니다.</p>
      <button onClick={()=>{setPage('dashboard'); setStampImage(null);}} className="px-10 py-4 bg-[#00008F] text-white rounded-xl font-bold">확인</button>
    </div>
  );

  if(page === 'login') return renderLogin();
  if(page === 'dashboard') return renderDashboard();
  if(page === 'contract-view') return renderContractView();
  if(page === 'send-view') return renderSendView();
  if(page === 'vendor-login') return renderVendorLogin();
  if(page === 'vendor-sign') return renderVendorSign();
  if(page === 'success') return renderSuccess();

  return renderLogin();
}