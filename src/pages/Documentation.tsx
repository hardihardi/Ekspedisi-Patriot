import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, Settings, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Documentation = () => {
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
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="mb-10">
           <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4 inline-block">Versi {appSettings?.docsVersion || '1.2.0'}</span>
           <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Dokumentasi Sistem 3T</h1>
           <p className="text-lg text-slate-500 max-w-2xl">Panduan lengkap operasional, standar integrasi API, dan panduan keamanan infrastruktur sistem portal dashboard nasional.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
               <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Panduan Pengguna (User Manual)</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Cara menggunakan fitur-fitur dasar seperti pengelolaan data proyek, input transmigran, dan navigasi dashboard.</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">Baca Selengkapnya &rarr;</a>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4">
               <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Manajemen Konfigurasi</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Penyesuaian variabel global, perubahan tema UI organisasi, hingga manajemen logo aplikasi untuk Admin.</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">Baca Selengkapnya &rarr;</a>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
               <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">TTE & Validasi Dokumen</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Alur verifikasi keaslian dokumen elektronik (SK, Surat Tugas) menggunakan QR Code Tanda Tangan Elektronik.</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Baca Selengkapnya &rarr;</a>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent lg:col-span-3">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                 <h3 className="text-lg font-bold text-slate-800 mb-1">Standar Keamanan dan Kebijakan Kata Sandi</h3>
                 <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">Penerapan Firebase Auth dengan rule Firestore ketat berdasar Roles. Pengguna dilarang keras saling bertukar kredensial. Aktivitas login di luar batas IP Address terotorisasi akan disuspend sementara.</p>
              </div>
              <a href="#" onClick={(e) => e.preventDefault()} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors shrink-0">Baca Kebijakan</a>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="text-center py-6 text-sm text-slate-500 bg-white border-t border-slate-300">
        <p>&copy; {new Date().getFullYear()} {appSettings?.appName || 'Sistem Informasi 3T'}. Semua hak dilindungi undang-undang.</p>
      </footer>
    </div>
  );
};
