import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  User, 
  Star, 
  BookOpen, 
  FlaskConical, 
  Wrench, 
  ShoppingBag,
  X,
  Send,
  ChevronRight,
  Info,
  RefreshCw,
  Heart,
  MessageCircle,
  Inbox,
  ArrowLeft
} from 'lucide-react';

// --- FIREBASE INITIALIZATION SAFETY ---
let db, auth, appId;
try {
  const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  appId = typeof __app_id !== 'undefined' ? __app_id : 'vidya-loop-institutional';
} catch (e) {
  console.error("Firebase config missing or invalid:", e);
}

const DEFAULT_ASSETS = [
  { id: 1, title: "Engineering Drawing & Drafting Kit", price: 450, category: "Tools", type: "Sell", image: "https://i0.wp.com/www.shopatprince.com/wp-content/uploads/2020/01/20200004.jpg?fit=512%2C512&ssl=1", rating: 4.8, seller: "IU-2024-A" },
  { id: 2, title: "Professional Grade Laboratory Apparel", price: 150, category: "Lab Gear", type: "Rent", unit: "/Day", image: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&q=80&w=400", rating: 4.5, seller: "IU-2024-B" },
  { id: 3, title: "S1 Textbooks", price: 150, category: "Textbook", type: "Rent", unit: "/Day", image: "https://preview.redd.it/s4wfed4t5ga21.jpg?width=1080&crop=smart&auto=webp&s=dac789f8e4a75a803fb98c69a451a847d250cbe1", rating: 4.9, seller: "IU-2024-C" }
];

const CATEGORIES = [
  { name: 'All', label: 'Comprehensive', icon: <ShoppingBag size={16} /> },
  { name: 'Tools', label: 'Technical Implements', icon: <Wrench size={16} /> },
  { name: 'Lab Gear', label: 'Laboratory Apparatus', icon: <FlaskConical size={16} /> },
  { name: 'Textbook', label: 'Scholarly Publications', icon: <BookOpen size={16} /> },
];

export default function App() {
  // --- APPLICATION STATE ---
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('vloop_institutional_assets');
    return saved ? JSON.parse(saved) : DEFAULT_ASSETS;
  });
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Chatbox State (Primary fix for visibility)
  const [isChatboxOpen, setIsChatboxOpen] = useState(false);
  const [activeNegotiation, setActiveNegotiation] = useState(null); 
  const [chatMode, setChatMode] = useState('inbox'); 
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  const [formData, setFormData] = useState({ title: '', price: '', category: 'Tools', image: '' });

  // --- AUTHENTICATION ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth failed:", err); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('vloop_institutional_assets', JSON.stringify(products));
  }, [products]);

  // --- REAL-TIME CHAT SYNC ---
  useEffect(() => {
    if (!user || !activeNegotiation || chatMode !== 'negotiation' || !db) return;

    const chatRef = collection(db, 'artifacts', appId, 'public', 'data', `negotiations_${activeNegotiation.id}`);
    const q = query(chatRef);
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => console.error("Firestore Permission/Sync Error:", err));

    return () => unsubscribe();
  }, [user, activeNegotiation, chatMode]);

  // --- HANDLERS ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeNegotiation || !db) return;

    try {
      const chatRef = collection(db, 'artifacts', appId, 'public', 'data', `negotiations_${activeNegotiation.id}`);
      await addDoc(chatRef, {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) { console.error("Transmission Error:", err); }
  };

  const handleNewListing = (e) => {
    e.preventDefault();
    const newItem = { id: Date.now(), ...formData, type: "Sell", rating: 5.0, seller: user?.uid?.substring(0,6) || "IU-ANON" };
    setProducts([newItem, ...products]);
    setIsModalOpen(false);
    setFormData({ title: '', price: '', category: 'Tools', image: '' });
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch = activeCategory === 'All' || p.category === activeCategory;
      return searchMatch && categoryMatch;
    });
  }, [searchQuery, activeCategory, products]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* 1. NAVIGATION */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100 transition-transform hover:rotate-12">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic text-slate-800">Vidya Loop</span>
          </div>

          <div className="relative w-full md:w-96 group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Query institutional assets..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-100/50 border-none rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-4 items-center">
            {/* Nav Message Trigger */}
            <button 
              onClick={() => { setChatMode('inbox'); setIsChatboxOpen(true); }}
              className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all relative group"
            >
              <MessageSquare size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all sm:flex items-center gap-2 hidden active:scale-95"
            >
              <Plus size={18} /> Register Asset
            </button>
            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 transition-colors">
              <User size={20} />
            </div>
          </div>
        </div>
      </nav>

      {/* 2. HERO COMPONENT */}
      <header className="max-w-4xl mx-auto px-6 py-16 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-indigo-100">
          <Star size={12} fill="currentColor" /> Verified Institutional Network
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight italic text-slate-900">Vidya Loop.</h1>
        <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          The verified collegiate resource exchange. Sustainable asset sharing within a secured institutional network. Safe, simple, and verified.
        </p>
      </header>

      {/* 3. ASSET GRID */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-12 pb-2">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeCategory === cat.name 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-0.5' 
                : 'bg-white border border-slate-200 text-slate-400 hover:border-indigo-600 shadow-sm'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[2.8rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 p-4">
              <div className="relative h-56 mb-5 overflow-hidden rounded-[2rem] bg-slate-50 shadow-inner">
                <img src={product.image || "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                <div className="absolute top-4 left-4">
                  <span className="px-3.5 py-1.5 bg-white/95 backdrop-blur-md text-indigo-600 text-[10px] font-black uppercase rounded-xl shadow-sm tracking-widest border border-slate-100">
                    {product.category}
                  </span>
                </div>
                <button className="absolute top-4 right-4 p-2.5 bg-white/95 backdrop-blur-md rounded-xl text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                  <Heart size={16} />
                </button>
              </div>
              
              <div className="px-2">
                <div className="flex justify-between items-start mb-2 min-h-[48px]">
                  <h3 className="font-bold text-lg text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{product.title}</h3>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    <Star size={10} fill="#F59E0B" stroke="#F59E0B" />
                    <span className="text-[10px] font-black text-amber-700">{product.rating}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-5 border-t border-slate-100/60">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Valuation</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900 tracking-tighter italic">₹{product.price}</span>
                      {product.unit && <span className="text-[10px] text-slate-400 font-black uppercase">{product.unit}</span>}
                    </div>
                  </div>
                  {/* Card Chat Trigger */}
                  <button 
                    onClick={() => { setActiveNegotiation(product); setChatMode('negotiation'); setIsChatboxOpen(true); }}
                    className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                  >
                    {product.type === 'Sell' ? 'Examine Details' : 'Lease Asset'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 4. CHAT SIDEBAR (FIXED Z-INDEX) */}
      {isChatboxOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div onClick={() => setIsChatboxOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {chatMode === 'negotiation' && (
                    <button onClick={() => setChatMode('inbox')} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"><ArrowLeft size={18} /></button>
                  )}
                  <h3 className="text-xl font-black italic text-slate-900 tracking-tight">
                    {chatMode === 'inbox' ? 'Institutional Inbox' : 'Negotiation'}
                  </h3>
                </div>
                <button onClick={() => setIsChatboxOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X size={20} /></button>
              </div>
              {chatMode === 'negotiation' && (
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Re: {activeNegotiation?.title}</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/40 no-scrollbar">
              {chatMode === 'inbox' ? (
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Active Reconciliations</div>
                  {products.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setActiveNegotiation(p); setChatMode('negotiation'); }}
                      className="bg-white p-5 rounded-[1.8rem] border border-slate-100 flex items-center gap-4 cursor-pointer hover:border-indigo-200 hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-300"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50">
                        <img src={p.image} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate mb-1">{p.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Negotiation Active • ₹{p.price}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-24 opacity-30">
                      <div className="w-20 h-20 bg-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><Inbox size={40} /></div>
                      <p className="text-xs font-black uppercase tracking-[0.2em]">Zero dialogue recorded.</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[85%] px-5 py-4 rounded-[1.6rem] text-xs font-semibold shadow-sm leading-relaxed ${
                        msg.senderId === user?.uid 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            {chatMode === 'negotiation' && (
              <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-100 bg-white shadow-lg">
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Type dialogue..." 
                    className="flex-1 bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="bg-indigo-600 text-white w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all">
                    <Send size={20} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (BACKUP TRIGGER) */}
      {!isChatboxOpen && (
        <button 
          onClick={() => { setChatMode('inbox'); setIsChatboxOpen(true); }}
          className="fixed bottom-10 right-10 w-16 h-16 bg-slate-900 text-white rounded-[1.8rem] shadow-2xl flex items-center justify-center hover:bg-indigo-600 transition-all hover:-translate-y-2 z-[150] group active:scale-90"
        >
          <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-4 border-slate-50 flex items-center justify-center animate-bounce">1</span>
        </button>
      )}

      {/* 5. ASSET MODAL (UNCHANGED) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 relative animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-1 italic text-slate-800 tracking-tight">Verified Registration Portal</h2>
            <form className="space-y-6 mt-8" onSubmit={handleNewListing}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Nomenclature</label>
                <input type="text" required className="w-full bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Valuation (INR)</label>
                  <input type="number" required className="w-full bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Classification</label>
                  <select className="w-full bg-slate-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all appearance-none cursor-pointer" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option value="Tools">Technical Implements</option>
                    <option value="Lab Gear">Laboratory Apparatus</option>
                    <option value="Textbook">Scholarly Publications</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all mt-6 active:scale-95">Finalize Institutional Entry</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}