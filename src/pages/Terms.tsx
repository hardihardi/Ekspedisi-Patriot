import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Terms = () => {
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
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Syarat dan Ketentuan (Terms of Service)</h1>
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p>Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">1. Penerimaan Syarat</h2>
              <p>Dengan mengakses atau menggunakan sistem {appSettings?.appName || 'Sistem Informasi 3T'}, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari syarat ini, Anda dilarang mengakses sistem.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">2. Penggunaan Sistem</h2>
              <p>Sistem ini merupakan portal resmi untuk pemantauan, pelaporan, dan pengelolaan data pembangunan infrastruktur dan sumber daya transmigrasi pada kawasan Tertinggal, Terdepan, dan Terluar (3T). Pengguna wajib memberikan informasi yang akurat dan dapat dipertanggungjawabkan.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Tidak menyalahgunakan data atau mengunggah dokumen palsu.</li>
                <li>Menjaga kerahasiaan kredensial login (bagi authorized user).</li>
                <li>Menaati peraturan dan perundang-undangan Negara Kesatuan Republik Indonesia (NKRI).</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">3. Tanggung Jawab Pengguna</h2>
              <p>Segala kerugian atau pelanggaran hukum yang diakibatkan kelalaian pengguna dalam menjaga kerahasiaan akun atau penyalahgunaan fitur sistem sepenuhnya menjadi tanggung jawab pengguna yang bersangkutan.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">4. Hak Milik Intelektual</h2>
              <p>Seluruh desain, teks, grafis, antarmuka, dan kode sumber sistem adalah milik Kementerian/Lembaga terkait yang mengembangkan, dan dilindungi oleh undang-undang Hak Cipta.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">5. Perubahan Syarat</h2>
              <p>Kami berhak sewaktu-waktu, atas kebijakan kami sendiri, untuk mengubah atau mengganti Syarat ini. Versi terbaru akan diunggah pada halaman ini.</p>
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
