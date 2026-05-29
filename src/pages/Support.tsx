import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Headphones, Mail, Phone, MapPin } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Support = () => {
  const { appSettings } = useStore();
  
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary-100 selection:text-primary-700">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
            {appSettings?.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo" className="w-8 h-8 rounded shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg">KS</span>
              </div>
            )}
            <div>
              <p className="text-base font-bold text-slate-800 leading-tight">{appSettings?.appName || 'Sistem Informasi 3T'}</p>
            </div>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-10">
           <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <Headphones className="w-8 h-8" />
           </div>
           <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Pusat Bantuan & Dukungan</h1>
           <p className="text-slate-500">Hubungi kami melalui kanal berikut jika Anda menemukan kendala operasional, masalah login, atau anomali sistem.</p>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-primary-500 transition-colors cursor-pointer group">
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-1">Email Dukungan</h3>
             <p className="text-sm text-slate-500 mb-3">Tanggapan dalam 1-2 hari kerja untuk laporan insiden.</p>
             <p className="font-semibold text-blue-600">{appSettings?.supportEmail || 'support@sistem-3t.go.id'}</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-emerald-500 transition-colors cursor-pointer group">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-1">Call Center Operasional</h3>
             <p className="text-sm text-slate-500 mb-3">Senin - Jumat | 08:00 - 16:00 WIB.</p>
             <p className="font-semibold text-emerald-600">{appSettings?.supportHotline || '1500-123'}</p>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent"
        >
             <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-1">Kantor Pusat Administrasi</h3>
             <p className="text-sm text-slate-500 mb-4">{appSettings?.instansiName || 'Kementerian Desa PDTT'}</p>
             <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 whitespace-pre-wrap">
               {appSettings?.supportAddress || 'Jalan TMP Kalibata No.17, Pancoran,\\nKota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12750\\nGedung Utama Lt. 4'}
             </div>
        </motion.div>

      </main>
      
      <footer className="text-center py-6 text-sm text-slate-500 bg-white border-t border-slate-300">
        <p>&copy; {new Date().getFullYear()} {appSettings?.appName || 'Sistem Informasi 3T'}. Semua hak dilindungi undang-undang.</p>
      </footer>
    </div>
  );
};
