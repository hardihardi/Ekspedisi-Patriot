import React from 'react';
import { Settings, Wrench, RefreshCw, Construction, Mail } from 'lucide-react';
import { useStore } from '../store/useStore';

const MaintenancePage = () => {
  const { appSettings } = useStore();
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-amber-200/20 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-primary-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-8 md:p-12 text-center relative z-10 flex flex-col items-center">
        
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-amber-50 rounded-2xl rotate-12 absolute inset-0 m-auto -z-10 shadow-sm border border-amber-100/50"></div>
          <div className="w-24 h-24 bg-primary-50 rounded-2xl -rotate-6 absolute inset-0 m-auto -z-10 shadow-sm border border-primary-100/50"></div>
          <div className="w-24 h-24 bg-white rounded-2xl shadow-[0_2px_12px_0_rgba(67,89,113,0.12)] flex items-center justify-center relative z-10 border border-slate-50">
             <Construction className="w-12 h-12 text-amber-500" strokeWidth={1.5} />
          </div>
          
          <div className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-sm border border-slate-100 animate-[bounce_3s_infinite]">
            <Settings className="w-6 h-6 text-slate-400" />
          </div>
          <div className="absolute -bottom-2 -left-3 bg-white rounded-full p-2 shadow-sm border border-slate-100 animate-[spin_8s_linear_infinite]">
            <RefreshCw className="w-5 h-5 text-primary-400" />
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight leading-tight">
          Sistem Sedang<br className="md:hidden" /> Dalam <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-primary-600">Pemeliharaan</span>
        </h1>
        
        <p className="text-slate-500 text-[15px] md:text-lg mb-8 max-w-lg mx-auto leading-relaxed font-medium">
          Kami sedang melakukan peningkatan sistem dan sinkronisasi data {appSettings?.appName ? `untuk ${appSettings.appName}` : 'untuk memberikan pengalaman terbaik'}. Harap kembali beberapa saat lagi.
        </p>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 md:p-6 w-full max-w-md text-left mb-8 shadow-sm">
           <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
             <Wrench className="w-4 h-4 text-primary-500" />
             Informasi Pemeliharaan
           </h3>
           <ul className="space-y-3 text-sm text-slate-600">
             <li className="flex items-start gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
               <span>Pembaruan infrastruktur database & server</span>
             </li>
             <li className="flex items-start gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
               <span>Peningkatan sistem keamanan aplikasi</span>
             </li>
           </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
           <a href={`mailto:${appSettings?.contactEmail || 'admin@example.com'}`} className="w-full sm:w-auto px-8 py-3.5 bg-primary-600 text-white font-bold rounded-xl shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] hover:bg-primary-700 hover:shadow-lg transition-all active:scale-95 text-[13px] uppercase tracking-widest flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" /> Hubungi Dukungan
           </a>
           <a href="/login" className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-600 font-bold rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 text-[13px] uppercase tracking-widest text-center">
             Admin Login
           </a>
        </div>
      </div>

      <div className="mt-12 text-slate-400 text-xs font-semibold text-center z-10">
        &copy; {new Date().getFullYear()} {appSettings?.instansiName || 'Kementerian Transmigrasi'}. All rights reserved.<br/>
        {appSettings?.appName || 'Sistem Terpadu Lokus 3T'}
      </div>
    </div>
  );
};

export default MaintenancePage;
