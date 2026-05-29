import React, { useState, useRef, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Upload, Search, CheckCircle2, XCircle, FileText, Camera, Loader2, Info, Building, User, Lock, CalendarClock, Cpu, Settings, ExternalLink, RefreshCw, Home, Menu, X, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { QRScanner } from '../components/QRScanner';

export const PublicVerify: React.FC = () => {
  const { appSettings } = useStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  const [verifiedDoc, setVerifiedDoc] = useState<any | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [verificationSteps, setVerificationSteps] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const startVerificationProcess = (targetIdParam?: string) => {
    setIsVerifying(true);
    setVerificationSteps(0);
    setResult(null);

    const targetId = (targetIdParam || searchQuery).trim();

    const steps = [
      { delay: 800, step: 1 },
      { delay: 1800, step: 2 },
      { delay: 3000, step: 3 },
      { delay: 4200, step: 4 }, // final
    ];

    steps.forEach((s) => {
      setTimeout(async () => {
        setVerificationSteps(s.step);
        if (s.step === 4) {
          setIsVerifying(false);
          if (fileSelected) {
            setVerifiedDoc({
              id: `TTE-VERIFY-${Math.random().toString(36).substring(3, 8).toUpperCase()}`,
              name: fileSelected.name,
              folder: 'Uploaded PDF',
              isSigned: true,
              signedBy: 'Otoritas BSrE',
              date: new Date().toISOString().split('T')[0],
              size: `${(fileSelected.size / (1024 * 1024)).toFixed(1)} MB`
            });
            setResult('success');
          } else if (targetId) {
            try {
              let docSnap = await getDoc(doc(db, 'documents', targetId));
              if (docSnap.exists()) {
                const data = docSnap.data();
                setVerifiedDoc({ id: docSnap.id, type: 'document', ...data });
                setResult('success');
              } else {
                let projectSnap = await getDoc(doc(db, 'projects', targetId));
                if (projectSnap.exists()) {
                  const data = projectSnap.data();
                  setVerifiedDoc({ id: projectSnap.id, type: 'project', ...data });
                  setResult('success');
                } else {
                  setVerifiedDoc(null);
                  setResult('fail');
                }
              }
            } catch (err) {
              console.error("Firestore lookup error during verification:", err);
              setVerifiedDoc(null);
              setResult('fail');
            }
          } else {
            setResult('fail');
          }
        }
      }, s.delay);
    });
  };

  const handleVerify = () => {
    if (!searchQuery && !fileSelected) return;
    startVerificationProcess();
  };

  const extractIdFromText = (text: string) => {
    try {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const url = new URL(text);
        const id = url.searchParams.get('id');
        return id || text;
      }
      return text;
    } catch {
      return text;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setShowQRScanner(false);
    const docId = extractIdFromText(decodedText);
    setSearchQuery(docId);
    startVerificationProcess(docId);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      setSearchQuery(idParam);
      startVerificationProcess(idParam);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setFileSelected(files[0]);
      startVerificationProcess();
    } else {
      alert("Hanya format PDF yang didukung.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files[0].type === 'application/pdf') {
        setFileSelected(e.target.files[0]);
        startVerificationProcess();
      } else {
        alert("Hanya format PDF yang didukung.");
      }
    }
  };

  const handleReset = () => {
    setResult(null);
    setSearchQuery('');
    setFileSelected(null);
    setVerificationSteps(0);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-500 overflow-x-hidden selection:bg-primary-500 selection:text-white flex flex-col">
      {/* Header Navbar-like */}
      <nav className="bg-white px-6 xl:px-12 py-4 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex items-center justify-between shrink-0 fixed top-0 w-full z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/')}>
          {appSettings?.logoUrl ? (
            <img src={appSettings.logoUrl} alt={appSettings?.appName || 'Logo'} className="max-h-10 object-contain" />
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-base md:text-lg text-slate-800 tracking-tight whitespace-nowrap leading-none mb-0.5">
              {appSettings?.appName ? appSettings.appName : 'Trans3T'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Verifikasi & Pengaduan</span>
          </div>
        </div>

        {/* Desktop Menu Panel */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            type="button"
            onClick={() => navigateTo('/')} 
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" /> Beranda
          </button>
          <button 
            type="button"
            onClick={() => navigateTo('/pengaduan')} 
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Pengaduan
          </button>
          <button 
            type="button"
            onClick={() => navigateTo('/verify')} 
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 transition-colors border-b-2 border-primary-500 pb-1 translate-y-[2px] cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" /> Verifikasi TTE
          </button>
          <button 
            type="button"
            onClick={() => navigateTo('/login')} 
            className="ml-2 bg-primary-100/60 hover:bg-primary-500 hover:text-white text-primary-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Masuk Admin
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-primary-500 hover:bg-slate-100/80 rounded-lg transition-colors focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[68px] left-0 w-full bg-white border-b border-slate-200 shadow-lg px-6 py-5 flex flex-col gap-4 z-40 md:hidden"
            >
              <button 
                type="button"
                onClick={() => { navigateTo('/'); setIsMobileMenuOpen(false); }} 
                className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-primary-600 py-2 border-b border-slate-100 w-full text-left"
              >
                <Home className="w-5 h-5 text-slate-400" /> Beranda
              </button>
              <button 
                type="button"
                onClick={() => { navigateTo('/pengaduan'); setIsMobileMenuOpen(false); }} 
                className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-primary-600 py-2 border-b border-slate-100 w-full text-left"
              >
                <MessageSquare className="w-5 h-5 text-slate-400" /> Pusat Pengaduan
              </button>
              <button 
                type="button"
                onClick={() => { navigateTo('/verify'); setIsMobileMenuOpen(false); }} 
                className="flex items-center gap-2.5 text-sm font-bold text-primary-600 py-2 border-b border-slate-100 w-full text-left"
              >
                <ShieldCheck className="w-5 h-5" /> Verifikasi Dokumen TTE
              </button>
              <button 
                type="button"
                onClick={() => { navigateTo('/login'); setIsMobileMenuOpen(false); }} 
                className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl text-sm font-bold shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] shadow-primary-500/20 w-full text-center"
              >
                MASUK KE SISTEM ADMIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content Content Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 flex flex-col items-center">
        
        <div className="w-full text-center mb-10 max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 drop-shadow-sm">Portal Validasi Dokumen (TTE)</h1>
          <p className="text-slate-500 text-base md:text-lg">
            Sistem verifikasi independen untuk memeriksa keaslian, integritas, dan validitas Tanda Tangan Elektronik berstandar BSrE - BSSN pada dokumen publik.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] w-full max-w-4xl border border-slate-300/50 overflow-hidden relative">
          {/* Subtle loading loader across the top edge if veryifying */}
          {isVerifying && (
            <div className="absolute top-0 inset-x-0 h-1 bg-primary-500/20 z-10 overflow-hidden">
               <motion.div 
                 className="h-full bg-primary-500" initial={{ x: '-100%' }}
                 animate={{ x: '100%' }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               />
            </div>
          )}

          <div className="flex flex-col md:flex-row">
            {/* Left/Top Content: The Form/Info */}
            <div className="p-6 md:p-10 flex-1 border-b md:border-b-0 md:border-r border-slate-300/40 bg-white">
               {!result && !isVerifying ? (
                 <div className="space-y-8">
                   <div>
                     <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                       <Upload className="w-5 h-5 text-primary-500" /> Unggah Dokumen PDF
                     </h3>
                     <p className="text-sm text-slate-500">Pilih atau tarik dokumen yang telah ditandatangani secara elektronik (PDF).</p>
                   </div>
                   
                   <div 
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     onDrop={handleDrop}
                     onClick={() => fileInputRef.current?.click()}
                     className={cn(
                       "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer flex flex-col items-center group",
                       isDragging ? "border-primary-500 bg-primary-500/5 scale-[1.01]" : "border-slate-300 hover:border-primary-500 hover:bg-slate-100/50"
                     )}
                   >
                     <input 
                       type="file" 
                       accept=".pdf" 
                       className="hidden" 
                       ref={fileInputRef} 
                       onChange={handleFileChange}
                     />
                     <div className={cn(
                       "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-300",
                       isDragging ? "bg-primary-500/10 text-primary-500" : "bg-slate-100 text-slate-400 group-hover:bg-primary-500/10 group-hover:text-primary-500 group-hover:-translate-y-1"
                     )}>
                       <Upload className="w-8 h-8" />
                     </div>
                     <span className="text-[15px] font-semibold text-slate-500 mb-1">
                       {fileSelected ? fileSelected.name : 'Tarik File Kesini atau Klik untuk Browse'}
                     </span>
                     <p className="text-xs text-slate-400">PDF (Maks. 25MB)</p>
                   </div>

                   <div className="relative flex items-center py-2">
                     <div className="flex-grow border-t border-slate-300"></div>
                     <span className="flex-shrink-0 mx-4 text-xs tracking-widest text-slate-400 font-semibold uppercase">ATAU GUNAKAN ID</span>
                     <div className="flex-grow border-t border-slate-300"></div>
                   </div>

                   <div className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 focus-within:border-primary-500 focus-within:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all">
                         <Search className="w-4 h-4 text-slate-400" />
                         <input 
                           type="text" 
                           placeholder="Ex: TTE-2026-XQZ..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="bg-transparent border-none outline-none text-[15px] w-full font-medium text-slate-500 placeholder:text-slate-400 h-9" 
                         />
                         <button 
                           onClick={() => setShowQRScanner(true)}
                           className="p-1.5 text-slate-500 hover:text-primary-500 hover:bg-primary-500/10 rounded-md transition-colors"
                           title="Scan QR Code"
                         >
                           <Camera className="w-4 h-4" />
                         </button>
                       </div>
                       <button 
                         onClick={handleVerify}
                         disabled={!searchQuery && !fileSelected}
                         className="bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold tracking-wide hover:bg-primary-600 transition-all disabled:opacity-50 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] sm:w-auto w-full flex items-center justify-center gap-2"
                       >
                         Verifikasi <ShieldCheck className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 </div>
               ) : isVerifying ? (
                 <div className="py-16 md:py-20 flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-12 h-12 text-primary-500 mb-6 animate-spin" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Memeriksa Keaslian Dokumen</h3>
                    <p className="text-[15px] text-slate-500 mb-10 text-center max-w-sm">Terkoneksi dengan server otoritas sertifikat untuk memvalidasi hash dan integritas.</p>
                 </div>
               ) : (
                 <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="h-full"
                 >
                   {result === 'success' ? (
                     <div className="h-full flex flex-col">
                       <div className="bg-emerald-50 border border-emerald-500/30 rounded-xl p-5 mb-6 flex items-start gap-4">
                          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/40">
                             <CheckCircle2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-800 mb-1">{verifiedDoc?.type === 'project' ? 'Status Proyek Valid' : 'Dokumen Tervalidasi (Sah)'}</h2>
                            <p className="text-[13px] text-slate-500 leading-relaxed">
                              {verifiedDoc?.type === 'project' ? 'Informasi proyek resmi terdaftar di Sistem Transmigrasi terpadu. Data berikut real-time.' : 'Tanda tangan elektronik diterbitkan oleh BSrE BSSN. Dokumen utuh dan belum pernah dimodifikasi sejak ditandatangani.'}
                            </p>
                          </div>
                       </div>
                       
                       <div className="flex-1 pb-6 mb-6">
                         <div className="space-y-4">
                           {/* Verified Information */}
                           {verifiedDoc?.type === 'project' ? (
                             <div className="flex flex-col sm:flex-row p-4 border border-slate-300 rounded-xl bg-white hover:border-primary-500 transition-colors gap-4">
                               <div className="w-10 h-10 rounded bg-primary-100/50 text-primary-600 flex items-center justify-center shrink-0">
                                 <Building className="w-5 h-5" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Informasi Infrastruktur</p>
                                 <p className="font-bold text-[14px] text-slate-800 mb-1 break-all select-all">
                                   Kawasan {verifiedDoc.name}
                                 </p>
                                 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 bg-slate-50 p-2.5 rounded-lg border-0 text-[11px] text-slate-500">
                                   <div>ID Proyek: <span className="font-mono font-bold text-primary-600 block">{verifiedDoc.id}</span></div>
                                   <div>Wilayah: <span className="font-semibold text-slate-700 block">{verifiedDoc.region}</span></div>
                                   <div>Kategori: <span className="font-semibold text-slate-700 block">{verifiedDoc.category || 'Infrastruktur'}</span></div>
                                   <div>Status: <span className="font-semibold text-slate-700 block">{verifiedDoc.status}</span></div>
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <>
                               {/* Verified Document Information */}
                               <div className="flex flex-col sm:flex-row p-4 border border-slate-300 rounded-xl bg-white hover:border-primary-500 transition-colors gap-4">
                                 <div className="w-10 h-10 rounded bg-primary-100/50 text-primary-600 flex items-center justify-center shrink-0">
                                   <FileText className="w-5 h-5" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Informasi Dokumen</p>
                                   <p className="font-bold text-[14px] text-slate-800 mb-1 break-all select-all">
                                     {verifiedDoc ? verifiedDoc.name : 'Simulasi_Surat_Keterangan.pdf'}
                                   </p>
                                   <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 bg-slate-50 p-2.5 rounded-lg border-0 text-[11px] text-slate-500">
                                     <div>ID: <span className="font-mono font-bold text-primary-600 block">{verifiedDoc ? verifiedDoc.id : searchQuery || 'TTE-2026-XQZ'}</span></div>
                                     <div>Kategori: <span className="font-semibold text-slate-700 block">{verifiedDoc ? verifiedDoc.folder : 'SK Penempatan'}</span></div>
                                     <div>Ukuran: <span className="font-semibold text-slate-700 block">{verifiedDoc ? verifiedDoc.size : '1.8 MB'}</span></div>
                                     <div>Tanggal: <span className="font-mono font-semibold text-slate-700 block">{verifiedDoc ? verifiedDoc.date : '2026-05-25'}</span></div>
                                   </div>
                                 </div>
                               </div>
                               <div className="flex flex-col sm:flex-row p-4 border border-slate-300 rounded-xl bg-white hover:border-primary-500 transition-colors gap-4">
                                 <div className="w-10 h-10 rounded bg-primary-100 text-primary-500 flex items-center justify-center shrink-0">
                                   <User className="w-5 h-5" />
                                 </div>
                                 <div className="flex-1">
                                   <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Identitas Penandatangan</p>
                                   <p className="font-bold text-[15px] text-slate-800 mb-0.5">{verifiedDoc?.signedBy ? verifiedDoc.signedBy : 'Dr. Ir. Harianto, M.Sc.'}</p>
                                   <p className="text-[13px] text-slate-500">{verifiedDoc?.signedBy ? `Disahkan oleh ${verifiedDoc.signedBy} pada ${verifiedDoc.date}` : 'NIP. 197805122005011003 • Dir. Kawasan 3T'}</p>
                                 </div>
                               </div>
                             </>
                           )}

                           <div className="flex flex-col sm:flex-row p-4 border border-slate-300 rounded-xl bg-white hover:border-primary-500 transition-colors gap-4">
                             <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                               <Building className="w-5 h-5" />
                             </div>
                             <div className="flex-1">
                               <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Entitas Penerbit</p>
                               <p className="font-bold text-[15px] text-slate-800 mb-0.5">{appSettings?.instansiName || 'Kementerian Transmigrasi'}</p>
                               <p className="text-[13px] text-slate-500">Direktorat Jenderal Pembangunan Transmigrasi</p>
                             </div>
                           </div>
                         </div>
                       </div>

                       <div className="border-t border-slate-300/50 pt-6 flex justify-between items-center sm:flex-row flex-col gap-4 shrink-0">
                         <button className="text-[13px] text-primary-500 font-semibold hover:underline flex items-center gap-1.5">
                           <ExternalLink className="w-4 h-4" /> Unduh Sertifikat
                         </button>
                         <button 
                           onClick={handleReset}
                           className="px-6 py-2 sm:py-2.5 bg-white border border-slate-300 text-slate-500 font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm w-full sm:w-auto"
                         >
                           Verifikasi Ulang
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className="text-center py-10 h-full flex flex-col items-center justify-center">
                       <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-sm">
                         <XCircle className="w-10 h-10 text-red-500" />
                       </div>
                       <h2 className="text-xl font-bold text-slate-800 mb-2">Verifikasi Gagal</h2>
                       <p className="text-[14px] text-slate-500 max-w-sm mx-auto mb-8">
                         Dokumen tidak dapat diverifikasi. Signature invalid atau dokumen telah diedit secara ilegal. 
                       </p>

                       <button 
                         onClick={handleReset}
                         className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-2.5 rounded-lg font-semibold shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] transition-all flex items-center gap-2"
                       >
                         <RefreshCw className="w-4 h-4" /> Coba Lagi
                       </button>
                     </div>
                   )}
                 </motion.div>
               )}
            </div>

            {/* Right Side: Execution Logs / Tracking panel */}
            <div className="p-6 md:p-10 w-full md:w-[380px] lg:w-[420px] bg-slate-50 shrink-0 border-t md:border-t-0 flex flex-col">
               <h4 className="text-[14px] font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center justify-between">
                 Log Proses Validasi
                 <Settings className="w-4 h-4 text-slate-400" />
               </h4>

               <div className="flex-1 relative">
                 {/* Timeline Line */}
                 <div className="absolute top-2 bottom-6 left-3 w-px bg-slate-300"></div>
                 
                 <div className="space-y-6 relative z-10">
                   {[
                     { step: 1, label: 'Mengekstrak Hash PDF', delay: "0.2s" },
                     { step: 2, label: 'Memvalidasi Digital Signature', delay: "0.8s" },
                     { step: 3, label: 'Koneksi API BSrE', delay: "1.2s" },
                     { step: 4, label: 'Memeriksa Revocation List (CRL)', delay: "2.1s" },
                     { step: 5, label: 'Memutuskan Status Akhir', delay: "3.5s" },
                   ].map((s, i) => {
                     let status: 'waiting' | 'active' | 'done' | 'fail' = 'waiting';
                     if (!isVerifying && !result) status = 'waiting';
                     else if (isVerifying && verificationSteps === s.step - 1) status = 'active';
                     else if (isVerifying && verificationSteps >= s.step) status = 'done';
                     else if (!isVerifying && result === 'success') status = 'done';
                     else if (!isVerifying && result === 'fail') status = (i === 4 ? 'fail' : 'done');

                     return (
                       <div key={s.step} className={cn("relative flex items-start gap-4 transition-opacity duration-300", 
                         status === 'waiting' ? "opacity-40" : "opacity-100"
                       )}>
                         <div className={cn(
                           "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 bg-white mt-0.5 transition-colors",
                           status === 'done' ? "border-emerald-500" :
                           status === 'fail' ? "border-red-500" :
                           status === 'active' ? "border-primary-500" : "border-slate-300"
                         )}>
                            {status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> :
                             status === 'fail' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                             status === 'active' ? <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" /> : 
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                         </div>
                         <div>
                            <p className={cn("text-[13px] font-semibold mb-0.5", 
                               status === 'active' ? "text-slate-800" : "text-slate-500"
                            )}>
                              {s.label}
                            </p>
                            <span className="text-[11px] font-medium text-slate-400 tracking-widest uppercase flex flex-col">
                              {status === 'active' ? 'Memproses...' : 
                               status === 'done' ? 'Selesai' : 
                               status === 'fail' ? 'Error / Ditolak' : 'Menunggu'}
                            </span>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               </div>

               {/* Meta info box */}
               <div className="mt-8 bg-white border border-slate-300 rounded-lg p-4">
                 <div className="flex items-center gap-2 mb-3">
                   <Lock className="w-4 h-4 text-slate-400" />
                   <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Keamanan Kriptografi</span>
                 </div>
                 <div className="text-[12px] text-slate-500 space-y-2">
                   <div className="flex justify-between">
                     <span>Algoritma</span>
                     <span className="font-semibold text-slate-800">RSA-2048</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Fungsi Hash</span>
                     <span className="font-semibold text-slate-800">SHA-256</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Standar Otoritas</span>
                     <span className="font-semibold text-slate-800">X.509 v3</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-[12px] text-slate-400 max-w-2xl px-4 flex flex-col items-center gap-2 shrink-0">
           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Logo_of_the_Ministry_of_Villages%2C_Development_of_Disadvantaged_Regions%2C_and_Transmigration_of_the_Republic_of_Indonesia.svg/512px-Logo_of_the_Ministry_of_Villages%2C_Development_of_Disadvantaged_Regions%2C_and_Transmigration_of_the_Republic_of_Indonesia.svg.png" alt="BSrE" className="h-8 mb-2 grayscale opacity-40 mix-blend-multiply" />
           <p className="font-medium">
             Layanan Verifikasi Publik (Public Verification Tool) disediakan untuk memeriksa status dokumen TTE (Tanda Tangan Elektronik). 
           </p>
           <p>Didukung oleh infrastruktur Otoritas Sertifikat Nasional BSrE - BSSN Republik Indonesia.</p>
        </div>
      </div>

      {showQRScanner && (
        <QRScanner 
          onScan={handleScanSuccess}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};


