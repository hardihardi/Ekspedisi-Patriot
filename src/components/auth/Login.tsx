import React, { useState } from 'react';
import { auth, signInWithGoogle } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../../store/useStore';

export const Login: React.FC = () => {
  const { appSettings } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email atau password salah');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar, silakan login');
      } else if (err.code === 'auth/weak-password') {
        setError('Password minimal 6 karakter');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('auth/operation-not-allowed: Provider Email & Password belum diaktifkan di Firebase Console.');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      {/* Left section: Branding (hidden on small screens) */}
      <div className="hidden md:flex flex-col flex-1 items-center justify-center bg-primary-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--theme-primary-500) 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10 max-w-lg text-center px-12"
        >
           {appSettings?.logoUrl ? (
            <img src={appSettings.logoUrl} alt="Logo" className="max-h-24 mx-auto mb-8 object-contain drop-shadow-xl" />
          ) : (
            <div className="w-24 h-24 mx-auto mb-8 bg-primary-600 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(105,108,255,0.4)]">
              <span className="text-white font-bold text-5xl leading-none">
                {appSettings?.appName ? appSettings.appName.charAt(0).toUpperCase() : 'T'}
              </span>
            </div>
          )}
          <h2 className="text-4xl font-extrabold text-slate-800 mb-6">
            Sistem Informasi <br/><span className="text-primary-600">Transmigrasi 3T</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Platform tata kelola dan pemantauan terpadu untuk kawasan tertinggal, terdepan, dan terluar di Indonesia.
          </p>
        </motion.div>
      </div>

      {/* Right section: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 sm:p-10 bg-white rounded-2xl shadow-[0_2px_12px_0_rgba(67,89,113,0.1)] border-none"
        >
          <div className="md:hidden flex justify-center mb-6">
            {appSettings?.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo" className="max-h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-[0_2px_4px_rgba(105,108,255,0.4)]">
                <span className="text-white font-bold text-2xl leading-none">
                  {appSettings?.appName ? appSettings.appName.charAt(0).toUpperCase() : 'T'}
                </span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight text-center md:text-left">
            {isLogin ? 'Selamat Datang Kembali! 👋' : 'Buat Akun Baru 🚀'}
          </h1>
          <p className="text-[13px] text-slate-500 mb-8 font-medium text-center md:text-left">
            {isLogin ? 'Silakan masuk ke akun Anda untuk melanjutkan' : 'Daftar untuk mengakses sistem manajemen'}
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {error.includes('auth/operation-not-allowed') || error.includes('Firebase Console') ? (
                <div className="space-y-2 text-left">
                  <p className="font-bold text-center text-red-800 text-sm flex items-center justify-center gap-1">
                    ⚠️ Provider Email/Password Belum Aktif
                  </p>
                  <p className="leading-relaxed font-normal text-slate-600">
                    Metode masuk menggunakan <strong>Email & Password</strong> belum diaktifkan pada modul Firebase Authentication Anda. Silakan aktifkan dengan langkah berikut:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 font-mono text-[10.5px] bg-white/80 p-2.5 rounded border border-red-100/50 text-slate-700">
                    <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-bold">Firebase Console</a></li>
                    <li>Pilih proyek Anda &gt; Menu <strong>Authentication</strong></li>
                    <li>Tab <strong>Sign-in method</strong> &gt; Klik <strong>Add new provider</strong></li>
                    <li>Pilih <strong>Email/Password</strong>, aktifkan (Enable), dan klik <strong>Save/Simpan</strong></li>
                  </ol>
                  <p className="leading-relaxed font-normal text-slate-600 mt-2">
                    Sebagai alternatif sementara, Anda dapat masuk menggunakan metode <strong>Google</strong> di bawah ini.
                  </p>
                </div>
              ) : (
                <p className="font-semibold text-center leading-normal">{error}</p>
              )}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@transmigrasi.go.id" 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-primary-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                {isLogin && (
                  <button type="button" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Lupa password?</button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-primary-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 px-6 rounded-lg font-semibold text-[14px] tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] disabled:opacity-70 mt-4"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : isLogin ? (
                <>Masuk <LogIn className="w-4 h-4 ml-1" /></>
              ) : (
                <>Daftar <UserPlus className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-x-0 h-px bg-slate-200"></div>
            <span className="relative bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">ATAU</span>
          </div>
          
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              if (loading) return;
              try {
                await signInWithGoogle();
              } catch (error: any) {
                if (error.code === 'auth/popup-closed-by-user') {
                  console.warn('Sign-in popup closed by user');
                } else {
                  console.error(error);
                  setError('Gagal login dengan Google');
                }
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-2.5 px-6 rounded-lg font-semibold text-[13px] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Google
          </button>

          <div className="mt-8 text-center">
            <p className="text-[13px] font-medium text-slate-500">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
              <button 
                type="button"
                onClick={() => {
                   setIsLogin(!isLogin);
                   setError('');
                }}
                className="ml-1 text-primary-600 font-semibold hover:underline"
              >
                {isLogin ? 'Daftar sekarang' : 'Masuk ke akun'}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold opacity-60 m-0">
              Koneksi BSrE BSSN: Terverifikasi
            </p>
            <button 
              type="button"
              onClick={() => window.location.href = '/verify'}
              className="text-[10px] text-primary-600 font-bold uppercase tracking-widest hover:underline"
            >
              Portal TTE
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
