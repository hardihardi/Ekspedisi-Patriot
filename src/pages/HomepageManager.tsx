import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, AlertTriangle, LayoutTemplate, Type, FileImage, ShieldCheck } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { useStore } from '../store/useStore';
import { AccessDenied } from '../components/AccessDenied';

interface HomepageManagerProps {
  setActiveTab?: (tab: string) => void;
}

export function HomepageManager({ setActiveTab }: HomepageManagerProps) {
  const currentUser = useStore(state => state.user);
  
  const isAuthorized = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat';

  if (!isAuthorized) {
    return (
      <AccessDenied 
        requiredRoles={['superadmin', 'admin_pusat']} 
        currentRole={currentUser?.role || ''} 
        onGoBack={() => setActiveTab?.('dashboard')}
      />
    );
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    hero_headline_id: "Membangun Harapan di Kawasan 3T Indonesia",
    hero_headline_en: "Building Hope in Indonesia's 3T Regions",
    hero_subhead_id: "SaaS Platform untuk Manajemen Transmigrasi Daerah 3T (Papua & Non-Papua). Memantau integrasi ekonomi, pertumbuhan demografi, dan percepatan infrastruktur.",
    hero_subhead_en: "SaaS Platform for 3T Region Transmigration Management (Papua & Non-Papua). Monitoring economic integration, demographic growth, and infrastructure acceleration.",
    stat_locus_val: "124+",
    stat_family_val: "45.000+",
    stat_land_val: "1.2M",
    stat_facility_val: "3.400+",
    about_title_id: "Revitalisasi Transmigrasi Menuju Indonesia Emas",
    about_title_en: "Revitalizing Transmigration Towards Golden Indonesia",
    about_desc_id: "Program transmigrasi saat ini bukan sekadar memindahkan penduduk, melainkan membangun ekosistem kehidupan yang lebih baik, sejahtera, dan terintegrasi di kawasan perbatasan dan pelosok.",
    about_desc_en: "The current transmigration program is not just about relocating citizens, but about building a better, prosperous, and integrated living ecosystem in border and remote areas.",
    lokus_title_id: "Pembagian Lokus Program 3T",
    lokus_title_en: "Division of 3T Program Loci",
    lokus_desc_id: "Kami membagi strategi pengembangan menjadi dua fokus wilayah utama dengan pendekatan operasional dan kultural yang disesuaikan dengan kondisi geografis.",
    lokus_desc_en: "We divide development strategies into two main focus areas with operational and cultural approaches customized to geographical conditions.",
    pilar_title_id: "Pembangunan Berkelanjutan di Kawasan 3T",
    pilar_title_en: "Sustainable Development in 3T Areas",
    pilar_desc_id: "Integrasi percepatan pembangunan berbasis Asta Cita dan program strategis nasional untuk mewujudkan kemandirian daerah tertinggal.",
    pilar_desc_en: "Acceleration of integrated development based on Asta Cita and national strategic programs to realize disadvantaged area independence.",
    cta_title_id: "Mari Bersinergi Membangun Pelosok Negeri",
    cta_title_en: "Let's Collaborate to Build the Nation's Remote Corners",
    cta_desc_id: "Gunakan portal manajemen terpadu kami untuk memantau progress kinerja daerah, mengelola data demografi transmigran, dan memproses laporan logistik secara terpusat.",
    cta_desc_en: "Use our unified management portal to track regional performance, manage transmigrant demographic data, and process logistic reports centrally.",
  });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'settings', 'homepage');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error('Error fetching homepage content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await setDoc(doc(db, 'settings', 'homepage'), formData, { merge: true });
      setMessage({ type: 'success', text: 'Perubahan konten beranda berhasil disimpan.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal menyimpan: ' + err.message });
      handleFirestoreError(err, OperationType.UPDATE, 'homepageSettings');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-primary-500" />
          Manajemen Konten Beranda
        </h2>
        <p className="text-slate-500 mt-1">Ubah teks, statistik, dan informasi utama yang tampil di halaman depan publik.</p>
      </div>

      {message.text && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl mb-6 flex items-center gap-3 font-semibold text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}  
          {message.text}
        </motion.div>
      )}

      <div className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
           <Type className="w-4 h-4 text-slate-400" />
           <h3 className="font-bold text-slate-700">Hero Section (Bagian Atas)</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Headline Utama (Bahasa Indonesia)</label>
             <input type="text" name="hero_headline_id" value={formData.hero_headline_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Main Headline (English)</label>
             <input type="text" name="hero_headline_en" value={formData.hero_headline_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subheadline (Bahasa Indonesia)</label>
             <textarea name="hero_subhead_id" rows={2} value={formData.hero_subhead_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subheadline (English)</label>
             <textarea name="hero_subhead_en" rows={2} value={formData.hero_subhead_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
           <FileImage className="w-4 h-4 text-slate-400" />
           <h3 className="font-bold text-slate-700">Statistik Utama</h3>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Kawasan Lokus</label>
             <input type="text" name="stat_locus_val" value={formData.stat_locus_val} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-lg font-bold text-center focus:border-primary-500 outline-none" placeholder="124+" />
           </div>
           <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kepala Keluarga</label>
             <input type="text" name="stat_family_val" value={formData.stat_family_val} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-lg font-bold text-center focus:border-primary-500 outline-none" placeholder="45.000+" />
           </div>
           <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hektar Lahan</label>
             <input type="text" name="stat_land_val" value={formData.stat_land_val} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-lg font-bold text-center focus:border-primary-500 outline-none" placeholder="1.2M" />
           </div>
           <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fasilitas Bangunan</label>
             <input type="text" name="stat_facility_val" value={formData.stat_facility_val} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-lg font-bold text-center focus:border-primary-500 outline-none" placeholder="3.400+" />
           </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
           <Type className="w-4 h-4 text-slate-400" />
           <h3 className="font-bold text-slate-700">Filosofi Program (About)</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Judul (Bahasa Indonesia)</label>
             <input type="text" name="about_title_id" value={formData.about_title_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Title (English)</label>
             <input type="text" name="about_title_en" value={formData.about_title_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi Singkat (Bahasa Indonesia)</label>
             <textarea name="about_desc_id" rows={2} value={formData.about_desc_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description (English)</label>
             <textarea name="about_desc_en" rows={2} value={formData.about_desc_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
           <Type className="w-4 h-4 text-slate-400" />
           <h3 className="font-bold text-slate-700">Lokus Program (Wilayah)</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Judul (Bahasa Indonesia)</label>
             <input type="text" name="lokus_title_id" value={formData.lokus_title_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Title (English)</label>
             <input type="text" name="lokus_title_en" value={formData.lokus_title_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi (Bahasa Indonesia)</label>
             <textarea name="lokus_desc_id" rows={2} value={formData.lokus_desc_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description (English)</label>
             <textarea name="lokus_desc_en" rows={2} value={formData.lokus_desc_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
           <Type className="w-4 h-4 text-slate-400" />
           <h3 className="font-bold text-slate-700">13 Pilar Program</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Judul (Bahasa Indonesia)</label>
             <input type="text" name="pilar_title_id" value={formData.pilar_title_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Title (English)</label>
             <input type="text" name="pilar_title_en" value={formData.pilar_title_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi (Bahasa Indonesia)</label>
             <textarea name="pilar_desc_id" rows={2} value={formData.pilar_desc_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description (English)</label>
             <textarea name="pilar_desc_en" rows={2} value={formData.pilar_desc_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
           <Type className="w-4 h-4 text-slate-400" />
           <h3 className="font-bold text-slate-700">Call To Action (Bawah)</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Judul CTA (Bahasa Indonesia)</label>
             <input type="text" name="cta_title_id" value={formData.cta_title_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">CTA Title (English)</label>
             <input type="text" name="cta_title_en" value={formData.cta_title_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Deskripsi CTA (Bahasa Indonesia)</label>
             <textarea name="cta_desc_id" rows={2} value={formData.cta_desc_id} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">CTA Description (English)</label>
             <textarea name="cta_desc_en" rows={2} value={formData.cta_desc_en} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-primary-500 outline-none resize-none" />
           </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
