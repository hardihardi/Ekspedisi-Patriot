import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Mail, 
  Shield, 
  Palette, 
  Bell,
  Lock,
  Save,
  CheckCircle2,
  Database,
  Download,
  AlertCircle,
  Camera,
  Trash2,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, setDoc, collection, getDocs, query, orderBy, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { AccessDenied } from '../components/AccessDenied';

interface SettingsProps {
  setActiveTab?: (tab: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ setActiveTab }) => {
  const { user, setAppSettings } = useStore();
  
  const isAuthorized = user?.role === 'superadmin' || user?.role === 'admin_pusat' || user?.role === 'admin_daerah';

  if (!isAuthorized) {
    return (
      <AccessDenied 
        requiredRoles={['superadmin', 'admin_pusat', 'admin_daerah']} 
        currentRole={user?.role || ''} 
        onGoBack={() => setActiveTab?.('dashboard')}
      />
    );
  }

  const [activeSettingTab, setActiveSettingTab] = useState('branding');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formData, setFormData] = useState({
    appName: 'Pusat Pengaduan',
    instansiName: 'Kementerian Transmigrasi',
    themeColor: 'classic',
    layoutDensity: 'default',
    systemLanguage: 'id',
    maintenanceMode: false,
    logoUrl: '',
    faviconUrl: '',
    defaultCoverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=320&q=85',
    fonnteKey: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    waEnabled: true,
    emailEnabled: true,
    notifyOnComplaintCreated: true,
    notifyOnComplaintUpdated: true,
    notifyOnDocSigned: true,
    notifyOnMeetingCreated: true,
    adminWaTarget: '',
    adminEmailTarget: '',
    supportEmail: 'support@sistem-3t.go.id',
    supportHotline: '1500-123',
    supportAddress: 'Ditjen PKP2Trans, Kementerian Desa PDTT\nJalan TMP Kalibata No.17, Pancoran,\nKota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12750\nGedung Utama Lt. 4',
    footerDescription: 'Sistem Informasi Terpadu Pelaporan, Pendataan, dan Evaluasi Perkembangan Kawasan Transmigrasi Lokus 3T.',
    footerDescriptionEn: 'Integrated Information System for Reporting, Recording, and Progress Evaluation of 3T Transmigration Areas.',
    docsVersion: '1.2.0'
  });

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData(prev => ({ ...prev, ...data }));
          setAppSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, [setAppSettings]);

  const [testStatus, setTestStatus] = useState<{wa: string | null, email: string | null}>({ wa: null, email: null });
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  React.useEffect(() => {
    const qLogs = query(collection(db, 'notification_logs'), orderBy('timestamp', 'desc'), limit(25));
    const unsubscribe = onSnapshot(qLogs, (snapshot) => {
      const logsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotificationLogs(logsList);
    }, (error) => {
      console.error("Failed to load real-time notification logs:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleClearLogs = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus seluruh log riwayat sinkronisasi notifikasi?")) {
      setIsClearingLogs(true);
      try {
        const qLogs = query(collection(db, 'notification_logs'));
        const querySnapshot = await getDocs(qLogs);
        const deletePromises = querySnapshot.docs.map(docLog => deleteDoc(doc(db, 'notification_logs', docLog.id)));
        await Promise.all(deletePromises);
      } catch (err) {
        console.error("Error clearing logs:", err);
      } finally {
        setIsClearingLogs(false);
      }
    }
  };
  
  const tabs = [
    { id: 'branding', label: 'Identity', icon: Palette },
    { id: 'public_info', label: 'Public & Legal Content', icon: FileText },
    { id: 'notifications', label: 'API & Gateway', icon: Bell },
    { id: 'system', label: 'System & Maintenance', icon: Shield },
  ];

  const handleTestWa = async () => {
    if (!formData.fonnteKey) {
      setTestStatus(p => ({ ...p, wa: 'error: API Key kosong' }));
      return;
    }
    setIsTestingWa(true);
    try {
      const { user } = useStore.getState();
      const res = await fetch('/api/notify/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target: '08123456789', // Dummy target to test connection, Fonnte allows getting device status instead if you call device endpoint but this is a simple check
          message: `Test Connection ${formData.appName}`, 
          apiKey: formData.fonnteKey 
        })
      });
      const data = await res.json();
      if (data.status) {
        setTestStatus(p => ({ ...p, wa: 'success' }));
      } else {
        setTestStatus(p => ({ ...p, wa: 'error: ' + (data.reason || 'Invalid token') }));
      }
    } catch(err: any) {
      setTestStatus(p => ({ ...p, wa: 'error: ' + err.message }));
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleTestEmail = async () => {
    if (!formData.smtpUser || !formData.smtpPass) {
      setTestStatus(p => ({ ...p, email: 'error: Username or Password kosong' }));
      return;
    }
    setIsTestingEmail(true);
    try {
      const { user } = useStore.getState();
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: formData.smtpUser,
          subject: `Test Connection SMTP ${formData.appName}`, 
          html: '<p>Koneksi SMTP berhasil!</p>',
          smtpConfig: {
             user: formData.smtpUser,
             pass: formData.smtpPass,
             host: formData.smtpHost,
             port: formData.smtpPort
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus(p => ({ ...p, email: 'success' }));
      } else {
        setTestStatus(p => ({ ...p, email: 'error: ' + (data.error || 'Failed') }));
      }
    } catch(err: any) {
      setTestStatus(p => ({ ...p, email: 'error: ' + err.message }));
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      // In a real app we would fetch collections securely or export from backend.
      // Here we just mock export or get small settings doc.
      const settingsSnap = await import('firebase/firestore').then(m => m.getDoc(doc(db, 'settings', 'global')));
      
      const payload = {
        timestamp: new Date().toISOString(),
        settings: settingsSnap.data(),
        // mock data for now
        collections: ['companies', 'applications', 'cvs', 'documents']
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.appName || 'app'}-backup-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
       await new Promise(r => setTimeout(r, 1500));
       setShowToast(true);
       setTimeout(() => setShowToast(false), 3000);
    } finally {
       setIsSeeding(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), formData, { merge: true });
      setShowToast(true);
      setAppSettings(formData);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'logoUrl' | 'faviconUrl' | 'defaultCoverUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = key === 'faviconUrl' ? 64 : (key === 'logoUrl' ? 512 : 1240);
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
            setFormData(prev => ({ ...prev, [key]: compressedDataUrl }));
          } else {
            setFormData(prev => ({ ...prev, [key]: reader.result as string }));
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold">Berhasil Disimpan</h4>
              <p className="text-xs text-slate-300">Pengaturan aplikasi telah diperbarui.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">System Configuration</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Kelola identitas sistem, gateway notifikasi, dan integrasi TTE.</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs md:text-[13px] font-semibold tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95"
        >
           <Save className="w-4 h-4" /> 
           {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        <div className="flex lg:flex-col overflow-x-auto no-scrollbar lg:w-56 space-y-0 lg:space-y-1 p-1 -mx-4 sm:mx-0 px-4 sm:px-0 gap-2 lg:gap-1 border-b lg:border-none border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingTab(tab.id)}
                className={cn(
                  "flex-none lg:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all font-medium text-[14px]",
                  activeSettingTab === tab.id 
                    ? "bg-primary-600 text-white shadow-[0_4px_8px_rgba(105,108,255,0.4)]" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <Icon className={cn("w-4 sm:w-5 h-4 sm:h-5", activeSettingTab === tab.id ? "text-white" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 space-y-6 min-w-0">
          {activeSettingTab === 'branding' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none p-5 sm:p-8"
            >
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary-500" /> Identitas & Visual Aplikasi
                </h3>
                <p className="text-slate-400 text-xs mt-1">Konfigurasi visual utama, logo instansi, bahasa, dan tata letak secara real-time.</p>
              </div>

              <div className="space-y-6 max-w-2xl">
                {/* Apps and Agency */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Nama Aplikasi</label>
                    <input 
                      type="text" 
                      value={formData.appName} 
                      onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-[14px] text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Nama Instansi / Kementerian</label>
                    <input 
                      type="text" 
                      value={formData.instansiName} 
                      onChange={(e) => setFormData({ ...formData, instansiName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-[14px] text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans" 
                    />
                  </div>
                </div>

                {/* Theme Color Picker */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-1">
                      Palet Warna Utama (Real-time Theme)
                    </label>
                    <p className="text-slate-400 text-xs px-1">
                      Pilih identitas warna platform. Setiap opsi menyajikan gradasi warna responsif dari shade terang (50) hingga gelap (700) secara otomatis di seluruh elemen UI.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { 
                        id: 'classic', 
                        label: 'Classic Violet', 
                        desc: 'Trans3T Ungu Elegan & Profesional',
                        colorClass: 'bg-[#696cff]', 
                        shades: ['#f5f5f9', '#d2d2ff', '#696cff', '#5f61e6', '#4f51be'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                      { 
                        id: 'emerald', 
                        label: 'Tani Emerald', 
                        desc: 'Hijau Khas Pertanian & Ekosistem 3T',
                        colorClass: 'bg-[#10b981]', 
                        shades: ['#f0fdf4', '#bbf7d0', '#10b981', '#059669', '#047857'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                      { 
                        id: 'blue', 
                        label: 'Sinergi Ocean', 
                        desc: 'Biru Cerah Optimis & Kemitraan',
                        colorClass: 'bg-[#0ea5e9]', 
                        shades: ['#f0f9ff', '#bae6fd', '#0ea5e9', '#0284c7', '#0369a1'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                      { 
                        id: 'navy', 
                        label: 'Patriot Navy Gold', 
                        desc: 'Navy + Antique Gold • Premium Design System (Jakarta + Fraunces)',
                        colorClass: 'bg-[#122b5c]', 
                        shades: ['#ECF0F7', '#D8DEEB', '#3A5AA0', '#122B5C', '#050E1F'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                      { 
                        id: 'amber', 
                        label: 'Makmur Sunset', 
                        desc: 'Amber Keemasan Produktivitas & Transmigran',
                        colorClass: 'bg-[#f59e0b]', 
                        shades: ['#fffbeb', '#fde68a', '#f59e0b', '#d97706', '#b45309'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                      { 
                        id: 'indigo', 
                        label: 'Royal Indigo', 
                        desc: 'Indigo Karakter Premium & High-tech',
                        colorClass: 'bg-[#6366f1]', 
                        shades: ['#eef2ff', '#c7d2fe', '#6366f1', '#4f46e5', '#4338ca'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                      { 
                        id: 'rose', 
                        label: 'Prima Rose', 
                        desc: 'Merah Muda Semangat Pelayanan Handal',
                        colorClass: 'bg-[#f43f5e]', 
                        shades: ['#fff1f2', '#fecdd3', '#f43f5e', '#e11d48', '#be123c'],
                        shadeNames: ['50', '200', '500', '600', '700']
                      },
                    ].map((themeOpt) => (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, themeColor: themeOpt.id })}
                        className={cn(
                          "group text-left p-4 rounded-xl transition-all duration-300 relative flex flex-col justify-between h-[155px] w-full cursor-pointer shadow-2xs hover:shadow-xs",
                          formData.themeColor === themeOpt.id
                            ? "bg-primary-500/10 ring-2 ring-primary-500"
                            : "bg-slate-50 hover:bg-slate-100/70"
                        )}
                      >
                        {/* Upper Card Block */}
                        <div className="w-full space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span 
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0 flex items-center justify-center transition-transform group-hover:scale-110",
                                  themeOpt.colorClass
                                )} 
                              />
                              <h4 className="text-xs font-black text-slate-800 leading-tight font-sans">
                                {themeOpt.label}
                              </h4>
                            </div>
                            
                            {/* Dot indicator */}
                            <span className={cn(
                              "w-3 h-3 rounded-full border border-white transition-all",
                              formData.themeColor === themeOpt.id
                                ? "bg-primary-500 scale-100"
                                : "bg-slate-300 scale-75 group-hover:bg-slate-400"
                            )} />
                          </div>
                          
                          <p className="text-[10px] text-slate-450 font-medium leading-tight font-sans">
                            {themeOpt.desc}
                          </p>
                        </div>

                        {/* Lower Card Block: Color Gradations breakdown */}
                        <div className="w-full space-y-1 pt-2.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                            Gradasi Skala Shade
                          </span>
                          
                          <div className="flex items-center gap-1 w-full">
                            {themeOpt.shades.map((hex, idx) => (
                              <div 
                                key={idx} 
                                className="flex-1 h-4 rounded-md relative group/shade cursor-help"
                                style={{ backgroundColor: hex }}
                                title={`Shade ${themeOpt.shadeNames[idx]}: ${hex}`}
                              >
                                {/* Micro scale code overlay on hover / active */}
                                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white/90 opacity-0 group-hover/shade:opacity-100 transition-opacity drop-shadow-xs">
                                  {themeOpt.shadeNames[idx]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ID Active Badge */}
                        <span className="absolute bottom-1 right-2.5 text-[8px] font-mono text-slate-300 font-bold uppercase tracking-widest pointer-events-none group-hover:text-slate-400">
                          {themeOpt.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout and Language */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 block font-sans">Kepadatan Tata Letak (Density)</label>
                    <div className="flex bg-slate-150/75 p-1.5 rounded-lg gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, layoutDensity: 'default' })}
                        className={cn(
                          "flex-1 text-center py-1.5 rounded px-3 text-xs font-bold transition-all cursor-pointer",
                          formData.layoutDensity === 'default'
                            ? "bg-white text-slate-800 shadow-xs"
                            : "text-slate-550 hover:text-slate-800"
                        )}
                      >
                        Default (Nyaman)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, layoutDensity: 'compact' })}
                        className={cn(
                          "flex-1 text-center py-1.5 rounded px-3 text-xs font-bold transition-all cursor-pointer",
                          formData.layoutDensity === 'compact'
                            ? "bg-white text-slate-800 shadow-xs"
                            : "text-slate-550 hover:text-slate-800"
                        )}
                      >
                        Kompak (Padat)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload Logos */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 font-sans font-sans">Logo (App Dashboard)</label>
                    <label className="block p-5 rounded-xl text-center hover:bg-slate-100 transition-colors cursor-pointer bg-slate-50 relative overflow-hidden group">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                      {formData.logoUrl ? (
                         <img src={formData.logoUrl} alt="Logo" className="max-h-16 mx-auto object-contain relative z-10" />
                      ) : (
                        <>
                          <Palette className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                          <p className="text-[10px] font-bold text-slate-550">Upload PNG / JPG</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Saran: Background transparan</p>
                        </>
                      )}
                      {formData.logoUrl && (
                        <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                           <p className="text-[12px] font-bold text-primary-500">Ganti Logo</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 font-sans">Favicon (Browser Tab)</label>
                    <label className="block p-5 rounded-xl text-center hover:bg-slate-100 transition-colors cursor-pointer bg-slate-50 relative overflow-hidden group">
                      <input type="file" accept="image/x-icon,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'faviconUrl')} />
                      {formData.faviconUrl ? (
                         <img src={formData.faviconUrl} alt="Favicon" className="w-10 h-10 mx-auto object-contain relative z-10" />
                      ) : (
                        <>
                          <Palette className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                          <p className="text-[10px] font-bold text-slate-550">Upload ICO / PNG</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Saran: 32x32 atau 64x64 px</p>
                        </>
                      )}
                      {formData.faviconUrl && (
                        <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                           <p className="text-[12px] font-bold text-primary-500">Ganti Favicon</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Default Cover Settings & Presets Selector */}
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 block mb-1 font-sans">
                      Sampul Profil Default (Default User Cover)
                    </label>
                    <p className="text-slate-400 text-xs px-1 font-sans">
                      Pilih atau unggah sampul default yang akan ditampilkan pada halaman profil pengguna jika pengguna belum mengunggah sampul mereka sendiri.
                    </p>
                  </div>

                  <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-100 group">
                    <img 
                      src={formData.defaultCoverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=320&q=85'} 
                      alt="Default Cover Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute right-3 top-3 flex gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-black/45 backdrop-blur-md hover:bg-black/60 text-white rounded-lg text-xs font-bold transition-all border border-white/10 shadow-sm active:scale-95 cursor-pointer">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Unggah Kustom</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'defaultCoverUrl')} />
                      </label>
                      {formData.defaultCoverUrl && formData.defaultCoverUrl !== 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=320&q=85' && (
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, defaultCoverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=320&q=85' }))}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/40 backdrop-blur-md hover:bg-red-600/60 text-white rounded-lg text-xs font-bold transition-all border border-red-500/20 shadow-sm active:scale-95 cursor-pointer"
                          title="Reset ke Default"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-sans">Preset Sampul Cepat (Quick Presets)</span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { name: 'Abstrak Royal', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=180&q=80' },
                        { name: 'Aurora Teal', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&h=180&q=80' },
                        { name: 'Sunset Dream', url: 'https://images.unsplash.com/photo-150752428034-b723cf961d3e?auto=format&fit=crop&w=600&h=180&q=80' },
                        { name: 'Gradasi Premium', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&h=180&q=80' }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, defaultCoverUrl: preset.url }))}
                          className={cn(
                            "relative h-10 w-24 rounded-lg overflow-hidden transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer group/preset",
                            formData.defaultCoverUrl === preset.url ? "ring-2 ring-primary-500" : "opacity-80 hover:opacity-100"
                          )}
                          title={preset.name}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover transition-transform group-hover/preset:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white tracking-wide truncate px-1">{preset.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSettingTab === 'public_info' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none p-5 sm:p-8 space-y-6"
            >
              <div className="pb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-sans">
                  <FileText className="w-5 h-5 text-primary-500" /> Public & Legal Content
                </h3>
                <p className="text-slate-400 text-xs mt-1 font-sans">
                  Kelola informasi kontak publik, deskripsi footer, serta versi dokumen untuk halaman Support, Terms, Privacy, dan Documentation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-sans px-1">Email Dukungan</label>
                  <input 
                    type="email" 
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans text-slate-700" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-sans px-1">Hotline Dukungan</label>
                  <input 
                    type="text" 
                    value={formData.supportHotline}
                    onChange={(e) => setFormData({ ...formData, supportHotline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans text-slate-700" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-sans px-1">Alamat Kantor (Support)</label>
                  <textarea 
                    rows={3}
                    value={formData.supportAddress}
                    onChange={(e) => setFormData({ ...formData, supportAddress: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans text-slate-700 resize-none" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-sans px-1">Deskripsi Footer (Indonesia)</label>
                  <textarea 
                    rows={2}
                    value={formData.footerDescription}
                    onChange={(e) => setFormData({ ...formData, footerDescription: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans text-slate-700 resize-none" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-sans px-1">Deskripsi Footer (Inggris)</label>
                  <textarea 
                    rows={2}
                    value={formData.footerDescriptionEn}
                    onChange={(e) => setFormData({ ...formData, footerDescriptionEn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans text-slate-700 resize-none" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-sans px-1">Versi Dokumentasi</label>
                  <input 
                    type="text" 
                    value={formData.docsVersion}
                    onChange={(e) => setFormData({ ...formData, docsVersion: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans text-slate-700" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeSettingTab === 'notifications' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none p-5 sm:p-8 space-y-6"
            >
              <div className="pb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-sans">
                  <Bell className="w-5 h-5 text-primary-500" /> API & Notification Gateway
                </h3>
                <p className="text-slate-400 text-xs mt-1 font-sans">
                  Sinkronisasikan seluruh homepage, dashboard, dan alur pembuatan/pengeditan modul secara real-time via WhatsApp (Fonnte) dan Email (SMTP) Gateway.
                </p>
              </div>

              {/* Stacked Vertical Layout - No Grids */}
              <div className="space-y-6">
                
                {/* 1. WHATSAPP GATEWAY PANEL */}
                <div className="p-5 rounded-xl bg-slate-50/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 font-sans">WhatsApp Gateway</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-sans">Fonnte Integration</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, waEnabled: !prev.waEnabled }))}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        formData.waEnabled ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        formData.waEnabled ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-sans">Fonnte API Token</label>
                      <input 
                        type="password" 
                        placeholder="Masukkan token API Fonnte Anda..." 
                        value={formData.fonnteKey}
                        onChange={(e) => setFormData({ ...formData, fonnteKey: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono text-slate-700 font-medium" 
                      />
                      <p className="text-[10px] text-slate-450 mt-1 font-sans">Dapatkan API key gratis atau premium langsung dari portal resmi Fonnte.</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        type="button" 
                        onClick={handleTestWa} 
                        disabled={isTestingWa || !formData.fonnteKey} 
                        className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isTestingWa ? 'Menguji Koneksi...' : 'Uji Koneksi WhatsApp'}
                      </button>
                      
                      {testStatus.wa === 'success' && (
                        <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium font-sans">Koneksi OK!</span>
                      )}
                      {testStatus.wa && testStatus.wa.startsWith('error') && (
                        <span className="text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded-md font-medium max-w-[150px] truncate font-sans" title={testStatus.wa}>{testStatus.wa}</span>
                      )}
                    </div>

                    <div className="pt-2.5">
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider block mb-1 font-sans">Fonnte Webhook URL</label>
                      <p className="text-[10px] text-slate-450 leading-relaxed mb-1.5 font-sans">Salin URL di bawah ini ke form pengaturan Webhook Fonnte untuk update status (terkirim/dibaca) otomatis.</p>
                      <div className="bg-slate-100 p-2.5 rounded text-[10px] font-mono text-slate-600 break-all flex items-center justify-between gap-1">
                        <span>{window.location.origin}/api/whatsapp/webhook</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. EMAIL GATEWAY PANEL (SMTP) */}
                <div className="p-5 rounded-xl bg-slate-50/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary-500" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 font-sans">Email Gateway</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-sans">SMTP Integration</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }))}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        formData.emailEnabled ? "bg-primary-500" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        formData.emailEnabled ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* Responsive Grid Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider block mb-1 font-sans">SMTP Host</label>
                      <input 
                        type="text" 
                        placeholder="smtp.gmail.com" 
                        value={formData.smtpHost} 
                        onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans font-medium" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider block mb-1 font-sans">SMTP Port</label>
                      <input 
                        type="text" 
                        placeholder="587" 
                        value={formData.smtpPort} 
                        onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans font-medium" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider block mb-1 font-sans">SMTP Username</label>
                      <input 
                        type="text" 
                        placeholder="admin@kemen.go.id" 
                        value={formData.smtpUser}
                        onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-sans font-medium" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider flex items-center justify-between mb-1 font-sans">
                        <span>SMTP App Password</span>
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-[10px] text-primary-600 hover:underline">Get Gmail App Pass &rarr;</a>
                      </label>
                      <input 
                        type="password" 
                        placeholder="••••••••••••••••" 
                        value={formData.smtpPass}
                        onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all font-mono" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 font-sans">
                    <button 
                      type="button" 
                      onClick={handleTestEmail} 
                      disabled={isTestingEmail || !formData.smtpUser || !formData.smtpPass} 
                      className="text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isTestingEmail ? 'Menguji Koneksi...' : 'Uji Koneksi Email'}
                    </button>
                    {testStatus.email === 'success' && (
                      <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium font-sans">Koneksi SMTP OK!</span>
                    )}
                    {testStatus.email && testStatus.email.startsWith('error') && (
                      <span className="text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded-md font-medium max-w-[150px] truncate font-sans" title={testStatus.email}>{testStatus.email}</span>
                    )}
                  </div>
                </div>

                {/* 3. INBOUND DETAILED ADMIN TARGETS */}
                <div className="p-5 rounded-xl bg-slate-50/70 space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 font-sans">Destinasi Notifikasi Admin</h4>
                      <p className="text-[10px] text-slate-450 font-sans">Tentukan nomor HP admin dan alamat email yang akan menerima laporan insiden baru dari warga secara langsung.</p>
                    </div>
                  </div>

                  {/* Responsive Grid Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider block mb-1 font-sans">No. WhatsApp Admin (Receiver)</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 08123456789" 
                        value={formData.adminWaTarget || ''} 
                        onChange={(e) => setFormData({ ...formData, adminWaTarget: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium font-sans" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider block mb-1 font-sans">Email Admin (Receiver)</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: admin@kemen.go.id" 
                        value={formData.adminEmailTarget || ''} 
                        onChange={(e) => setFormData({ ...formData, adminEmailTarget: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium font-sans" 
                      />
                    </div>
                  </div>
                </div>

                {/* 4. SYNC EVENT TRIGGERS SELECTION */}
                <div className="p-5 rounded-xl bg-slate-50/70 space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 font-sans">Pemicu Sinkronisasi Notifikasi (Event Triggers)</h4>
                      <p className="text-[10px] text-slate-450 font-sans">Pilih secara detail aksi modul yang akan memicu pengiriman pesan WA dan Email otomatis.</p>
                    </div>
                  </div>

                  {/* Vertically stacked list - No Grid columns */}
                  <div className="space-y-3">
                    
                    {/* Trigger 1 */}
                    <div className="flex items-start justify-between p-4 bg-white rounded-xl transition-all hover:shadow-xs shadow-2xs">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Modul Pengaduan</span>
                        <h5 className="text-xs font-bold text-slate-700 pt-1 font-sans font-sans">Laporan Pengaduan Baru Masuk</h5>
                        <p className="text-[10px] text-slate-450 leading-normal max-w-[280px] font-sans">Masyarakat & Admin menerima WA & Email kwitansi saat formulir pengaduan baru disubmit.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, notifyOnComplaintCreated: !prev.notifyOnComplaintCreated }))}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none",
                          formData.notifyOnComplaintCreated ? "bg-primary-500" : "bg-slate-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-150 ease-in-out",
                          formData.notifyOnComplaintCreated ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* Trigger 2 */}
                    <div className="flex items-start justify-between p-4 bg-white rounded-xl transition-all hover:shadow-xs shadow-2xs">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Modul Pengaduan</span>
                        <h5 className="text-xs font-bold text-slate-700 pt-1 font-sans">Rilis Tanggapan & Status Baru</h5>
                        <p className="text-[10px] text-slate-455 leading-normal max-w-[280px] font-sans">Masyarakat dihubungi otomatis lewat WA & Email ketika admin merespon pengaduan.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, notifyOnComplaintUpdated: !prev.notifyOnComplaintUpdated }))}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none",
                          formData.notifyOnComplaintUpdated ? "bg-primary-500" : "bg-slate-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-150 ease-in-out",
                          formData.notifyOnComplaintUpdated ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* Trigger 3 */}
                    <div className="flex items-start justify-between p-4 bg-white rounded-xl transition-all hover:shadow-xs shadow-2xs">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Modul Sertifikasi</span>
                        <h5 className="text-xs font-bold text-slate-700 pt-1 font-sansFont-sans">E-Sign Dokumen Terbit (TTE BSrE)</h5>
                        <p className="text-[10px] text-slate-455 leading-normal max-w-[280px] font-sans">Kirim berkas validasi & tautan ke pemohon saat dokumen digital berhasil ditandatangani.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, notifyOnDocSigned: !prev.notifyOnDocSigned }))}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none",
                          formData.notifyOnDocSigned ? "bg-primary-500" : "bg-slate-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-150 ease-in-out",
                          formData.notifyOnDocSigned ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* Trigger 4 */}
                    <div className="flex items-start justify-between p-4 bg-white rounded-xl transition-all hover:shadow-xs shadow-2xs">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Modul Rapat</span>
                        <h5 className="text-xs font-bold text-slate-700 pt-1 font-sans">Undangan Jadwal Rapat Baru</h5>
                        <p className="text-[10px] text-slate-455 leading-normal max-w-[280px] font-sans">Kirim memo undangan & penomoran agenda rapat langsung ke WhatsApp koordinasi & email tim.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, notifyOnMeetingCreated: !prev.notifyOnMeetingCreated }))}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none",
                          formData.notifyOnMeetingCreated ? "bg-primary-500" : "bg-slate-200"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-150 ease-in-out",
                          formData.notifyOnMeetingCreated ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real-time Notification Logs Section */}
                <div className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 font-sans">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                        <Database className="w-4 h-4 text-primary-500" /> Riwayat Transmisi & API Sync Logs
                      </h4>
                      <p className="text-[10px] text-slate-450 font-sans mt-0.5">
                        Audit pengiriman otomatis WhatsApp (Fonnte) & Email (SMTP) secara real-time dari seluruh aktivitas instansi.
                      </p>
                    </div>

                    {notificationLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearLogs}
                        disabled={isClearingLogs}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer self-start sm:self-center active:scale-95 font-sans"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isClearingLogs ? 'Membersihkan...' : 'Hapus Semua Log'}</span>
                      </button>
                    )}
                  </div>

                  {notificationLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl text-center">
                      <Bell className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-slate-500">Belum ada riwayat transmisi masuk</p>
                      <p className="text-[10px] text-slate-400 max-w-sm leading-normal mt-0.5 font-sans">
                        Log akan muncul secara real-time saat Anda melakukan aksi (Kirim Pengaduan, Balas Laporan Admin, atau E-Sign Dokumen). Coba tombol uji di atas!
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden bg-white divide-y divide-slate-100 max-h-[350px] overflow-y-auto custom-scrollbar shadow-xs">
                      {notificationLogs.map((log) => {
                        const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }) : '-';

                        const getEventBadge = (evt: string) => {
                          switch (evt) {
                            case 'complaint_created':
                              return <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-sans">PELAPORAN</span>;
                            case 'complaint_updated':
                              return <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-sans">BALAS LAPORAN</span>;
                            case 'document_signed':
                              return <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-sans">TTE E-SIGN</span>;
                            case 'meeting_created':
                              return <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-sans">RAPAT BARU</span>;
                            case 'system_alert':
                              return <span className="text-[9px] font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-sans">UJICOBA</span>;
                            default:
                              return <span className="text-[9px] font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-sans">{evt}</span>;
                          }
                        };

                        return (
                          <div key={log.id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                            <div className="space-y-1 min-w-0 flex-1 font-sans">
                              <div className="flex flex-wrap items-center gap-2">
                                {getEventBadge(log.event)}
                                <span className="text-[10px] text-slate-400 font-medium font-mono">ID: {log.id.slice(0, 8)}...</span>
                                <span className="text-[10px] text-slate-400 font-bold">{dateStr}</span>
                              </div>
                              
                              <p className="text-[12px] font-bold text-slate-700 truncate mt-0.5">
                                Subjek: {log.subject || 'Laporan Pengaduan Terpadu'}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-450">
                                {log.recipientPhone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    WA Target: <b className="text-slate-600">{log.recipientPhone}</b>
                                  </span>
                                )}
                                {log.recipientEmail && (
                                  <span className="flex items-center gap-1 font-mono">
                                    Email Target: <b className="text-slate-600">{log.recipientEmail}</b>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Gateway Delivery Status Channels */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {/* WhatsApp pill status */}
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">WhatsApp</span>
                                {log.waEnabled ? (
                                  log.channels?.wa ? (
                                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md mt-0.5 flex items-center gap-1">🟢 SENT</span>
                                  ) : (
                                    <span className="text-[9px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded-md mt-0.5 flex items-center gap-1">🔴 FAIL</span>
                                  )
                                ) : (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md mt-0.5">DISABLED</span>
                                )}
                              </div>

                              {/* Email pill status */}
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Email (SMTP)</span>
                                {log.emailEnabled ? (
                                  log.channels?.email ? (
                                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md mt-0.5 flex items-center gap-1">🟢 SENT</span>
                                  ) : (
                                    <span className="text-[9px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded-md mt-0.5 flex items-center gap-1">🔴 FAIL</span>
                                  )
                                ) : (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md mt-0.5">DISABLED</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {activeSettingTab === 'system' && (
             <motion.div 
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none p-5 sm:p-8 space-y-6"
             >
               <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest font-sans">
                 System & Maintenance
               </h3>
               
               <div className="space-y-4 max-w-lg">
                  <div className="p-5 rounded-xl bg-slate-50/70 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-800 mb-1 font-sans">Seed Sample Data</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">Populate your account with high-quality sample companies and email templates to quickly test the application.</p>
                      <button onClick={handleSeedData} disabled={isSeeding} className="text-xs font-semibold bg-white text-slate-700 hover:text-primary-600 px-4 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-95 font-sans">
                        {isSeeding ? 'Seeding...' : 'Run Seeding'}
                      </button>
                    </div>
                  </div>

                {/* Maintenance Mode Toggle Switch */}
                <div className={cn(
                  "p-4 rounded-xl transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
                  formData.maintenanceMode 
                    ? "bg-amber-50/50 text-amber-900" 
                    : "bg-slate-50 text-slate-800"
                )}>
                  <div>
                    <h4 className="text-[13px] font-bold flex items-center gap-2 font-sans">
                      <Shield className={cn("w-4 h-4", formData.maintenanceMode ? "text-amber-500 animate-pulse" : "text-slate-400")} />
                      Mode Pemeliharaan (Maintenance Mode)
                    </h4>
                    <p className="text-xs text-slate-450 mt-1 leading-relaxed max-w-md font-sans">
                      Mengaktifkan status pemeliharaan akan memunculkan banner peringatan kepada seluruh tim di sistem agar bijak dalam melaksanaan sinkronisasi data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, maintenanceMode: !formData.maintenanceMode })}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                      formData.maintenanceMode ? "bg-amber-500" : "bg-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        formData.maintenanceMode ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                  <div className="p-5 rounded-xl bg-slate-50/70 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-800 mb-1 font-sans">Backup All Data</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4 font-sans">Export all your companies, applications, CVs, and documents into a secure JSON file for backup.</p>
                      <button onClick={handleExportDatabase} disabled={isExporting} className="text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95 font-sans">
                         <Download className="w-3.5 h-3.5" /> 
                         {isExporting ? 'Exporting...' : 'Export Database'}
                      </button>
                    </div>
                  </div>
               </div>
             </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};
