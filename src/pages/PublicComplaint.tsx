import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, storage } from '../lib/firebase';
import { doc, setDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AlertCircle, CheckCircle2, Copy, MessageSquare, MapPin, Phone, User, FileText, Send, ArrowLeft, Image as ImageIcon, X, UploadCloud, Locate, Home, Menu, ShieldCheck, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';
import { sendAppNotification } from '../lib/notifications';
import { NotificationGatewayModal } from '../components/NotificationGatewayModal';

const MASTER_LOKASI_FALLBACK = [
  { id: '1', name: 'Kawasan Merauke (Muting) - 3T', lat: -8.115, lng: 140.755, region: 'Papua Selatan', status: 'Pelaksanaan', is3T: true, category: 'Daerah 3T' },
  { id: '4', name: 'Kawasan Sorong (Klamono) - 3T', lat: -1.050, lng: 131.500, region: 'Papua Barat Daya', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '5', name: 'Kawasan Nabire (Teluk Kimi)', lat: -3.366, lng: 135.500, region: 'Papua Tengah', status: 'Pembinaan', is3T: false, category: 'Reguler' },
  { id: '7', name: 'Kawasan Asmat - 3T', lat: -5.538, lng: 138.134, region: 'Papua Selatan', status: 'Persiapan', is3T: true, category: 'Terpencil' },
  { id: '8', name: 'Kawasan Pegunungan Bintang - 3T', lat: -4.567, lng: 140.316, region: 'Papua Pegunungan', status: 'Pembinaan', is3T: true, category: 'Perbatasan' },
  { id: '2', name: 'Kawasan Sumba Timur - 3T', lat: -9.658, lng: 120.264, region: 'NTT', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '3', name: 'Kawasan Mentawai - 3T', lat: -2.040, lng: 99.553, region: 'Sumatera Barat', status: 'Pembinaan', is3T: true, category: 'Daerah 3T' },
  { id: '10', name: 'Kawasan Natuna - 3T', lat: 3.949, lng: 108.142, region: 'Kepulauan Riau', status: 'Pelaksanaan', is3T: true, category: 'Perbatasan' },
  { id: '11', name: 'Kawasan Pulau Morotai - 3T', lat: 2.045, lng: 128.293, region: 'Maluku Utara', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '6', name: 'Kawasan Konawe', lat: -3.850, lng: 122.050, region: 'Sulawesi Tenggara', status: 'Pelaksanaan', is3T: false, category: 'Reguler' },
];

export const PublicComplaint: React.FC = () => {
  const { appSettings } = useStore();
  const [formData, setFormData] = useState({
    user: '',
    phone: '',
    email: '',
    location: '',
    category: 'Pelayanan Publik',
    priority: 'Low',
    subject: '',
    description: '',
    lat: '',
    lng: ''
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const geographies = projects.length > 0 ? projects : MASTER_LOKASI_FALLBACK;

  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projs);
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, []);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Notification Gateway visualizer states
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'idle' | 'sending' | 'success' | 'done'>('idle');
  const [gatewayEvent, setGatewayEvent] = useState<'complaint_created' | 'complaint_updated' | 'document_signed' | 'meeting_created' | 'system_alert' | null>(null);
  const [gatewayEmail, setGatewayEmail] = useState('');
  const [gatewayPhone, setGatewayPhone] = useState('');
  const [gatewaySubject, setGatewaySubject] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolokasi tidak didukung oleh browser Anda.");
      return;
    }
    setGeolocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: String(position.coords.latitude.toFixed(6)),
          lng: String(position.coords.longitude.toFixed(6))
        }));
        setGeolocating(false);
      },
      (err) => {
        console.error("Geolocation Error:", err);
        setGeoError("Gagal mengambil lokasi fisik. Berikan izin lokasi browser Anda.");
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const validateField = (name: string, value: string) => {
    let err = '';
    if (name === 'user' && !value.trim()) err = 'Nama Lengkap wajib diisi.';
    else if (name === 'phone') {
      if (!value.trim()) err = 'Nomor telepon wajib diisi.';
      else if (!/^\+?\d{9,15}$/.test(value.replace(/[\s-]/g, ''))) err = 'Format nomor telepon tidak valid (9-15 digit angka).';
    }
    else if (name === 'email') {
      if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        err = 'Format email tidak valid.';
      }
    }
    else if (name === 'subject' && !value.trim()) err = 'Judul pengaduan wajib diisi.';
    else if (name === 'description' && !value.trim()) err = 'Deskripsi wajib diisi.';
    
    setFormErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };


  const categories = [
    'Infrastruktur',
    'Sosial & Budaya',
    'Ekonomi',
    'Pelayanan Publik',
    'Konflik Lahan',
    'Lainnya'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setError('Mohon unggah file dengan format JPEG atau PNG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError('Ukuran gambar maksimal adalah 2MB.');
      return;
    }

    setEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setEvidencePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const removeFile = () => {
    setEvidenceFile(null);
    setEvidencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate everything before submit
    validateField('user', formData.user);
    validateField('phone', formData.phone);
    validateField('email', formData.email);
    validateField('subject', formData.subject);
    validateField('description', formData.description);

    // If there's an error for required fields or invalid phone/email format
    if (!formData.user || !formData.phone || !formData.subject || !formData.description || 
       (formErrors.phone && formErrors.phone !== '') || 
       (formErrors.email && formErrors.email !== '')) {
      setError('Mohon lengkapi semua field yang wajib diisi dengan format yang benar.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Server-side location validation
      if (formData.lat && formData.lng) {
        const valRes = await fetch('/api/validate-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: formData.lat, lng: formData.lng, kawasan: formData.location })
        });
        const valData = await valRes.json();
        if (!valData.valid) {
          setError(valData.error);
          setIsSubmitting(false);
          return;
        }
      }

      // Create a unique ticket ID
      const ticketId = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      let evidenceUrl = null;
      
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const storageRef = ref(storage, `complaints/${ticketId}/evidence.${fileExt}`);
        await uploadBytes(storageRef, evidenceFile);
        evidenceUrl = await getDownloadURL(storageRef);
      }
      
      const newDoc = {
        ...formData,
        id: ticketId,
        status: 'Open',
        evidenceUrl,
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        replies: []
      };

      await setDoc(doc(db, 'complaints', ticketId), newDoc);

      // Async notification dispatch via Fonnte & SMTP configured rules with gateway tracking
      setIsGatewayOpen(true);
      setGatewayStatus('sending');
      setGatewayEvent('complaint_created');
      setGatewayEmail(formData.email || '');
      setGatewayPhone(formData.phone || '');
      setGatewaySubject(formData.subject);

      try {
        await sendAppNotification('complaint_created', {
          ticketId,
          user: formData.user,
          phone: formData.phone,
          recipientEmail: formData.email,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          description: formData.description,
          location: formData.location
        });
        setGatewayStatus('done');
      } catch (notifyErr) {
        console.error('Trigger notification gateway failed:', notifyErr);
        setGatewayStatus('done');
      }

      setSubmittedId(ticketId);
    } catch (err: any) {
      console.error(err);
      setError('Gagal mengirimkan pengaduan. Silakan coba lagi. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a small toast here if needed
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
      <NotificationGatewayModal
        isOpen={isGatewayOpen}
        onClose={() => setIsGatewayOpen(false)}
        status={gatewayStatus}
        event={gatewayEvent}
        recipientEmail={gatewayEmail}
        recipientPhone={gatewayPhone}
        subject={gatewaySubject}
      />
      <header className="bg-white border-b border-slate-200 py-4 lg:py-5 px-6 sm:px-8 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/')}>
          {appSettings?.logoUrl ? (
            <img src={appSettings.logoUrl} alt={appSettings?.appName || 'Logo'} className="h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none mb-0.5">{appSettings?.appName || 'Trans3T'}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Verifikasi & Pengaduan</p>
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
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 transition-colors border-b-2 border-primary-500 pb-1 translate-y-[2px] cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Pengaduan
          </button>
          <button 
            type="button"
            onClick={() => navigateTo('/verify')} 
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition-colors cursor-pointer"
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
                className="flex items-center gap-2.5 text-sm font-bold text-primary-600 py-2 border-b border-slate-100 w-full text-left"
              >
                <MessageSquare className="w-5 h-5" /> Pusat Pengaduan
              </button>
              <button 
                type="button"
                onClick={() => { navigateTo('/verify'); setIsMobileMenuOpen(false); }} 
                className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-primary-600 py-2 border-b border-slate-100 w-full text-left"
              >
                <ShieldCheck className="w-5 h-5 text-slate-400" /> Verifikasi Dokumen TTE
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
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!submittedId ? (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border-0 overflow-hidden"
            >
              <div className="p-6 sm:p-10 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Formulir Pengaduan</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Silakan lengkapi formulir di bawah ini dengan informasi yang sebenar-benarnya. Pengaduan Anda akan kami tindaklanjuti sesuai dengan prosedur yang berlaku.
                </p>
              </div>

              {error && (
                <div className="px-6 sm:px-10 mt-6 -mb-2">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">
                {/* Data Pelapor */}
                <div className="space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Identitas Pelapor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="user"
                        required
                        value={formData.user}
                        onChange={handleChange}
                        className={cn("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none", formErrors.user ? "border-red-500" : "border-slate-200")}
                        placeholder="Contoh: Budi Santoso"
                      />
                      {formErrors.user && <p className="text-xs text-red-500 mt-1">{formErrors.user}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        Nomor HP / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="tel" 
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className={cn("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none font-mono", formErrors.phone ? "border-red-500" : "border-slate-200")}
                        placeholder="Contoh: 08123456789"
                      />
                      {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        Alamat Email <span className="text-slate-400 text-xs font-normal">(Opsional)</span>
                      </label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={cn("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none", formErrors.email ? "border-red-500" : "border-slate-200")}
                        placeholder="budi@example.com"
                      />
                      {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                    </div>
                  </div>
                </div>

                {/* Data Pengaduan */}
                <div className="space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Detail Pengaduan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2 lg:col-span-1">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        Kategori Pengaduan
                      </label>
                      <select 
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none appearance-none cursor-pointer"
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 lg:col-span-1">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        Tingkat Prioritas
                      </label>
                      <select 
                         name="priority"
                         value={formData.priority}
                         onChange={handleChange}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="Low">Low - Biasa</option>
                        <option value="Medium">Medium - Menengah</option>
                        <option value="High">High - Mendesak / Kritis</option>
                      </select>
                    </div>
                    {/* Geografis & Pemetaan Kawasan Dropdowns */}
                    <div className="sm:col-span-2 lg:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      {/* Wilayah Dropdown */}
                      <div className="space-y-1 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">WILAYAH (GEOGRAFIS) <span className="text-red-500">*</span></label>
                        <select
                          value={selectedRegion}
                          onChange={(e) => {
                            const reg = e.target.value;
                            setSelectedRegion(reg);
                            // reset location inside state
                            setFormData(prev => ({
                              ...prev,
                              location: reg ? `, ${reg}` : '',
                            }));
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-primary-500 cursor-pointer text-slate-700 text-left"
                          required
                        >
                          <option value="">-- Pilih Wilayah --</option>
                          <optgroup label="Daerah 3T Papua">
                            {Array.from(new Set(geographies.map(g => g.region)))
                              .sort()
                              .filter(r => r.toLowerCase().includes('papua'))
                              .map(reg => (
                                <option key={reg} value={reg}>{reg}</option>
                              ))}
                          </optgroup>
                          <optgroup label="Non Papua">
                            {Array.from(new Set(geographies.map(g => g.region)))
                              .sort()
                              .filter(r => !r.toLowerCase().includes('papua'))
                              .map(reg => (
                                <option key={reg} value={reg}>{reg}</option>
                              ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Kawasan Dropdown */}
                      <div className="space-y-1 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">KAWASAN (PEMETAAN) <span className="text-red-500">*</span></label>
                        <select
                          value={geographies.find(g => g.name === formData.location || `${g.name}, ${g.region}` === formData.location)?.name || ''}
                          onChange={(e) => {
                            const kaw = e.target.value;
                            const matchingObj = geographies.find(g => g.name === kaw);
                            if (matchingObj) {
                              setFormData(prev => ({
                                ...prev,
                                location: `${matchingObj.name}, ${matchingObj.region}`,
                                lat: String(matchingObj.lat),
                                lng: String(matchingObj.lng)
                              }));
                            } else {
                              setFormData(prev => ({ ...prev, location: kaw }));
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-primary-500 cursor-pointer text-slate-700 text-left"
                          required
                          disabled={!selectedRegion}
                        >
                          <option value="">{selectedRegion ? '-- Pilih Kawasan --' : 'Pilih Wilayah Terlebih Dahulu'}</option>
                          {geographies.filter(g => g.region === selectedRegion).map(g => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>



                    {/* Geolocation Section for Public */}
                    <div className="sm:col-span-2 lg:col-span-3 border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Locate className="w-4 h-4 text-primary-600" /> Data Geolokasi Tersemat (GPS)
                        </span>
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          disabled={geolocating}
                          className="px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border border-transparent cursor-pointer font-sans"
                        >
                          <Locate className={cn("w-3.5 h-3.5", geolocating && "animate-spin")} />
                          {geolocating ? 'MENDETEKSI GPS...' : 'DETEKSI LOKASI SAYA'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block px-1">Garis Lintang (Latitude)</label>
                          <input
                            type="text"
                            placeholder="Contoh: -8.123456"
                            value={formData.lat}
                            onChange={e => setFormData({ ...formData, lat: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500 transition-all font-mono text-slate-700 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block px-1">Garis Bujur (Longitude)</label>
                          <input
                            type="text"
                            placeholder="Contoh: 140.123456"
                            value={formData.lng}
                            onChange={e => setFormData({ ...formData, lng: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500 transition-all font-mono text-slate-700 outline-none"
                          />
                        </div>
                      </div>
                      {geoError && (
                        <p className="text-xs font-semibold text-red-500 px-1">{geoError}</p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Judul Pengaduan <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className={cn("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none font-medium", formErrors.subject ? "border-red-500" : "border-slate-200")}
                        placeholder="Tuliskan secara singkat inti pengaduan Anda..."
                      />
                      {formErrors.subject && <p className="text-xs text-red-500 mt-1">{formErrors.subject}</p>}
                    </div>
                    
                    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        Deskripsi Lengkap <span className="text-red-500">*</span>
                      </label>
                      <textarea 
                        name="description"
                        required
                        value={formData.description}
                        onChange={handleChange}
                        rows={5}
                        className={cn("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none resize-y", formErrors.description ? "border-red-500" : "border-slate-200")}
                        placeholder="Jelaskan secara detail dan kronologis terkait masalah yang Anda hadapi..."
                      />
                      {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
                    </div>
                    
                    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        Bukti Foto (Opsional)
                      </label>
                      
                      {!evidencePreview ? (
                        <div 
                          className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-8 text-center hover:bg-slate-100 hover:border-primary-300 transition-all cursor-pointer group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden" 
                          />
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                             <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700 mb-1 group-hover:text-primary-600 transition-colors">
                            Klik untuk mengunggah gambar
                          </p>
                          <p className="text-xs text-slate-500">Maks. 2MB (JPG, PNG)</p>
                        </div>
                      ) : (
                        <div className="relative inline-block w-full sm:w-auto mt-2">
                           <img 
                             src={evidencePreview} 
                             alt="Preview Evidence" 
                             className="h-48 w-full sm:w-auto rounded-xl object-cover border border-slate-200 shadow-sm"
                           />
                           <button
                             type="button"
                             onClick={removeFile}
                             className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-md text-red-500 hover:text-red-600 hover:scale-110 transition-all"
                           >
                             <X className="w-4 h-4" />
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-bold tracking-wide hover:bg-primary-700 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isSubmitting ? (
                      <>
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         Mengirim...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Kirim Pengaduan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-emerald-500/10 border-0 overflow-hidden text-center"
            >
              <div className="bg-emerald-50 py-12 px-6 border-b border-slate-100 flex flex-col items-center">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
                    <CheckCircle2 className="w-10 h-10" />
                 </div>
                 <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">Laporan Diterima!</h2>
                 <p className="text-slate-600 text-base max-w-md mx-auto leading-relaxed">
                   Terima kasih, laporan pengaduan Anda telah berhasil masuk ke sistem kami. 
                   Tim admin akan segera menindaklanjuti.
                 </p>
              </div>
              
              <div className="p-8 sm:p-12">
                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Nomor Tiket Anda</p>
                   <div className="flex items-center justify-center gap-4">
                     <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800 tracking-wider">
                       {submittedId}
                     </span>
                     <button 
                       onClick={() => copyToClipboard(submittedId)}
                       className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer group relative"
                       title="Salin Nomor Tiket"
                     >
                       <Copy className="w-6 h-6" />
                     </button>
                   </div>
                   <p className="text-xs text-slate-500 mt-4 leading-relaxed max-w-sm mx-auto">
                     Harap simpan nomor tiket ini dengan baik. Anda dapat menggunakannya untuk menanyakan status pengaduan Anda nanti.
                   </p>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <button 
                       onClick={() => {
                          setSubmittedId(null);
                          setFormData({
                            email: '',
                            lat: '',
                            lng: '',
                            user: '',
                            phone: '',
                            location: '',
                            category: 'Pelayanan Publik',
                            priority: 'Low',
                            subject: '',
                            description: '',
                          });
                       }}
                       className="w-full sm:w-auto px-8 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                       Laporkan Masalah Lain
                    </button>
                    <a 
                       href="/"
                       className="w-full sm:w-auto px-8 py-3 bg-primary-600 border-2 border-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 hover:border-primary-700 transition-colors"
                    >
                       Selesai
                    </a>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer className="text-center py-6 text-xs font-semibold text-slate-400">
         &copy; {new Date().getFullYear()} {appSettings?.appName || 'Pusat Pengaduan'}. {appSettings?.instansiName || 'Kementerian Transmigrasi'}.
      </footer>
    </div>
  );
};
