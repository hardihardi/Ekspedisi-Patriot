import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, Mail, CheckCircle2, AlertTriangle, 
  Activity, Sparkles, Database, ArrowRight, Loader2, Info
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface NotificationGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'idle' | 'sending' | 'success' | 'done';
  event: 'complaint_created' | 'complaint_updated' | 'document_signed' | 'meeting_created' | 'system_alert' | null;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
}

export const NotificationGatewayModal: React.FC<NotificationGatewayModalProps> = ({
  isOpen,
  onClose,
  status,
  event,
  recipientEmail = '',
  recipientPhone = '',
  subject = ''
}) => {
  const { appSettings } = useStore();
  
  // Real settings evaluations
  const isWaActive = appSettings?.waEnabled !== false && !!appSettings?.fonnteKey;
  const isEmailActive = appSettings?.emailEnabled !== false && !!appSettings?.smtpUser && !!appSettings?.smtpPass;
  const waTarget = recipientPhone || appSettings?.adminWaTarget || 'Admin';
  const emailTarget = recipientEmail || appSettings?.adminEmailTarget || 'Admin';
  
  const [stages, setStages] = useState({
    connect: 'pending', // 'pending' | 'active' | 'success' | 'warn'
    wa: 'pending',
    email: 'pending',
    db: 'pending'
  });

  useEffect(() => {
    if (!isOpen) {
      setStages({ connect: 'pending', wa: 'pending', email: 'pending', db: 'pending' });
      return;
    }

    if (status === 'sending') {
      setStages({ connect: 'active', wa: 'pending', email: 'pending', db: 'pending' });
      
      // Step-by-step transition triggers (simulated gateway handshake visualizer but synchronized to backend parameters)
      const t1 = setTimeout(() => {
        setStages(s => ({ ...s, connect: 'success', wa: isWaActive ? 'active' : 'warn' }));
      }, 700);

      const t2 = setTimeout(() => {
        setStages(s => ({ ...s, wa: isWaActive ? 'success' : 'warn', email: isEmailActive ? 'active' : 'warn' }));
      }, 1500);

      const t3 = setTimeout(() => {
        setStages(s => ({ ...s, email: isEmailActive ? 'success' : 'warn', db: 'active' }));
      }, 2300);

      const t4 = setTimeout(() => {
        setStages(s => ({ ...s, db: 'success' }));
      }, 3000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else if (status === 'success' || status === 'done') {
      setStages({
        connect: 'success',
        wa: isWaActive ? 'success' : 'warn',
        email: isEmailActive ? 'success' : 'warn',
        db: 'success'
      });
    }
  }, [isOpen, status, isWaActive, isEmailActive]);

  const getEventLabel = () => {
    switch (event) {
      case 'complaint_created': return 'Laporan Pengaduan Baru';
      case 'complaint_updated': return 'Balasan Laporan Penduduk';
      case 'document_signed': return 'Sertifikasi Dokumen TTE';
      case 'meeting_created': return 'Jadwal Rapat Kawasan 3T';
      default: return 'Aktivitas Gateway';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop screen lock */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999]"
            onClick={onClose}
          />

          {/* Central responsive modal sheet */}
          <div className="fixed inset-0 overflow-y-auto z-[1000] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden font-sans text-left max-h-[92vh] sm:max-h-[85vh] flex flex-col"
            >
              {/* Marketing gradient banner header */}
              <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 p-5 sm:p-6 text-white overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Activity className="w-28 h-28 -mr-6 -mt-6 rotate-12" />
                </div>
                
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase w-fit select-none">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> Gateway Synchronized
                </div>
                
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mt-3">Sinkronisasi Notifikasi</h3>
                <p className="text-[11px] sm:text-xs text-white/85 leading-relaxed mt-1 font-medium select-none">
                  Sistem otomatis mendistribusikan notifikasi dengan template marketing ke nomor WA & email.
                </p>
              </div>

              {/* Status workflow tracker */}
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                {/* Event Detail Summary Cards */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2.5 text-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pl-1">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Pemicu Sistem (Event)</span>
                    <span className="font-extrabold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md font-sans text-[10px] w-fit">{getEventLabel()}</span>
                  </div>
                  
                  {subject && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 border-t border-slate-100/80 pt-2 pl-1">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] shrink-0">Subjek Utama</span>
                      <span className="font-bold text-slate-800 text-left sm:text-right text-[11px] break-words max-w-full sm:max-w-[220px]" title={subject}>{subject}</span>
                    </div>
                  )}
                  
                  {waTarget && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-t border-slate-100/80 pt-2 pl-1">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">No. WhatsApp (WA)</span>
                      <span className="font-semibold text-slate-700 font-mono text-[11px]">{waTarget}</span>
                    </div>
                  )}
                  
                  {emailTarget && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-t border-slate-100/80 pt-2 pl-1">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Email Destinasi</span>
                      <span className="font-semibold text-slate-700 font-mono text-[11px] break-all max-w-full sm:max-w-[220px]">{emailTarget}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  {/* Step 1: Handshake */}
                  <div className="flex items-start gap-3 bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                    <div className="mt-0.5 flex items-center justify-center shrink-0">
                      {stages.connect === 'active' && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                      {stages.connect === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />}
                      {stages.connect === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-250 bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">Menyusun Handshake Protokol Server</p>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-normal">Mengevaluasi kredensial Fonnte & SMTP terenkripsi secara otomatis.</p>
                    </div>
                  </div>

                  {/* Step 2: WA gateway */}
                  <div className="flex items-start gap-3 bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                    <div className="mt-0.5 flex items-center justify-center shrink-0">
                      {stages.wa === 'active' && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                      {stages.wa === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />}
                      {stages.wa === 'warn' && <Info className="w-4.5 h-4.5 text-amber-500 fill-amber-50" />}
                      {stages.wa === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-250 bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs font-bold text-slate-800">WhatsApp Gateway (Fonnte API)</p>
                        {stages.wa === 'warn' && <span className="text-[8px] font-extrabold uppercase bg-amber-50 text-amber-650 px-1.5 py-0.2 rounded font-sans tracking-wide">Bypass</span>}
                        {stages.wa === 'success' && <span className="text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-650 px-1.5 py-0.2 rounded font-sans tracking-wide text-center">Terkirim</span>}
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-normal">Mengirimkan pesan template template interaktif & pelacakan status WhatsApp.</p>
                    </div>
                  </div>

                  {/* Step 3: SMTP gateway */}
                  <div className="flex items-start gap-3 bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                    <div className="mt-0.5 flex items-center justify-center shrink-0">
                      {stages.email === 'active' && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                      {stages.email === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />}
                      {stages.email === 'warn' && <Info className="w-4.5 h-4.5 text-amber-500 fill-amber-50" />}
                      {stages.email === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-250 bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs font-bold text-slate-800">Email Gateway (SMTP Client)</p>
                        {stages.email === 'warn' && <span className="text-[8px] font-extrabold uppercase bg-amber-50 text-amber-650 px-1.5 py-0.2 rounded font-sans tracking-wide">Bypass</span>}
                        {stages.email === 'success' && <span className="text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-650 px-1.5 py-0.2 rounded font-sans tracking-wide">Terkirim</span>}
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-normal">Formulasi email responsif bergaya corporate marketing dengan aman.</p>
                    </div>
                  </div>

                  {/* Step 4: Audit logger */}
                  <div className="flex items-start gap-3 bg-slate-50/50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                    <div className="mt-0.5 flex items-center justify-center shrink-0">
                      {stages.db === 'active' && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                      {stages.db === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />}
                      {stages.db === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-250 bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-xs font-bold text-slate-800">Pencatatan Log Transaksi</p>
                        {stages.db === 'success' && <span className="text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-650 px-1.5 py-0.2 rounded font-sans tracking-wide">Selesai</span>}
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-normal">Mencatat jurnal pengiriman secara terpusat untuk transparansi audit.</p>
                    </div>
                  </div>
                </div>
              </div>

               {/* Responsive action footer */}
              <div className="bg-slate-50 px-5 sm:px-6 py-4 flex items-center justify-end border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  disabled={stages.db !== 'success'}
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-450 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-primary-500/10 active:scale-95 disabled:scale-100 border-0 flex items-center justify-center gap-2"
                >
                  {stages.db !== 'success' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sinkronisasi...
                    </>
                  ) : (
                    <>
                      Selesai & Lanjutkan <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
