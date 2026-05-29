import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, Save, Camera, Trash2, Key, User, Briefcase, MapPin, Mail, Phone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const Profile: React.FC = () => {
  const { user, setUser, appSettings } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    nip: '',
    role: 'Admin Pusat',
    department: 'Kementerian Desa, Pembangunan Daerah Tertinggal, dan Transmigrasi',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    photoURL: '',
    coverUrl: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.email) {
        try {
          const docId = user.uid || auth.currentUser?.uid || user.email.replace(/[@.]/g, '_');
          const emailDocId = user.email.replace(/[@.]/g, '_');
          
          let dbData = null;
          
          if (docId) {
            const userDoc = await getDoc(doc(db, 'users', docId));
            if (userDoc.exists()) {
              dbData = userDoc.data();
            }
          }
          
          if (!dbData && emailDocId) {
            const emailDoc = await getDoc(doc(db, 'users', emailDocId));
            if (emailDoc.exists()) {
              dbData = emailDoc.data();
            }
          }
          
          setFormData(prev => ({
            ...prev,
            displayName: dbData?.name || dbData?.displayName || user.displayName || '',
            email: user.email || prev.email,
            role: dbData?.role || user.role || prev.role,
            nip: dbData?.nip || user.nip || prev.nip,
            department: dbData?.department || dbData?.instansi || user.instansi || prev.department,
            phone: dbData?.phone || prev.phone,
            address: dbData?.address || prev.address,
            photoURL: dbData?.photoURL || user.photoURL || '',
            coverUrl: dbData?.coverUrl || user.coverUrl || '',
          }));
        } catch (error) {
          console.error("Error fetching user data from DB:", error);
          setFormData(prev => ({
            ...prev,
            displayName: user.displayName || '',
            email: user.email || prev.email,
            role: user.role || prev.role,
            nip: user.nip || prev.nip,
            department: user.instansi || prev.department,
            photoURL: user.photoURL || '',
            coverUrl: user.coverUrl || '',
          }));
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'photoURL' | 'coverUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = key === 'photoURL' ? 256 : 1024;
          
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
            const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
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

  const handleSave = async () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('Password baru tidak cocok!');
      return;
    }

    if (auth.currentUser) {
      try {
        if (formData.newPassword && formData.currentPassword) {
           const credential = EmailAuthProvider.credential(auth.currentUser.email!, formData.currentPassword);
           await reauthenticateWithCredential(auth.currentUser, credential);
           await updatePassword(auth.currentUser, formData.newPassword);
        }

        await updateProfile(auth.currentUser, {
          displayName: formData.displayName,
          photoURL: formData.photoURL
        });
        
        const docId = auth.currentUser.uid;
        const emailDocId = auth.currentUser.email!.replace(/[@.]/g, '_');
        
        const updateData = {
           uid: auth.currentUser.uid,
           displayName: formData.displayName,
           name: formData.displayName,
           nip: formData.nip,
           department: formData.department,
           instansi: formData.department,
           phone: formData.phone,
           address: formData.address,
           email: auth.currentUser.email,
           role: formData.role,
           photoURL: formData.photoURL,
           coverUrl: formData.coverUrl
        };
        
        // Write to both primary UID and fallback email document formats
        await setDoc(doc(db, 'users', docId), updateData, { merge: true });
        await setDoc(doc(db, 'users', emailDocId), updateData, { merge: true });
        
        if (user) {
          setUser({
            ...user,
            displayName: formData.displayName,
            nip: formData.nip,
            instansi: formData.department,
            photoURL: formData.photoURL,
            coverUrl: formData.coverUrl
          });
        }
        alert('Profil berhasil diperbarui!');
        setFormData(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Gagal memperbarui profil. Pastikan password lama benar dan Anda terkoneksi ke jaringan.');
        import('../lib/firebase').then(({ handleFirestoreError, OperationType }) => {
           handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
        });
      }
    } else {
        if (formData.newPassword) {
           alert('Mock Password Updated!');
        }
        if (user) {
           setUser({
             ...user,
             displayName: formData.displayName,
             nip: formData.nip,
             instansi: formData.department,
             photoURL: formData.photoURL,
             coverUrl: formData.coverUrl
           });
         }
        alert('Profil berhasil diperbarui!');
        setFormData(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profil Pengguna</h1>
          <p className="text-slate-500 text-sm mt-0.5">Kelola informasi pribadi, kontak, dan keamanan akun Anda.</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-0 overflow-hidden flex flex-col"
      >
        {/* Cover Image Section */}
        <div className="relative h-44 sm:h-56 md:h-64 w-full bg-slate-100 overflow-hidden group">
          <img 
            src={formData.coverUrl || appSettings?.defaultCoverUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=320&q=85"} 
            alt="Cover" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" 
            referrerPolicy="no-referrer"
          />
          
          {/* Controls overlay */}
          <div className="absolute right-4 top-4 flex gap-2">
            <button 
              type="button" 
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/45 backdrop-blur-md hover:bg-black/60 text-white rounded-lg text-xs font-bold transition-all border border-white/15 shadow-md active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{formData.coverUrl ? 'Ubah Sampul' : 'Unggah Sampul'}</span>
            </button>
            {formData.coverUrl && (
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, coverUrl: '' }))}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/40 backdrop-blur-md hover:bg-red-600/60 text-white rounded-lg text-xs font-bold transition-all border border-red-500/20 shadow-md active:scale-95 cursor-pointer"
                title="Hapus Sampul"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={(e) => handleImageUpload(e, 'coverUrl')} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Profile Avatar & Info Section - Centered Responsively */}
        <div className="relative flex flex-col items-center -mt-14 sm:-mt-18 md:-mt-22 px-4 pb-6 border-b border-slate-100 shrink-0">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] shrink-0 relative group cursor-pointer"
          >
            {formData.photoURL ? (
              <img src={formData.photoURL} alt="Profile Picture" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                <User className="w-12 h-12 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all duration-200">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleImageUpload(e, 'photoURL')} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="text-center mt-4 max-w-xl w-full">
            <h4 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
              {formData.displayName || 'Nama Pengguna'}
            </h4>
            
            <p className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 shadow-xs border border-primary-100/50">
               <Briefcase className="w-3.5 h-3.5" /> {formData.role.replace('_', ' ')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 border-0 active:scale-95 cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" /> Ganti Foto
              </button>
              {formData.photoURL && (
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
                  className="px-3.5 py-2 text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all flex items-center gap-1.5 shadow-xs border-0 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields Section */}
        <div className="p-5 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-[13px] font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-primary-600" /> Informasi Pribadi
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={formData.displayName} 
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-slate-700 outline-none focus:bg-white focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[14px] text-slate-700 outline-none focus:bg-white focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">No. HP / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[14px] text-slate-700 outline-none focus:bg-white focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Alamat Domisili</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea 
                        value={formData.address} 
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[14px] text-slate-700 outline-none focus:bg-white focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all min-h-[100px]" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[13px] font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Briefcase className="w-4 h-4 text-slate-400" /> Informasi Instansi
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">NIP (Nomor Induk Pegawai)</label>
                    <input 
                      type="text" 
                      placeholder="NIP" 
                      value={formData.nip}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-slate-700 outline-none focus:bg-white focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Instansi / Unit Kerja</label>
                    <input 
                      type="text" 
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-slate-700 outline-none focus:bg-white focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-[13px] font-semibold text-slate-700 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Key className="w-4 h-4 text-emerald-500" /> Keamanan Akun
                </h4>
                <div className="bg-slate-50/50 rounded-xl p-4 sm:p-5 border-0 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Password Saat Ini</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-slate-700 outline-none focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Password Baru</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-slate-700 outline-none focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-1">Ulangi Password Baru</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-slate-700 outline-none focus:border-primary-500 focus:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all" 
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium pt-2">
                    <Shield className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> Setidaknya 8 karakter, berisi huruf besar dan angka.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end shadow-none">
            <button 
              onClick={handleSave} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-2.5 rounded-lg text-[13px] font-semibold tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.25rem_0.5rem_rgba(105,108,255,0.4)] active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Perubahan Profil
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
