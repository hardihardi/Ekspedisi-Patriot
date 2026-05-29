import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface AccessDeniedProps {
  requiredRoles: string[];
  currentRole: string;
  onGoBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRoles, currentRole, onGoBack }) => {
  const roleLabels: Record<string, string> = {
    superadmin: 'Superadmin',
    admin_pusat: 'Admin Pusat',
    admin_daerah: 'Admin Daerah',
    petugas_lapangan: 'Petugas Lapangan',
    pimpinan: 'Pimpinan / Direksi',
  };

  const formattedRequired = requiredRoles.map(r => roleLabels[r] || r).join(' atau ');
  const formattedCurrent = roleLabels[currentRole] || currentRole || 'Belum Terdefinisi';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 sm:p-6 text-center animate-fade-in font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-slate-100 p-8 flex flex-col items-center relative overflow-hidden"
      >
        {/* Background decorative glow */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-amber-400 to-primary-500"></div>
        <div className="absolute top-[-5%] right-[-5%] w-32 h-32 bg-red-100/30 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100 relative z-10 animate-[pulse_3s_infinite]">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-sm">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight mb-3">
          Akses Terbatas: Izin Ditolak
        </h2>
        
        <p className="text-slate-500 text-[13.5px] leading-relaxed mb-6">
          Akun Anda memiliki peran <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{formattedCurrent}</span> yang tidak memiliki otoritas untuk mengakses modul/halaman manajemen ini.
        </p>

        <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-6 text-xs sm:text-[13px]">
          <span className="font-bold text-slate-600 block mb-1 uppercase tracking-wider">Peran Minimum yang Dibutuhkan:</span>
          <span className="text-primary-600 font-bold bg-primary-500/10 px-2 py-1 rounded inline-block mt-1">
            {formattedRequired}
          </span>
        </div>

        {onGoBack && (
          <button 
            onClick={onGoBack}
            className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 text-xs sm:text-[13px] uppercase tracking-widest active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </button>
        )}
      </motion.div>
    </div>
  );
};
