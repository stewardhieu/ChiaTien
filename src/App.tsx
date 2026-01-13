import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Users, DollarSign, Calendar, CheckCircle, XCircle, 
  ChevronDown, ChevronUp, Copy, Save, UtensilsCrossed, 
  PieChart, RotateCcw, RotateCw, Filter, Clock, Edit3, Database, Search, X, 
  RefreshCcw, LayoutList, TrendingUp, History, ArrowRight, HelpCircle, FileText, ChevronRight, AlertCircle, BookOpen, User, Menu
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, query, orderBy
} from 'firebase/firestore';

// ==================================================================================
// 🔴 BẮT ĐẦU CẤU HÌNH FIREBASE 🔴
// Hãy thay toàn bộ object bên dưới bằng config bạn lấy được từ Firebase Console
// ==================================================================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE", // <-- Dán API Key của bạn vào đây
  authDomain: "your-project.firebaseapp.com", // <-- Thay đổi
  projectId: "your-project-id", // <-- Thay đổi
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
// ==================================================================================
// 🔴 KẾT THÚC CẤU HÌNH 🔴
// ==================================================================================

// Khởi tạo Firebase an toàn
let db: any;
let auth: any;
let isFirebaseReady = false;

try {
    // Chỉ khởi tạo nếu config đã được thay đổi (không phải placeholder mặc định)
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isFirebaseReady = true;
    }
} catch (e) {
    console.error("Lỗi khởi tạo Firebase:", e);
}

// App ID dùng để phân tách dữ liệu chung (Ví dụ: "team-marketing", "team-dev")
// Bạn có thể đổi string này để tạo ra một "phòng" dữ liệu mới
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'lunch-group-01';

// --- Theme & Style ---
const THEME_COLOR = '#000066'; 

// --- Types ---
interface ParticipantStatus {
  name: string;
  paid: boolean;
  paidAt?: string | null;
}

interface MealRecord {
  id: string;
  date: string;
  createdAt: number;
  title: string;
  totalAmount: number;
  perPersonAmount: number;
  payer: string;
  participants: ParticipantStatus[];
}

// --- Helper Functions ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString: string) => { if (!dateString) return ''; const date = new Date(dateString); return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); };
const formatShortDate = (dateString: string) => { if (!dateString) return ''; const date = new Date(dateString); return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date); };
const formatDateTime = (isoString?: string | null) => { if (!isoString) return ''; const date = new Date(isoString); return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); };
const formatDayOfWeek = (dateString: string) => { const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; const d = new Date(dateString); return days[d.getDay()]; }
const generateId = () => Math.random().toString(36).substr(2, 9);

const copyToClipboard = (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise<void>((resolve, reject) => {
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) resolve(); else reject(new Error('Copy failed'));
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
      }
    });
  }
};

// --- Components ---
const AnimatedCard = ({ children, className = "", delay = 0 }: any) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500 hover:shadow-md ${className}`} style={{ animation: `fadeInUp 0.5s ease-out ${delay}s both` }}>{children}</div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm z-50">
        <p className="font-bold text-gray-800 mb-1">{label || payload[0].name}</p>
        <p className="text-blue-600 font-semibold">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const GuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0">
                <h3 className="font-bold text-xl text-blue-900 flex items-center gap-2">
                    <BookOpen className="w-6 h-6"/> HƯỚNG DẪN SỬ DỤNG
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-gray-700 leading-relaxed">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h5 className="font-bold text-blue-800 mb-1">🔥 Dữ liệu Online (Firebase)</h5>
                    <p className="text-sm">Dữ liệu giờ đây được lưu trên đám mây. Bạn có thể chia sẻ App ID <b>"{APP_ID}"</b> cho đồng nghiệp để cùng xem và chỉnh sửa trên nhiều máy khác nhau.</p>
                </div>
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">1. Quy trình cơ bản</h4>
                    <p className="mb-2">Ứng dụng hoạt động theo quy tắc: <b>Một người trả tiền trước, sau đó chia đều cho những người cùng ăn.</b></p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Bước 1:</b> Vào tab <b>Thành Viên</b> để nhập tên mọi người trong nhóm (Chỉ cần làm 1 lần).</li>
                        <li><b>Bước 2:</b> Khi đi ăn, vào tab <b>Nhập Liệu</b>. Chọn ngày, món ăn, tổng tiền. Quan trọng nhất là chọn đúng <b>Người trả tiền</b> (Chủ nợ) và tick chọn những <b>Người ăn</b> (bao gồm cả người trả nếu họ cũng ăn).</li>
                        <li><b>Bước 3:</b> Bấm <b>Lưu</b>. Hệ thống tự động chia tiền và ghi nợ.</li>
                    </ul>
                </section>
                 <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">2. Theo dõi & Thanh toán nợ</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Cột Cần Thu Về (Màu Xanh):</b> Dành cho người đã ứng tiền. Bấm vào tên để xem chi tiết.</li>
                        <li><b>Cột Cần Phải Trả (Màu Đỏ):</b> Dành cho người ăn ké. Bấm vào tên để xem mình đang nợ những khoản nào.</li>
                        <li><b>Cách trả nợ:</b> Tick vào ô vuông <input type="checkbox" className="align-middle" /> bên cạnh món ăn. Khoản đó sẽ chuyển xuống mục <b>"Lịch sử đã trả"</b>.</li>
                    </ul>
                </section>
            </div>
            <div className="p-4 border-t bg-gray-50 text-right sticky bottom-0">
                <button onClick={onClose} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors">
                    Đã hiểu
                </button>
            </div>
        </div>
    </div>
);

// --- RecordForm Component ---
const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: any) => {
    const [fDate, setFDate] = useState(initialData.date || new Date().toISOString().slice(0, 10));
    const [fTitle, setFTitle] = useState(initialData.title || '');
    const [fTotal, setFTotal] = useState(initialData.totalAmount?.toString() || '');
    const [fPayer, setFPayer] = useState(initialData.payer || '');
    const [fParticipants, setFParticipants] = useState<ParticipantStatus[]>(
        initialData.participants || (initialData.participantNames || []).map((name: string) => ({ name, paid: false, paidAt: null }))
    );
    const [fDropdownOpen, setFDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setFDropdownOpen(false);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleParticipant = (name: string) => {
        if (fParticipants.some(p => p.name === name)) {
            setFParticipants(fParticipants.filter(p => p.name !== name));
        } else {
            setFParticipants([...fParticipants, { name, paid: name === fPayer, paidAt: name === fPayer ? new Date().toISOString() : null }]);
        }
    };

    const togglePaidStatus = (name: string) => {
        if (name === fPayer) return; 
        setFParticipants(fParticipants.map(p => {
            if (p.name === name) {
                const newPaid = !p.paid;
                return { ...p, paid: newPaid, paidAt: newPaid ? new Date().toISOString() : null };
            }
            return p;
        }));
    };

    const updatePaidDate = (name: string, dateValue: string) => {
        setFParticipants(fParticipants.map(p => {
            if (p.name === name) {
                return { ...p, paidAt: dateValue ? new Date(dateValue).toISOString() : null };
            }
            return p;
        }));
    }

    const handleSubmit = () => {
        const amount = parseInt(fTotal.replace(/\D/g, ''), 10);
        onSubmit({ date: fDate, title: fTitle, totalAmount: amount, payer: fPayer, participants: fParticipants });
    };

    const toLocalInputString = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return local.toISOString().slice(0, 16);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ngày</label>
                    <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Số tiền</label>
                    <input 
                      type="text" 
                      value={fTotal ? parseInt(fTotal).toLocaleString('vi-VN') : ''}
                      onChange={e => setFTotal(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-3 border rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
                      placeholder="0"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nội dung</label>
                <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white" placeholder="Món ăn/Cafe..."/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Người trả tiền</label>
                  <select value={fPayer} onChange={e => setFPayer(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none">
                      <option value="">--Chọn--</option>
                      {people.map((p: string) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thêm người tham gia</label>
                  <button onClick={() => setFDropdownOpen(!fDropdownOpen)} className="w-full p-3 border rounded-lg bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-200 transition-all">
                      <span className="truncate text-gray-600">
                          {fParticipants.length > 0 ? `${fParticipants.length} người được chọn` : 'Chọn thêm...'}
                      </span>
                      <ChevronDown className="w-4 h-4"/>
                  </button>
                  {fDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 animate-in zoom-in-95 duration-200">
                          {people.map((p: string) => (
                              <div key={p} onClick={() => toggleParticipant(p)}
                                   className={`flex justify-between p-3 hover:bg-gray-100 cursor-pointer rounded-lg ${fParticipants.some(fp => fp.name === p) ? 'text-gray-400 bg-gray-50' : 'text-gray-800'}`}>
                                  {p} {fParticipants.some(fp => fp.name === p) && <CheckCircle className="w-4 h-4"/>}
                              </div>
                          ))}
                      </div>
                  )}
                </div>
            </div>
            
            {/* Detailed Participant List with Paid Toggle */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Danh sách chia tiền ({fParticipants.length})</label>
                {fParticipants.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4 italic">Chưa chọn ai</div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {fParticipants.map(p => (
                            <div key={p.name} className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:border-blue-300">
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => toggleParticipant(p.name)} className="text-gray-300 hover:text-red-500 p-1"><XCircle className="w-4 h-4"/></button>
                                    <span className="font-medium text-sm">{p.name}</span>
                                    {p.name === fPayer && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Người trả</span>}
                                </div>
                                
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => !p.name.includes(fPayer) && togglePaidStatus(p.name)}>
                                        <label className={`text-[10px] font-bold cursor-pointer ${p.paid ? 'text-green-600' : 'text-red-500'}`}>
                                            {p.paid ? 'Đã trả' : 'Chưa trả'}
                                        </label>
                                        <input 
                                          type="checkbox" 
                                          checked={p.paid || p.name === fPayer} 
                                          disabled={p.name === fPayer}
                                          onChange={() => togglePaidStatus(p.name)}
                                          className="w-4 h-4 accent-green-600 cursor-pointer"
                                        />
                                    </div>
                                    
                                    {p.paid && p.name !== fPayer && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <input 
                                                type="datetime-local"
                                                value={toLocalInputString(p.paidAt)}
                                                onChange={(e) => updatePaidDate(p.name, e.target.value)}
                                                className="text-[10px] border border-gray-300 rounded px-1 py-0.5 w-auto text-gray-600 bg-gray-50 focus:bg-white outline-none focus:border-blue-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-2">
                <button onClick={handleSubmit} className="flex-1 bg-blue-800 text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all transform active:scale-[0.98] shadow-md">
                    {submitLabel}
                </button>
                {onCancel && (
                    <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition-all">
                        Hủy
                    </button>
                )}
            </div>
        </div>
    );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'entry' | 'debt_history' | 'report' | 'people'>('entry');
  const [showGuide, setShowGuide] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MealRecord | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedCreditor, setExpandedCreditor] = useState<string | null>(null);
  const [expandedReportRows, setExpandedReportRows] = useState<Record<string, boolean>>({});

  // --- AUTH ---
  useEffect(() => {
    if (!isFirebaseReady) return;
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            // Trường hợp chạy trong môi trường đặc biệt của Canvas
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  // --- REALTIME DATA SYNC ---
  useEffect(() => {
      if (!isFirebaseReady || !currentUser) return;

      // 1. Sync People
      const peopleUnsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), (docSnap) => {
          if (docSnap.exists()) {
              setPeople(docSnap.data().people || []);
          }
      });

      // 2. Sync Records
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'meals')); 
      const recordsUnsub = onSnapshot(q, (snapshot) => {
          const loadedRecords: MealRecord[] = [];
          snapshot.forEach((doc) => {
              loadedRecords.push({ id: doc.id, ...doc.data() } as MealRecord);
          });
          // Client sort (or add orderBy to query if index created)
          loadedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRecords(loadedRecords);
      });

      return () => {
          peopleUnsub();
          recordsUnsub();
      };
  }, [currentUser]);

  // --- HANDLERS ---
  const handleAddPerson = async (name: string) => {
    if (!isFirebaseReady) return alert("Vui lòng cấu hình Firebase trong code để lưu dữ liệu.");
    const trimmedName = name.trim();
    if (trimmedName && !people.includes(trimmedName)) {
        const newPeople = [...people, trimmedName];
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), { people: newPeople }, { merge: true });
        setNewPersonName('');
    }
  };

  const handleRemovePerson = async (name: string) => {
      if (!isFirebaseReady) return;
      if(confirm(`Xóa ${name}?`)) {
          const newPeople = people.filter(p => p !== name);
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), { people: newPeople }, { merge: true });
      }
  }

  const handleSaveRecord = async (record: any, isEdit: boolean) => {
     if (!isFirebaseReady) return alert("Vui lòng cấu hình Firebase!");
     if (!record.title || !record.totalAmount || !record.payer || record.participants.length === 0) {
         return alert('Vui lòng nhập đủ thông tin!');
     }

     const perPerson = Math.ceil(record.totalAmount / record.participants.length);
     
     const fullParticipants = record.participants.map((p: any) => ({
        name: p.name,
        paid: p.name === record.payer ? true : p.paid,
        paidAt: p.name === record.payer ? (p.paidAt || new Date().toISOString()) : (p.paid ? (p.paidAt || new Date().toISOString()) : null)
     }));

     const recordData = {
         createdAt: isEdit && editingRecord ? editingRecord.createdAt : Date.now(),
         date: record.date,
         title: record.title,
         totalAmount: record.totalAmount,
         perPersonAmount: perPerson,
         payer: record.payer,
         participants: fullParticipants
     };

     const docId = isEdit && editingRecord ? editingRecord.id : generateId();
     
     try {
         await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', docId), recordData);
         if (isEdit) setEditingRecord(null);
         else alert('Đã lưu thành công!');
     } catch (e) {
         alert('Lỗi lưu: ' + e);
     }
  };

  const handleDeleteRecord = async (id: string) => {
      if (!isFirebaseReady) return;
      if (confirm('Xóa giao dịch này?')) {
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', id));
      }
  }

  const handleTogglePaid = async (recordId: string, personName: string) => {
      if (!isFirebaseReady) return;
      const record = records.find(r => r.id === recordId);
      if (!record) return;

      const updatedParticipants = record.participants.map(p => {
          if (p.name !== personName) return p;
          const newPaid = !p.paid;
          return { ...p, paid: newPaid, paidAt: newPaid ? new Date().toISOString() : null };
      });

      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', recordId), { ...record, participants: updatedParticipants });
  };

  const handleMarkAllPaid = async (personName: string) => {
      if (!isFirebaseReady) return;
      if (!confirm(`Xác nhận ${personName} trả hết nợ?`)) return;
      const unpaidRecords = records.filter(r => r.payer !== personName && r.participants.some(p => p.name === personName && !p.paid));
      for (const record of unpaidRecords) {
          const updatedParticipants = record.participants.map(p => {
              if (p.name === personName) return { ...p, paid: true, paidAt: new Date().toISOString() };
              return p;
          });
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', record.id), { ...record, participants: updatedParticipants });
      }
  };

  const toggleReportRow = (name: string) => setExpandedReportRows(prev => ({ ...prev, [name]: !prev[name] }));

  // --- CALCULATION LOGIC (Same as before) ---
  const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
  const totalFilteredSpent = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  const getNetBalances = () => {
    const balances: Record<string, any> = {};
    people.forEach(p => balances[p] = { owed: 0, debt: 0, net: 0, meals: [] });
    filteredRecords.forEach(r => {
       r.participants.forEach(p => {
          if (balances[p.name]) balances[p.name].meals.push({ id: r.id, date: r.date, title: r.title, amount: r.perPersonAmount, isPaid: p.paid });
          if (p.name !== r.payer && !p.paid) {
             if (balances[p.name]) balances[p.name].debt += r.perPersonAmount;
             if (balances[r.payer]) balances[r.payer].owed += r.perPersonAmount;
          }
       });
    });
    Object.keys(balances).forEach(key => { balances[key].net = balances[key].owed - balances[key].debt; });
    return Object.entries(balances).map(([name, val]) => ({ name, ...val }));
  };

  const netBalances = getNetBalances();
  const creditors = netBalances.filter(x => x.net > 0).sort((a, b) => b.net - a.net);
  const debtors = netBalances.filter(x => x.net < 0).sort((a, b) => a.net - b.net);
  
  const spendingByPerson = people.map(person => {
      const value = filteredRecords.reduce((sum, r) => {
          const p = r.participants.find(pt => pt.name === person);
          return sum + (p ? r.perPersonAmount : 0);
      }, 0);
      return { name: person, value };
  }).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

  const debtSummaryData = netBalances.map(nb => ({ name: nb.name, net: nb.net }));
  
  const historyByDate = filteredRecords.reduce((acc: any, record) => {
        const d = record.date;
        if (!acc[d]) acc[d] = []; acc[d].push(record); return acc;
    }, {});
  const sortedHistoryDates = Object.keys(historyByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="min-h-screen font-sans flex flex-col text-gray-800 bg-gray-50">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-enter { animation: fadeInUp 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <header className="text-white p-4 shadow-lg sticky top-0 z-30 transition-all" style={{ backgroundColor: THEME_COLOR }}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
            <div>
                <h1 className="text-lg font-bold uppercase tracking-wide leading-tight flex items-center gap-1">Sổ Ăn Uống <span className="text-yellow-400 text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">Online</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
              {!isFirebaseReady && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded animate-pulse">Thiếu Config Firebase</span>}
              <button onClick={() => setShowGuide(true)} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                <BookOpen className="w-5 h-5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">HƯỚNG DẪN</span>
              </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white shadow-sm sticky top-[72px] z-20 border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar snap-x">
           {[{ id: 'entry', icon: Plus, label: 'Nhập Liệu' }, { id: 'debt_history', icon: LayoutList, label: 'Theo Dõi' }, { id: 'report', icon: PieChart, label: 'Báo Cáo' }, { id: 'people', icon: Users, label: 'Thành Viên' }].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[25%] sm:min-w-[auto] flex flex-col items-center justify-center py-3 px-1 text-xs font-semibold transition-all border-b-4 duration-300 snap-start ${activeTab === tab.id ? `border-[${THEME_COLOR}] text-[${THEME_COLOR}] bg-blue-50/60` : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`} style={activeTab === tab.id ? { color: THEME_COLOR, borderColor: THEME_COLOR } : {}}>
               <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'transform scale-110' : ''} transition-transform`} />{tab.label}
             </button>
           ))}
        </nav>
      </div>

      <main className="max-w-5xl mx-auto w-full p-3 sm:p-4 pb-24 flex-1">
        {!isFirebaseReady && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm">
                <div className="flex">
                    <div className="flex-shrink-0"><AlertCircle className="h-5 w-5 text-yellow-400" /></div>
                    <div className="ml-3"><p className="text-sm text-yellow-700">Bạn chưa cài đặt Firebase Config. Vui lòng mở file code và dán config vào biến <b>firebaseConfig</b> ở dòng 23.</p></div>
                </div>
            </div>
        )}

        {/* TAB 1: ENTRY */}
        {activeTab === 'entry' && (
          <div className="animate-enter max-w-2xl mx-auto">
            <AnimatedCard className="p-4 sm:p-6">
              <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}><Plus className="w-6 h-6" /> Ghi Nhận Chi Tiêu</h3>
              <RecordForm initialData={{}} people={people} onSubmit={(data: any) => handleSaveRecord(data, false)} submitLabel="LƯU GIAO DỊCH" />
            </AnimatedCard>
          </div>
        )}

        {/* TAB 2: DEBT & HISTORY */}
        {activeTab === 'debt_history' && (
          <div className="space-y-6 animate-enter">
             <AnimatedCard className="p-4 flex flex-col md:flex-row gap-4 border-l-4 border-blue-500 items-center sticky top-[130px] z-10 shadow-md">
                <div className="flex flex-col sm:flex-row gap-2 items-center flex-1 w-full">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0"><Filter className="w-4 h-4 text-gray-500"/><span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Lọc từ:</span></div>
                    <div className="flex items-center gap-2 w-full">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/>
                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0"/>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/>
                    </div>
                </div>
             </AnimatedCard>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* CREDITORS */}
                <AnimatedCard className="overflow-hidden border-green-100">
                    <div className="bg-green-50/80 p-4 border-b border-green-100 flex items-center justify-between backdrop-blur-sm">
                        <h4 className="font-bold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> CẦN THU VỀ</h4>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded text-green-700 border border-green-200">Đã ứng</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {creditors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản cần thu.</div>}
                        {creditors.map(item => (
                            <div key={item.name} className="p-4 bg-white transition-colors hover:bg-green-50/20">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedCreditor(expandedCreditor === item.name ? null : item.name)}>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">{item.name}</div>
                                        <div className="text-xs text-green-600 flex items-center gap-1 font-medium mt-1">
                                            {expandedCreditor === item.name ? 'Thu gọn' : 'Xem chi tiết'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedCreditor === item.name ? 'rotate-180' : ''}`}/>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-600 text-lg">+{formatCurrency(item.net)}</span>
                                </div>
                                {expandedCreditor === item.name && (
                                    <div className="mt-3 pt-3 border-t border-green-100 text-sm space-y-2 animate-enter">
                                        {filteredRecords.map(r => {
                                             if (r.payer === item.name) {
                                                 const unpaid = r.participants.filter(p => !p.paid && p.name !== item.name);
                                                 if (unpaid.length > 0) return (
                                                     <div key={r.id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1">
                                                         <div className="flex-1 pr-2">
                                                             <div className="font-medium text-gray-700">{r.title}</div>
                                                             <div className="text-[10px] text-gray-400">{formatShortDate(r.date)}</div>
                                                             <div className="text-[11px] text-red-500 font-medium mt-0.5">Chưa trả: {unpaid.map(p => p.name).join(', ')}</div>
                                                         </div>
                                                         <div className="font-medium text-green-600 text-right whitespace-nowrap">+{formatCurrency(r.perPersonAmount * unpaid.length)}</div>
                                                     </div>
                                                 )
                                             }
                                             return null;
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedCard>

                {/* DEBTORS */}
                <AnimatedCard className="overflow-hidden border-red-100">
                    <div className="bg-red-50/80 p-4 border-b border-red-100 flex items-center justify-between backdrop-blur-sm">
                        <h4 className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-5 h-5" /> CẦN PHẢI TRẢ</h4>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded text-red-700 border border-red-200">Chưa đóng</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {debtors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản nợ.</div>}
                        {debtors.map(item => (
                            <div key={item.name} className="p-4 bg-white transition-colors hover:bg-red-50/10">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedPerson(expandedPerson === item.name ? null : item.name)}>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">{item.name}</div>
                                        <div className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1">
                                            {expandedPerson === item.name ? 'Thu gọn' : 'Xem & Trả nợ'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedPerson === item.name ? 'rotate-180' : ''}`}/>
                                        </div>
                                    </div>
                                    <span className="font-bold text-red-600 text-lg">{formatCurrency(Math.abs(item.net))}</span>
                                </div>
                                {expandedPerson === item.name && (
                                    <div className="mt-4 space-y-4 animate-enter">
                                        <div className="bg-red-50 rounded p-2 text-sm border border-red-100">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-200">
                                                <span className="text-[10px] font-bold text-red-800 uppercase">Chưa trả</span>
                                                <button onClick={() => handleMarkAllPaid(item.name)} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 uppercase font-bold">Trả hết ngay</button>
                                            </div>
                                            {filteredRecords.map(r => {
                                                const p = r.participants.find(part => part.name === item.name);
                                                if (p && !p.paid && r.payer !== item.name) return (
                                                    <div key={r.id} className="flex justify-between items-center py-2 border-b border-red-100/50 last:border-0 hover:bg-white rounded px-1 transition-colors">
                                                        <div className="flex-1 pr-2">
                                                            <div className="font-medium text-gray-800">{r.title}</div>
                                                            <div className="text-[10px] text-gray-500">{formatShortDate(r.date)} • Ứng: <b>{r.payer}</b></div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span>
                                                            <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" onChange={() => handleTogglePaid(r.id, item.name)}/>
                                                        </div>
                                                    </div>
                                                )
                                                return null;
                                            })}
                                        </div>
                                        <div className="bg-gray-50 rounded p-2 text-sm border border-gray-200">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-2 border-b pb-1">Lịch sử đã trả</div>
                                            {filteredRecords.map(r => {
                                                const p = r.participants.find(part => part.name === item.name);
                                                if (p && p.paid && r.payer !== item.name) return (
                                                    <div key={r.id} className="flex justify-between items-center py-1.5 opacity-70 hover:opacity-100 border-b border-gray-100 last:border-0">
                                                        <div className="flex-1 pr-2">
                                                            <div className="font-medium text-gray-600 line-through decoration-gray-400">{r.title}</div>
                                                            <div className="text-[9px] text-blue-600">Đã trả: {p.paidAt ? formatDateTime(p.paidAt) : '---'}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500 text-xs line-through whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span>
                                                            <input type="checkbox" checked={true} className="w-4 h-4 accent-gray-400 cursor-pointer" onChange={() => handleTogglePaid(r.id, item.name)}/>
                                                        </div>
                                                    </div>
                                                )
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
             </div>

             <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2"><History className="w-6 h-6 text-blue-600"/> Nhật Ký Giao Dịch</h3>
                     <div className="flex flex-wrap items-center gap-3 bg-white rounded-full px-4 py-1.5 border shadow-sm text-xs mt-2 md:mt-0">
                         <span className="flex items-center gap-1 font-bold text-green-700"><CheckCircle className="w-3 h-3"/> Xanh = Đã trả</span>
                         <span className="w-[1px] h-3 bg-gray-300"></span>
                         <span className="flex items-center gap-1 text-gray-500">Xám = Chưa trả</span>
                     </div>
                 </div>
                 {sortedHistoryDates.map(date => (
                     <div key={date} className="relative pl-4 sm:pl-6 border-l-2 border-blue-200 ml-2 pb-6 last:pb-0">
                         <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                         <div className="mb-4">
                             <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm">{formatDayOfWeek(date)}, {formatDate(date)}</div>
                             <div className="space-y-4">
                                 {historyByDate[date].map((record: any, rIdx: number) => (
                                     <AnimatedCard key={record.id} className="p-4 hover:border-blue-300 relative group border-l-4 border-l-transparent hover:border-l-blue-500 transition-all" delay={rIdx * 0.05}>
                                         <div className="flex justify-between items-start mb-2"> 
                                             <div>
                                                 <h4 className="font-bold text-gray-800 text-base">{record.title}</h4>
                                                 <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                                     <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100 whitespace-nowrap">{record.payer} chi</span>
                                                     <ArrowRight className="w-3 h-3 text-gray-300 hidden sm:block"/>
                                                     <span className="text-xs">{record.participants.length} người</span>
                                                 </div>
                                             </div>
                                             <div className="text-right pl-2">
                                                 <div className="font-bold text-lg text-gray-800 whitespace-nowrap">{formatCurrency(record.totalAmount)}</div>
                                                 <div className="text-xs text-gray-500 font-medium whitespace-nowrap">~{formatCurrency(record.perPersonAmount)}</div>
                                             </div>
                                         </div>
                                         <div className="flex flex-wrap gap-2 mt-3 mb-4">
                                             {record.participants.map((p: any) => (
                                                 <div key={p.name} className={`px-2 py-1 rounded border text-xs flex items-center gap-1 transition-colors cursor-help ${p.paid ? 'bg-green-50 text-green-700 border-green-200 font-bold shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`} title={p.paid && p.paidAt ? `Đã trả lúc: ${formatDateTime(p.paidAt)}` : 'Chưa trả'}>
                                                     {p.name} {p.paid && <CheckCircle className="w-3 h-3"/>}
                                                 </div>
                                             ))}
                                         </div>
                                         <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                             <button onClick={() => setEditingRecord(record)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors"><Edit3 className="w-3 h-3"/> Sửa</button>
                                             <button onClick={() => handleDeleteRecord(record.id)} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"><Trash2 className="w-3 h-3"/> Xóa</button>
                                         </div>
                                     </AnimatedCard>
                                 ))}
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        )}

        {/* TAB 4: REPORT */}
        {activeTab === 'report' && (
          <div className="space-y-6 animate-enter">
             <AnimatedCard className="p-4 flex flex-col md:flex-row items-end gap-4">
                <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wide">Từ ngày</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"/>
                </div>
                <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wide">Đến ngày</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"/>
                </div>
                <div className="w-full md:flex-1 text-right mt-2 md:mt-0">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng chi tiêu (Lọc)</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(totalFilteredSpent)}</div>
                </div>
             </AnimatedCard>

             {filteredRecords.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatedCard className="p-4 h-72">
                        <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Tỷ trọng chi tiêu</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <RePieChart>
                                <Pie data={spendingByPerson} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5}>
                                    {spendingByPerson.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '11px'}}/>
                            </RePieChart>
                        </ResponsiveContainer>
                    </AnimatedCard>
                    <AnimatedCard className="p-4 h-72">
                        <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Biểu đồ Công nợ</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={debtSummaryData} margin={{top: 5, right: 5, left: -10, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11}} dy={10} />
                                <YAxis tick={{fontSize: 11}} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                                <Bar dataKey="net" radius={[4, 4, 4, 4]} barSize={30}>
                                    {debtSummaryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.net > 0 ? '#10b981' : '#ef4444'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </AnimatedCard>
                </div>
             )}

             <AnimatedCard className="p-4 sm:p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h4 className="font-bold text-gray-700 uppercase flex items-center gap-2"><FileText className="w-4 h-4"/> Bảng Tổng Hợp</h4>
                    <button onClick={() => { const lines = netBalances.map(nb => `${nb.name}: ${formatCurrency(nb.net)}`).join('\n'); copyToClipboard(lines); alert('Đã copy!'); }} className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded font-medium transition-colors w-full sm:w-auto justify-center"><Copy className="w-3 h-3"/> Copy nội dung</button>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left border-collapse min-w-[500px] sm:min-w-0">
                         <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                             <tr><th className="px-4 py-3 border-b w-[40%]">Thành viên</th><th className="px-4 py-3 border-b text-right">Dư nợ</th><th className="px-4 py-3 border-b text-right">Chi tiết</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {netBalances.map(nb => (
                                 <React.Fragment key={nb.name}>
                                     <tr className="hover:bg-gray-50 cursor-pointer group" onClick={() => toggleReportRow(nb.name)}>
                                         <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2"><div className={`p-1 rounded-full transition-transform duration-200 ${expandedReportRows[nb.name] ? 'rotate-90 bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}><ChevronRight className="w-4 h-4"/></div>{nb.name}</td>
                                         <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${nb.net > 0 ? 'text-green-600' : (nb.net < 0 ? 'text-red-600' : 'text-gray-400')}`}>{nb.net > 0 ? '+' : ''}{formatCurrency(nb.net)}</td>
                                         <td className="px-4 py-3 text-right text-gray-400 text-xs">{nb.meals.length} bữa ăn (Xem)</td>
                                     </tr>
                                     {expandedReportRows[nb.name] && (
                                         <tr className="bg-gray-50/50 animate-in fade-in"><td colSpan={3} className="px-4 py-3 pl-4 sm:pl-12"><div className="text-[11px] uppercase font-bold text-gray-400 mb-2">Lịch sử tham gia:</div>{nb.meals.length > 0 ? (<div className="space-y-2">{nb.meals.map((m, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-xs shadow-sm"><div className="flex gap-2 sm:gap-3 flex-1 overflow-hidden"><span className="font-mono text-gray-500 whitespace-nowrap">{formatShortDate(m.date)}</span><span className="font-medium text-gray-700 truncate">{m.title}</span></div><div className="flex items-center gap-2 pl-2">{m.isPaid ? <span className="text-green-600 flex items-center gap-1 font-bold bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap hidden sm:flex"><CheckCircle className="w-3 h-3"/> Đã trả</span> : <span className="text-gray-400 italic whitespace-nowrap hidden sm:inline">Chưa trả</span>}<span className="font-bold text-gray-800 w-[60px] text-right">{formatCurrency(m.amount)}</span></div></div>))}</div>) : <div className="text-xs text-gray-400 italic">Chưa tham gia bữa nào.</div>}</td></tr>
                                     )}
                                 </React.Fragment>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </AnimatedCard>
          </div>
        )}

        {/* TAB 5: PEOPLE */}
        {activeTab === 'people' && (
          <div className="animate-enter max-w-3xl mx-auto">
             <AnimatedCard className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                    <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: THEME_COLOR }}><Users className="w-6 h-6" /> Danh Sách Thành Viên</h3>
                </div>
                <div className="flex gap-2 mb-6">
                    <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Nhập tên thành viên..." className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all" onKeyDown={(e) => e.key === 'Enter' && handleAddPerson(newPersonName)}/>
                    <button onClick={() => handleAddPerson(newPersonName)} className="text-white px-5 rounded-lg font-bold hover:opacity-90 transition-all shadow-md active:scale-95" style={{ backgroundColor: THEME_COLOR }}><Plus className="w-5 h-5" /></button>
                </div>
                {people.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl"><Users className="w-12 h-12 mx-auto mb-2 opacity-20"/>Chưa có thành viên nào.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {people.map((person, idx) => (
                            <div key={person} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-all group" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <span className="font-medium flex items-center gap-3 text-gray-700">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 flex items-center justify-center text-sm font-bold shadow-sm">{person.charAt(0)}</div>{person}
                                </span>
                                <button onClick={() => handleRemovePerson(person)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
             </AnimatedCard>
          </div>
        )}
      </main>

      {/* EDIT MODAL */}
      {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-600"/> Chỉnh Sửa Giao Dịch</h3>
                      <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                      <RecordForm initialData={{...editingRecord, participants: editingRecord.participants}} people={people} onSubmit={(data: any) => handleSaveRecord(data, true)} onCancel={() => setEditingRecord(null)} submitLabel="CẬP NHẬT NGAY" />
                  </div>
              </div>
          </div>
      )}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default App;