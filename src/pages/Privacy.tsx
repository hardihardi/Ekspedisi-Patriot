import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Privacy = () => {
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
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Kebijakan Privasi (Privacy Policy)</h1>
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p>Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">1. Pengumpulan Data</h2>
              <p>Kami mengumpulkan data pribadi dan operasional yang diperlukan khusus untuk pengelolaan administrasi dan pemantauan program Kawasan 3T, meliputi identitas pengguna, koordinat lokasi pengerjaan, dan metadata dokumen yang diunggah.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">2. Penggunaan Informasi</h2>
              <p>Data yang dikumpulkan digunakan secara internal oleh pemerintah atau badan berwenang untuk:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Melakukan pemantauan dan evaluasi (Monev) secara nyata di lapangan.</li>
                <li>Verifikasi aduan publik.</li>
                <li>Penyederhanaan birokrasi, penjaminan mutu, dan peningkatan proses pengelolaan data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">3. Penyimpanan dan Keamanan Data</h2>
              <p>Informasi yang terkumpul akan disimpan dalam peladen pemerintah yang aman atau penyedia infrastruktur cloud bersertifikat. Kami mengimplementasikan keamanan multi-lapis (termasuk validasi OAuth jika digunakan dan TTE BSrE) untuk menghindari kebocoran data. Namun, kerahasiaan saat pengiriman melalui jaringan internet publik tetap memiliki risiko logis yang patut diwaspadai pihak pengguna.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">4. Pembagian Informasi dengan Pihak Ketiga</h2>
              <p>Sistem ini tidak membagikan, menjual, maupun meminjamkan data identitas personal kepada pihak pengiklan atau entitas komersial lain. Seluruh data hanya dipergunakan sesuai yurisdiksi sistem pemerintahan.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">5. Hubungi Kami</h2>
              <p>Untuk pertanyaan terkait perlindungan privasi atau kebijakan ini, Anda dapat menghubungi meja bantuan operasional IT melalui tautan Kontak pada halaman utama.</p>
            </section>
          </div>
        </motion.div>
      </main>
      
      {/* Footer Minimal */}
      <footer className="text-center py-6 text-sm text-slate-500 bg-white border-t border-slate-300">
        <p>&copy; {new Date().getFullYear()} {appSettings?.appName || 'Sistem Informasi 3T'}. Semua hak dilindungi undang-undang.</p>
      </footer>
    </div>
  );
};
