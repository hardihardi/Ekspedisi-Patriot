import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, AlertTriangle, Type, FileImage, ShieldCheck, 
  UploadCloud, Trash2, Plus, X, Link, Image as ImageIcon, Check, RefreshCw, 
  Tag, Info, Layers, Eye, Smartphone, Monitor, CheckCircle, Flame, Activity as ActivityIcon, Sparkles, ChevronRight, HelpCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

import { useStore } from '../store/useStore';
import { AccessDenied } from '../components/AccessDenied';

interface HomepageManagerProps {
  setActiveTab?: (tab: string) => void;
}

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  uploadedAt: string;
}

// Sparkline Mock Data matching Sneat template visual shapes
const NEW_VISITORS_DATA = [
  { day: 'M', value: 12 },
  { day: 'T', value: 24 },
  { day: 'W', value: 16 },
  { day: 'T', value: 38 },
  { day: 'F', value: 20 },
  { day: 'S', value: 45 },
  { day: 'S', value: 30 },
];

const ACTIVITY_LINE_DATA = [
  { name: 'A1', value: 35 },
  { name: 'A2', value: 70 },
  { name: 'A3', value: 45 },
  { name: 'A4', value: 82 },
  { name: 'A5', value: 55 },
  { name: 'A6', value: 95 },
  { name: 'A7', value: 60 },
  { name: 'A8', value: 85 },
];

const TOTAL_INCOME_DATA = [
  { month: 'Jan', income: 1800, expenses: 1100 },
  { month: 'Feb', income: 2400, expenses: 1300 },
  { month: 'Mar', income: 2000, expenses: 1400 },
  { month: 'Apr', income: 3500, expenses: 2100 },
  { month: 'Mei', income: 2800, expenses: 1800 },
  { month: 'Jun', income: 4800, expenses: 2500 },
  { month: 'Jul', income: 3800, expenses: 2200 },
  { month: 'Agu', income: 4200, expenses: 2400 },
  { month: 'Sep', income: 3200, expenses: 1900 },
  { month: 'Okt', income: 4500, expenses: 2700 },
  { month: 'Nov', income: 4900, expenses: 2800 },
  { month: 'Des', income: 5200, expenses: 3100 },
];

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

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

  // Active sub-navigation matching Left sidebar under template
  const [activeSubTab, setActiveSubTab] = useState<'hero' | 'about' | 'lokus' | 'pilar' | 'gallery' | 'preview'>('hero');

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewLang, setPreviewLang] = useState<'id' | 'en'>('id');

  // Gallery-specific States
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [newGallery, setNewGallery] = useState({
    title: '',
    description: '',
    category: 'Kegiatan',
    imageUrl: '',
    uploadedFile: null as File | null,
    useUrl: false
  });
  const [galleryMessage, setGalleryMessage] = useState({ type: '', text: '' });

  // Form Data for Texts & Core Image Slots
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
    // Image Slots
    about_image_url: "",
    papua_image_url: "",
    non_papua_image_url: ""
  });

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});

  const fileInputRefAbout = useRef<HTMLInputElement>(null);
  const fileInputRefPapua = useRef<HTMLInputElement>(null);
  const fileInputRefNonPapua = useRef<HTMLInputElement>(null);
  const fileInputRefGallery = useRef<HTMLInputElement>(null);

  // Fetch Homepage Content & Gallery Elements
  useEffect(() => {
    const fetchContentAndGallery = async () => {
      try {
        setLoading(true);
        // Doc
        const docRef = doc(db, 'settings', 'homepage');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(prev => ({ ...prev, ...docSnap.data() }));
        }

        // Gallery
        const gallerySnap = await getDocs(collection(db, 'homepage_gallery'));
        const itemsList: GalleryItem[] = [];
        gallerySnap.forEach(d => {
          itemsList.push({ id: d.id, ...d.data() } as GalleryItem);
        });
        setGalleryItems(itemsList.sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt)));

      } catch (err) {
        console.error('Error fetching landing page data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContentAndGallery();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveText = async () => {
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
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  // Handler for direct image upload of Core Slots
  const handleSlotImageUpload = async (slot: 'about_image_url' | 'papua_image_url' | 'non_papua_image_url', file: File) => {
    try {
      setUploadProgress(prev => ({ ...prev, [slot]: 'Mengompres...' }));
      const compressedBase64 = await compressImageFile(file);
      
      setUploadProgress(prev => ({ ...prev, [slot]: 'Mengunggah...' }));
      const updatedData = { ...formData, [slot]: compressedBase64 };
      await setDoc(doc(db, 'settings', 'homepage'), updatedData, { merge: true });
      
      setFormData(updatedData);
      setUploadProgress(prev => ({ ...prev, [slot]: '' }));
      setMessage({ type: 'success', text: `Gambar ${slot.replace('_image_url', '').replace('_', ' ')} berhasil diperbarui.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setUploadProgress(prev => ({ ...prev, [slot]: '' }));
      setMessage({ type: 'error', text: 'Gagal mengunggah gambar: ' + err.message });
    }
  };

  const handleResetSlotImage = async (slot: 'about_image_url' | 'papua_image_url' | 'non_papua_image_url') => {
    try {
      const updatedData = { ...formData, [slot]: "" };
      await setDoc(doc(db, 'settings', 'homepage'), updatedData, { merge: true });
      setFormData(updatedData);
      setMessage({ type: 'success', text: 'Gambar berhasil dikembalikan ke default.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal mereset gambar: ' + err.message });
    }
  };

  // Handler for adding a new Gallery Item
  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGallery.title || (!newGallery.imageUrl && !newGallery.uploadedFile)) {
      setGalleryMessage({ type: 'error', text: 'Judul dan gambar wajib diisi.' });
      return;
    }

    try {
      setGalleryLoading(true);
      setGalleryMessage({ type: '', text: '' });
      let finalImageUrl = newGallery.imageUrl;

      if (!newGallery.useUrl && newGallery.uploadedFile) {
        setGalleryMessage({ type: 'info', text: 'Sedang mengompres gambar...' });
        finalImageUrl = await compressImageFile(newGallery.uploadedFile);
      }

      setGalleryMessage({ type: 'info', text: 'Sedang menyimpan ke database...' });
      const newItem = {
        title: newGallery.title,
        description: newGallery.description,
        category: newGallery.category,
        imageUrl: finalImageUrl,
        uploadedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'homepage_gallery'), newItem);
      
      setGalleryItems(prev => [{ id: docRef.id, ...newItem }, ...prev]);
      setNewGallery({
        title: '',
        description: '',
        category: 'Kegiatan',
        imageUrl: '',
        uploadedFile: null,
        useUrl: false
      });
      if (fileInputRefGallery.current) fileInputRefGallery.current.value = '';

      setGalleryMessage({ type: 'success', text: 'Foto baru berhasil ditambahkan ke galeri.' });
      setTimeout(() => setGalleryMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setGalleryMessage({ type: 'error', text: 'Gagal menambahkan foto: ' + err.message });
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus foto galeri ini?')) return;
    try {
      setGalleryLoading(true);
      await deleteDoc(doc(db, 'homepage_gallery', id));
      setGalleryItems(prev => prev.filter(item => item.id !== id));
      setGalleryMessage({ type: 'success', text: 'Foto galeri berhasil dihapus.' });
      setTimeout(() => setGalleryMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setGalleryMessage({ type: 'error', text: 'Gagal menghapus foto: ' + err.message });
    } finally {
      setGalleryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-100 border-t-primary-500"></div>
        <span className="text-sm font-medium text-slate-500 font-sans">Memuat Dashboard CMS Sneat...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-24 px-4 sm:px-6 font-sans">
      
      {/* 🚀 ELEGANT SIMPLE PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Manajemen Beranda</h2>
          <p className="text-xs text-slate-400 mt-1">Konfigurasi teks, ilustrasi regional, pilar strategis, dan dokumentasi foto halaman depan</p>
        </div>
      </div>

      {/* Global Message Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl mb-6 flex items-center gap-3 font-semibold text-sm shadow-sm ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}  
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 TWO-COLUMN GENERAL SETUP (SNEAT ACCOUNT SETTINGS TEMPLATE GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Navigation Links (Sneat Side Tabs List) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-1 scrollbar-none">
          <div className="hidden lg:flex px-3 pb-3 pt-1 border-b border-slate-100 items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Daftar Modul Editor</span>
            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black uppercase">SNEAT-UI</span>
          </div>

          <button
            onClick={() => setActiveSubTab('hero')}
            className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3.5 lg:px-3 py-2.5 rounded-lg text-left text-xs font-bold transition-all ${
              activeSubTab === 'hero' 
                ? 'bg-primary-50 text-primary-500 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Type className="w-4 h-4 shrink-0" />
            <span>1. Hero & Statistik</span>
            {activeSubTab === 'hero' && <ChevronRight className="hidden lg:block w-3 h-3 ml-auto text-primary-500 stroke-[3]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('about')}
            className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3.5 lg:px-3 py-2.5 rounded-lg text-left text-xs font-bold transition-all ${
              activeSubTab === 'about' 
                ? 'bg-primary-50 text-primary-500 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>2. Filosofi & Teks</span>
            {activeSubTab === 'about' && <ChevronRight className="hidden lg:block w-3 h-3 ml-auto text-primary-500 stroke-[3]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('lokus')}
            className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3.5 lg:px-3 py-2.5 rounded-lg text-left text-xs font-bold transition-all ${
              activeSubTab === 'lokus' 
                ? 'bg-primary-50 text-primary-500 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>3. Regional Lokus 3T</span>
            {activeSubTab === 'lokus' && <ChevronRight className="hidden lg:block w-3 h-3 ml-auto text-primary-500 stroke-[3]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('pilar')}
            className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3.5 lg:px-3 py-2.5 rounded-lg text-left text-xs font-bold transition-all ${
              activeSubTab === 'pilar' 
                ? 'bg-primary-50 text-primary-500 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span>4. Pilar & Ajakan CTA</span>
            {activeSubTab === 'pilar' && <ChevronRight className="hidden lg:block w-3 h-3 ml-auto text-primary-500 stroke-[3]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3.5 lg:px-3 py-2.5 rounded-lg text-left text-xs font-bold transition-all ${
              activeSubTab === 'gallery' 
                ? 'bg-primary-50 text-primary-500 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>5. Galeri Foto Lapangan</span>
            {activeSubTab === 'gallery' && <ChevronRight className="hidden lg:block w-3 h-3 ml-auto text-primary-500 stroke-[3]" />}
          </button>

          <button
            onClick={() => setActiveSubTab('preview')}
            className={`w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3.5 lg:px-3 py-2.5 rounded-lg text-left text-xs font-bold border border-slate-100 transition-all ${
              activeSubTab === 'preview' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                : 'text-emerald-605 hover:bg-emerald-50/50'
            }`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Pratinjau Responsif</span>
            {activeSubTab === 'preview' && <Sparkles className="hidden lg:block w-3.5 h-3.5 ml-auto text-emerald-600 animate-pulse" />}
          </button>

          {/* Quick Statistics Mini Chart matching Sneat Dashboard Side panel */}
          <div className="hidden lg:block pt-4 mt-4 border-t border-slate-100 px-3 pb-1">
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Statistik CMS</span>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Sinkronisasi</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Online
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                <div className="bg-primary-500 h-full w-[88%] rounded-full"></div>
              </div>
              <span className="text-[9.5px] text-slate-400 block font-medium leading-tight">Database terinfusi data transmigrasi mutakhir</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tab Work Panel */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: HERO & METRICS CONTROLLER */}
          {activeSubTab === 'hero' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary-50 text-primary-500 rounded-lg"><Type className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Hero Headline & Deskripsi Sambutan</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Konfigurasikan judul utama landing page dalam Bahasa Indonesia dan English</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Headline (Bahasa Indonesia)</label>
                      <input 
                        type="text" 
                        name="hero_headline_id"
                        value={formData.hero_headline_id}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 hover:border-slate-350 outline-none transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Headline (English)</label>
                      <input 
                        type="text" 
                        name="hero_headline_en"
                        value={formData.hero_headline_en}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 hover:border-slate-350 outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sub-Headline / Keterangan (ID)</label>
                      <textarea 
                        name="hero_subhead_id" 
                        value={formData.hero_subhead_id}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 hover:border-slate-350 outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sub-Headline / Keterangan (EN)</label>
                      <textarea 
                        name="hero_subhead_en" 
                        value={formData.hero_subhead_en}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 hover:border-slate-350 outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><Tag className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Metrik & Angka Kinerja Lapangan</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Angka kuantitatif yang menunjukkan progress pembangunan kawasan transmigrasi</p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-2xl flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase mb-2 tracking-wide text-center">Kawasan Lokus</span>
                    <input 
                      type="text" 
                      name="stat_locus_val"
                      value={formData.stat_locus_val}
                      onChange={handleChange}
                      className="w-full text-center text-sm font-extrabold px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:border-primary-500 mb-1 outline-none font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Contoh: 124+</span>
                  </div>

                  <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-2xl flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase mb-2 tracking-wide text-center">Kepala Keluarga (KK)</span>
                    <input 
                      type="text" 
                      name="stat_family_val"
                      value={formData.stat_family_val}
                      onChange={handleChange}
                      className="w-full text-center text-sm font-extrabold px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:border-primary-500 mb-1 outline-none font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Contoh: 45.000+</span>
                  </div>

                  <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-2xl flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase mb-2 tracking-wide text-center">Lahan Terbuka</span>
                    <input 
                      type="text" 
                      name="stat_land_val"
                      value={formData.stat_land_val}
                      onChange={handleChange}
                      className="w-full text-center text-sm font-extrabold px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:border-primary-500 mb-1 outline-none font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Contoh: 1.2M Ha</span>
                  </div>

                  <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-2xl flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase mb-2 tracking-wide text-center">Fasilitas Penunjang</span>
                    <input 
                      type="text" 
                      name="stat_facility_val"
                      value={formData.stat_facility_val}
                      onChange={handleChange}
                      className="w-full text-center text-sm font-extrabold px-2 py-1.5 bg-white border border-slate-200 rounded-xl focus:border-primary-500 mb-1 outline-none font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Contoh: 3.400+</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pr-2">
                <button
                  type="button"
                  onClick={handleSaveText}
                  disabled={saving}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all tracking-wide flex items-center gap-1.5 shadow-md hover:shadow-primary-500/20"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Sedang Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: FILOSOFI & TEXTS */}
          {activeSubTab === 'about' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><Layers className="w-4 h-4" /></div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">Filosofi Program & Ilustrasi</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Edit kisah sejarah singkat program pada landing page utama</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Text side */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Judul Filosofi (Bahasa Indonesia)</label>
                        <input 
                          type="text" 
                          name="about_title_id"
                          value={formData.about_title_id}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Title Philosophy (English)</label>
                        <input 
                          type="text" 
                          name="about_title_en"
                          value={formData.about_title_en}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Keterangan Narasi (ID)</label>
                        <textarea 
                          name="about_desc_id"
                          value={formData.about_desc_id}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Narration Detail (EN)</label>
                        <textarea 
                          name="about_desc_en"
                          value={formData.about_desc_en}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image component */}
                  <div className="lg:col-span-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 block uppercase mb-2 tracking-wider">Gambar Utama Filosofi</span>
                      <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shadow-sm flex items-center justify-center">
                        {formData.about_image_url ? (
                          <img src={formData.about_image_url} alt="Philosophy preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-3">
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold font-mono">DEFAULT</span>
                            <p className="text-[9px] text-slate-400 italic mt-1 font-medium">Gambar Unsplash Kementerian</p>
                          </div>
                        )}
                        {uploadProgress['about_image_url'] && (
                          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary-400 mb-1" />
                            <span className="text-[10px] font-bold font-mono">{uploadProgress['about_image_url']}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => fileInputRefAbout.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition-all cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Unggah Berkas Gambar
                      </button>
                      <input 
                        ref={fileInputRefAbout}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSlotImageUpload('about_image_url', file);
                        }}
                        className="hidden"
                      />

                      {formData.about_image_url && (
                        <button
                          type="button"
                          onClick={() => handleResetSlotImage('about_image_url')}
                          className="w-full flex items-center justify-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-red-500 font-extrabold text-[11px] py-1.5 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Gunakan Default
                        </button>
                      )}

                      <div className="pt-1">
                        <label className="block text-[9.5px] text-slate-400 font-bold uppercase mb-1">Tautan Link Image Kustom</label>
                        <input 
                          type="text" 
                          name="about_image_url"
                          value={formData.about_image_url}
                          onChange={handleChange}
                          placeholder="https://..."
                          className="w-full text-[10px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-primary-500 outline-none truncate"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex justify-end pr-2">
                <button
                  type="button"
                  onClick={handleSaveText}
                  disabled={saving}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all tracking-wide flex items-center gap-1.5 shadow-md hover:shadow-primary-500/20"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Sedang Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 3: REGIONAL LOCUS 3T */}
          {activeSubTab === 'lokus' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                  <div className="p-1.5 bg-sky-50 text-sky-500 rounded-lg"><ImageIcon className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Wilayah Lokus & Ilustrasi Geografis</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Atur deskripsi singkat mengenai pembagian lokus Papua dan Non-Papua</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Judul Seksi Wilayah (Bahasa Indonesia)</label>
                      <input 
                        type="text" 
                        name="lokus_title_id"
                        value={formData.lokus_title_id}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Section Title Regional (English)</label>
                      <input 
                        type="text" 
                        name="lokus_title_en"
                        value={formData.lokus_title_en}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Deskripsi Ringkasan Wilayah (ID)</label>
                      <textarea 
                        name="lokus_desc_id"
                        value={formData.lokus_desc_id}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Summary Description Regional (EN)</label>
                      <textarea 
                        name="lokus_desc_en"
                        value={formData.lokus_desc_en}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side Image Slots for Geografis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Locus Papua */}
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 p-5 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-705 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Wilayah Loci Papua
                      </span>
                      <span className="text-[9px] font-extrabold bg-primary-50 text-primary-500 px-2 py-0.5 rounded uppercase">Daerah Khusus</span>
                    </div>

                    <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-200 border border-slate-100 flex items-center justify-center">
                      {formData.papua_image_url ? (
                        <img src={formData.papua_image_url} alt="Papua preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-3">
                          <span className="text-[9px] text-primary-550 bg-primary-50 px-20 py-0.5 rounded font-extrabold">DEFAULT ACTIVE</span>
                          <p className="text-[8.5px] text-slate-400 mt-1">Pegunungan Unsplash</p>
                        </div>
                      )}
                      {uploadProgress['papua_image_url'] && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary-400 mb-1" />
                          <span className="text-[10px] font-mono leading-none">{uploadProgress['papua_image_url']}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRefPapua.current?.click()}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" /> Unggah Gambar Papua
                    </button>
                    <input 
                      ref={fileInputRefPapua}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlotImageUpload('papua_image_url', file);
                      }}
                      className="hidden"
                    />
                    <input 
                      type="text" 
                      name="papua_image_url"
                      value={formData.papua_image_url}
                      onChange={handleChange}
                      placeholder="Atau tautkan URL gambar..."
                      className="w-full text-[10px] px-2.5 py-1.5 bg-slate-50/40 border border-slate-200 rounded-lg focus:border-primary-500 outline-none truncate"
                    />
                  </div>
                </div>

                {/* Locus Non-Papua */}
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 p-5 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-705 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> Wilayah Loci Non-Papua
                      </span>
                      <span className="text-[9px] font-extrabold bg-teal-50 text-teal-600 px-2 py-0.5 rounded uppercase">Daerah Reguler</span>
                    </div>

                    <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-200 border border-slate-100 flex items-center justify-center">
                      {formData.non_papua_image_url ? (
                        <img src={formData.non_papua_image_url} alt="Non-Papua preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-3">
                          <span className="text-[9px] text-teal-600 bg-teal-50 px-20 py-0.5 rounded font-extrabold">DEFAULT ACTIVE</span>
                          <p className="text-[8.5px] text-slate-400 mt-1">Persawahan Unsplash</p>
                        </div>
                      )}
                      {uploadProgress['non_papua_image_url'] && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary-400 mb-1" />
                          <span className="text-[10px] font-mono leading-none">{uploadProgress['non_papua_image_url']}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRefNonPapua.current?.click()}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400" /> Unggah Gambar Non-Papua
                    </button>
                    <input 
                      ref={fileInputRefNonPapua}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlotImageUpload('non_papua_image_url', file);
                      }}
                      className="hidden"
                    />
                    <input 
                      type="text" 
                      name="non_papua_image_url"
                      value={formData.non_papua_image_url}
                      onChange={handleChange}
                      placeholder="Atau tautkan URL gambar..."
                      className="w-full text-[10px] px-2.5 py-1.5 bg-slate-50/40 border border-slate-200 rounded-lg focus:border-primary-500 outline-none truncate"
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-end pr-2">
                <button
                  type="button"
                  onClick={handleSaveText}
                  disabled={saving}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all tracking-wide flex items-center gap-1.5 shadow-md hover:shadow-primary-500/20"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Sedang Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 4: PILAR & CTA */}
          {activeSubTab === 'pilar' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><Flame className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Pilar Kerja & Call To Action (CTA)</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Konfigurasi pesan penggerak dan ajakan kemitraan daerah tertinggal</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Indonesian Column */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider border-b pb-1.5">Versi Bahasa Indonesia</h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Judul Pilar Kerja (ID)</label>
                        <input 
                          type="text" 
                          name="pilar_title_id"
                          value={formData.pilar_title_id}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Deskripsi Ringkasan Pilar (ID)</label>
                        <textarea 
                          name="pilar_desc_id"
                          value={formData.pilar_desc_id}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Judul CTA Ajakan Sinergi (ID)</label>
                        <input 
                          type="text" 
                          name="cta_title_id"
                          value={formData.cta_title_id}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Deskripsi Ajakan Kemitraan (ID)</label>
                        <textarea 
                          name="cta_desc_id"
                          value={formData.cta_desc_id}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* English Column */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider border-b pb-1.5">English Version</h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-520 uppercase">Pillar Title (EN)</label>
                        <input 
                          type="text" 
                          name="pilar_title_en"
                          value={formData.pilar_title_en}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-520 uppercase">Pillar Summary Description (EN)</label>
                        <textarea 
                          name="pilar_desc_en"
                          value={formData.pilar_desc_en}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="block text-[11px] font-bold text-slate-520 uppercase">CTA Title (EN)</label>
                        <input 
                          type="text" 
                          name="cta_title_en"
                          value={formData.cta_title_en}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-520 uppercase">CTA Description (EN)</label>
                        <textarea 
                          name="cta_desc_en"
                          value={formData.cta_desc_en}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-slate-50/40 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pr-2">
                <button
                  type="button"
                  onClick={handleSaveText}
                  disabled={saving}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all tracking-wide flex items-center gap-1.5 shadow-md hover:shadow-primary-500/20"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Sedang Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 5: GALLERY DYNAMIC */}
          {activeSubTab === 'gallery' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><ImageIcon className="w-4 h-4" /></div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">Galeri Lapangan & Foto Kegiatan Real-time</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Kelola dokumentasi pembangunan fisik untuk dipajang pada halaman depan publik</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    {galleryItems.length} Foto Aktif
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                  
                  {/* Left component: Add item form */}
                  <form onSubmit={handleAddGalleryItem} className="xl:col-span-5 bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 pb-2.5 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-500" /> Tambah Foto Dokumentasi
                    </h4>

                    {galleryMessage.text && (
                      <div className={`p-3 rounded-xl text-[11px] font-bold leading-relaxed border ${
                        galleryMessage.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : galleryMessage.type === 'info'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {galleryMessage.text}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1 shadow-none">Judul Kegiatan</label>
                      <input
                        type="text"
                        required
                        value={newGallery.title}
                        onChange={(e) => setNewGallery(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Misal: Peresmian Sumur Bor Transmigrasi 2"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-emerald-555 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1 shadow-none">Deskripsi Narasi Pendek</label>
                      <textarea
                        rows={2}
                        value={newGallery.description}
                        onChange={(e) => setNewGallery(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Jelaskan aktivitas atau lokasi..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-emerald-555 outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1 shadow-none">Kategori</label>
                        <select
                          value={newGallery.category}
                          onChange={(e) => setNewGallery(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-2.5 py-1.8 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:border-emerald-500 outline-none"
                        >
                          <option value="Kegiatan">Kegiatan</option>
                          <option value="Infrastruktur">Infrastruktur</option>
                          <option value="Logistik">Logistik</option>
                          <option value="Pertanian">Pertanian</option>
                          <option value="Kesehatan">Kesehatan</option>
                          <option value="Pendidikan">Pendidikan</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1 shadow-none">Tipe Berkas</label>
                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-250">
                          <button
                            type="button"
                            onClick={() => setNewGallery(prev => ({ ...prev, useUrl: false }))}
                            className={`flex-1 text-[9.5px] font-bold py-1 rounded transition-all ${!newGallery.useUrl ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                          >
                            File Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewGallery(prev => ({ ...prev, useUrl: true }))}
                            className={`flex-1 text-[9.5px] font-bold py-1 rounded transition-all ${newGallery.useUrl ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                          >
                            Tautan URL
                          </button>
                        </div>
                      </div>
                    </div>

                    {newGallery.useUrl ? (
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1 shadow-none">Rekatkan URL Gambar</label>
                        <input
                          type="url"
                          value={newGallery.imageUrl}
                          onChange={(e) => setNewGallery(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-emerald-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1 shadow-none">Pilih Berkas Lokal</label>
                        <button
                          type="button"
                          onClick={() => fileInputRefGallery.current?.click()}
                          className="w-full h-20 bg-white border border-dashed border-slate-200 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center p-3 text-slate-400 hover:bg-slate-50/50 transition-all cursor-pointer shadow-inner"
                        >
                          <UploadCloud className="w-5 h-5 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-full px-2 mt-1">
                            {newGallery.uploadedFile ? newGallery.uploadedFile.name : 'Pilih dari Komputer Anda'}
                          </span>
                        </button>
                        <input
                          ref={fileInputRefGallery}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewGallery(prev => ({ ...prev, uploadedFile: file }));
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={galleryLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {galleryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {galleryLoading ? 'Menyimpan...' : 'Unggah & Tambah Ke Galeri'}
                    </button>
                  </form>

                  {/* Right side: Gallery view list */}
                  <div className="xl:col-span-7 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider border-b border-slate-100 pb-2.5">
                      Kumpulan Foto Galeri Publik
                    </h4>

                    {galleryItems.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-10 border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center h-64">
                        <ImageIcon className="w-12 h-12 text-slate-350 mb-2" />
                        <span className="text-xs text-slate-500 font-bold">Galeri Masih Kosong</span>
                        <p className="text-[10.5px] text-slate-400 max-w-xs leading-normal mt-1 text-center">
                          Belum ada dokumentasi kustom. Gunakan form pengisian di kiri untuk menambahkan foto.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1 scrollbar-sm">
                        {galleryItems.map((item) => (
                          <div key={item.id} className="group bg-slate-50 border border-slate-205 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative">
                            <span className="absolute top-1.5 left-1.5 z-10 bg-slate-900/80 text-white rounded px-2 py-0.5 text-[8.5px] font-extrabold uppercase">
                              {item.category}
                            </span>
                            <div className="aspect-video relative overflow-hidden bg-slate-200">
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-103 transition-all duration-300" />
                            </div>
                            <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                              <div>
                                <h5 className="font-bold text-slate-800 text-[11px] truncate">{item.title}</h5>
                                {item.description && <p className="text-[9.5px] text-slate-450 line-clamp-2 mt-0.5 leading-tight">{item.description}</p>}
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                                <span className="text-[8.5px] text-slate-400 font-mono">
                                  {new Date(item.uploadedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGalleryItem(item.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: COMPLETE HISTORIC RESPONSIVE PREVIEW MONITOR */}
          {activeSubTab === 'preview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Preview Controller Bar */}
              <div className="bg-white rounded-2xl p-4.5 shadow-[0_2px_12px_rgba(67,89,113,0.08)] border border-slate-100/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><Monitor className="w-4 h-4" /></span>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Pratinjau Halaman Beranda Publik</h4>
                    <p className="text-[10.5px] text-slate-400">Tekan tombol perangkat di samping untuk memantau tampilan responsif</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Language Selector */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setPreviewLang('id')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewLang === 'id' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      ID
                    </button>
                    <button
                      onClick={() => setPreviewLang('en')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewLang === 'en' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      EN
                    </button>
                  </div>

                  {/* Device selectors */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                  </div>
                </div>
              </div>

              {/* SIMULATOR SCREEN CONTAINER */}
              <div className="flex justify-center bg-slate-100/50 p-6 rounded-2xl border border-slate-200 shadow-inner overflow-hidden min-h-[500px]">
                
                {/* 💻 DESKTOP COMPACT MONITOR MOCKUP */}
                {previewDevice === 'desktop' && (
                  <div className="w-full bg-white rounded-xl shadow-xl border border-slate-300 overflow-hidden flex flex-col">
                    {/* PC Header Frame */}
                    <div className="bg-slate-250 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block"></span>
                      <div className="bg-white/80 rounded-md text-[9px] font-mono font-medium px-4 py-0.5 text-slate-400 text-center w-80 truncate mx-auto select-none">
                        https://kemendesa3t.go.id/portal-publik
                      </div>
                    </div>

                    {/* Desktop Content Simulated Body */}
                    <div className="bg-white p-6 md:p-10 space-y-12 overflow-y-auto max-h-[500px] select-none text-slate-700">
                      
                      {/* Nav Header Row */}
                      <header className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-primary-500 rounded-md block"></span>
                          <span className="font-extrabold text-sm text-slate-800 font-mono tracking-tighter">TRANS-3T</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10.5px] font-bold text-slate-500">
                          <span>Sekilas</span>
                          <span>Regional</span>
                          <span>Pilar</span>
                          <span>Galeri</span>
                          <span className="text-white px-3 py-1 bg-primary-500 rounded">Portal Admin</span>
                        </div>
                      </header>

                      {/* Mock Landing: Hero */}
                      <section className="text-center space-y-4 max-w-3xl mx-auto py-4">
                        <span className="text-[10px] bg-primary-50 text-primary-500 font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-primary-100">
                          {previewLang === 'id' ? 'Kementerian Wilayah 3T' : 'Ministry of underdeveloped areas'}
                        </span>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                          {previewLang === 'id' ? formData.hero_headline_id : formData.hero_headline_en}
                        </h1>
                        <p className="text-slate-500 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
                          {previewLang === 'id' ? formData.hero_subhead_id : formData.hero_subhead_en}
                        </p>
                        <div className="pt-2 flex justify-center gap-3">
                          <span className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs px-5 py-2.5 rounded shadow">E-Partisipasi</span>
                          <span className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs px-5 py-2.5 rounded">Hubungi Kami</span>
                        </div>
                      </section>

                      {/* Mock Landing: Stats */}
                      <section className="grid grid-cols-4 gap-4 py-4 border-y border-slate-150">
                        <div className="text-center">
                          <span className="text-xl font-extrabold text-primary-500 block">{formData.stat_locus_val}</span>
                          <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wide">Kawasan Kerja 3T</span>
                        </div>
                        <div className="text-center">
                          <span className="text-xl font-extrabold text-primary-500 block">{formData.stat_family_val}</span>
                          <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wide">Hektar Garapan</span>
                        </div>
                        <div className="text-center">
                          <span className="text-xl font-extrabold text-primary-500 block">{formData.stat_land_val}</span>
                          <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wide">Transmigran</span>
                        </div>
                        <div className="text-center">
                          <span className="text-xl font-extrabold text-primary-500 block">{formData.stat_facility_val}</span>
                          <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wide">Unit Layanan</span>
                        </div>
                      </section>

                      {/* Mock Landing: About */}
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
                        <div className="space-y-3">
                          <h2 className="text-lg font-extrabold text-slate-800">
                            {previewLang === 'id' ? formData.about_title_id : formData.about_title_en}
                          </h2>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {previewLang === 'id' ? formData.about_desc_id : formData.about_desc_en}
                          </p>
                        </div>
                        <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                          {formData.about_image_url ? (
                            <img src={formData.about_image_url} alt="About preview" className="w-full h-full object-cover" />
                          ) : (
                            <img src="https://images.unsplash.com/photo-1596422846543-74c6e271a8c9?auto=format&fit=crop&q=80&w=600" alt="About preview default" className="w-full h-full object-cover" />
                          )}
                        </div>
                      </section>

                      {/* Mock Landing: Regional Loci */}
                      <section className="space-y-6 py-4">
                        <div className="text-center space-y-1">
                          <h2 className="text-lg font-black text-slate-800">
                            {previewLang === 'id' ? formData.lokus_title_id : formData.lokus_title_en}
                          </h2>
                          <p className="text-xs text-slate-400 max-w-lg mx-auto">
                            {previewLang === 'id' ? formData.lokus_desc_id : formData.lokus_desc_en}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                              {formData.papua_image_url ? (
                                <img src={formData.papua_image_url} alt="Papua preview" className="w-full h-full object-cover" />
                              ) : (
                                <img src="https://images.unsplash.com/photo-1542274368-443d694d79aa?auto=format&fit=crop&q=80&w=600" alt="Papua default" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <span className="font-extrabold text-slate-800 text-xs mt-1 block">Kawasan Lokus Papua</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">Meliputi Papua Barat Daya, Papua Selatan, Papua Tengah, dan Pegunungan.</span>
                          </div>

                          <div className="space-y-2">
                            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                              {formData.non_papua_image_url ? (
                                <img src={formData.non_papua_image_url} alt="Non-Papua preview" className="w-full h-full object-cover" />
                              ) : (
                                <img src="https://images.unsplash.com/photo-1590403332412-282490205af4?auto=format&fit=crop&q=80&w=600" alt="Non-papua default" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <span className="font-extrabold text-slate-800 text-xs mt-1 block">Kawasan Lokus Non-Papua</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">Meliputi kawasan transmigrasi tertinggal Kalimantan, NTT, dan Sulawesi Barat.</span>
                          </div>
                        </div>
                      </section>

                      {/* Mock Landing: Pillars & CTA */}
                      <section className="bg-slate-50 border border-slate-200 p-6 sm:p-8 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 py-6 items-center">
                        <div className="space-y-2">
                          <h2 className="text-base font-extrabold text-slate-800">
                            {previewLang === 'id' ? formData.cta_title_id : formData.cta_title_en}
                          </h2>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            {previewLang === 'id' ? formData.cta_desc_id : formData.cta_desc_en}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-base font-extrabold text-slate-800">
                            {previewLang === 'id' ? formData.pilar_title_id : formData.pilar_title_en}
                          </h2>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            {previewLang === 'id' ? formData.pilar_desc_id : formData.pilar_desc_en}
                          </p>
                        </div>
                      </section>

                      {/* Mock Landing: Active Gallery Grid */}
                      <section className="space-y-6 py-4">
                        <div className="text-center">
                          <h2 className="text-lg font-black text-slate-800">Dokumentasi Terkini Lapangan</h2>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Keadaan fisik pertumbuhan daerah perbatasan 3T saat ini</p>
                        </div>

                        {galleryItems.length === 0 ? (
                          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center text-[11px] font-bold text-slate-400">
                            Tidak ada foto galeri kustom. Menunggu pemuatan item...
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-4">
                            {galleryItems.slice(0, 3).map((g) => (
                              <div key={g.id} className="bg-white border rounded-lg overflow-hidden flex flex-col justify-between">
                                <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${g.imageUrl})` }}></div>
                                <div className="p-2">
                                  <span className="font-extrabold text-slate-800 text-[10px] truncate block">{g.title}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                    </div>
                  </div>
                )}

                {/* 📱 MOBILE PHONE FRAME MOCKUP */}
                {previewDevice === 'mobile' && (
                  <div className="w-[300px] h-[580px] bg-slate-900 rounded-[40px] shadow-2xl p-3 border-4 border-slate-850 overflow-hidden flex flex-col relative select-none">
                    
                    {/* Speaker and Notch Top */}
                    <div className="absolute top-[16px] left-[50%] transform -translate-x-1/2 bg-slate-950 w-24 h-4 rounded-full z-20 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                      <span className="w-8 h-[2px] bg-slate-800 rounded mx-2"></span>
                    </div>

                    {/* Outer Phone Frame layout content container */}
                    <div className="bg-white rounded-[32px] w-full h-full overflow-y-auto pt-7 px-4 pb-12 text-slate-800 flex flex-col space-y-8 select-none">
                      
                      {/* Mobile Brand Row */}
                      <header className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-black text-[11px] tracking-tight text-slate-800 font-mono">TRANS-3T</span>
                        <span className="bg-primary-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">Portal</span>
                      </header>

                      {/* Mock Hero content on small screen */}
                      <section className="text-center space-y-3 pt-2">
                        <span className="text-[8px] bg-primary-50 text-primary-500 font-extrabold px-2 py-0.5 rounded-full uppercase">
                          Kawasan 3T
                        </span>
                        <h1 className="text-[15px] font-black leading-tight text-slate-800">
                          {previewLang === 'id' ? formData.hero_headline_id : formData.hero_headline_en}
                        </h1>
                        <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-4">
                          {previewLang === 'id' ? formData.hero_subhead_id : formData.hero_subhead_en}
                        </p>
                        <div className="pt-1 flex flex-col gap-2">
                          <span className="bg-primary-500 text-white font-bold text-[10px] py-1.5 rounded text-center">E-Partisipasi</span>
                          <span className="bg-white border text-center text-slate-600 font-bold text-[10px] py-1.5 rounded">Kontak Kami</span>
                        </div>
                      </section>

                      {/* Stats list of values */}
                      <section className="grid grid-cols-2 gap-2.5 py-3 border-y border-slate-150 text-center">
                        <div>
                          <span className="text-sm font-extrabold text-primary-500 block leading-none">{formData.stat_locus_val}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 inline-block">Kawasan</span>
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-primary-500 block leading-none">{formData.stat_family_val}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 inline-block">Hektar</span>
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-primary-500 block leading-none">{formData.stat_land_val}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 inline-block">KK</span>
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-primary-500 block leading-none">{formData.stat_facility_val}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 inline-block">Fasilitas</span>
                        </div>
                      </section>

                      {/* Philosophy Section */}
                      <section className="space-y-2.5">
                        <h2 className="text-xs font-bold text-slate-800 leading-tight">
                          {previewLang === 'id' ? formData.about_title_id : formData.about_title_en}
                        </h2>
                        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border">
                          {formData.about_image_url ? (
                            <img src={formData.about_image_url} alt="About preview mobile" className="w-full h-full object-cover" />
                          ) : (
                            <img src="https://images.unsplash.com/photo-1596422846543-74c6e271a8c9?auto=format&fit=crop&q=80&w=300" alt="About placeholder" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-4">
                          {previewLang === 'id' ? formData.about_desc_id : formData.about_desc_en}
                        </p>
                      </section>

                      {/* Locations Region on Mobile */}
                      <section className="space-y-4">
                        <div className="space-y-1">
                          <h2 className="text-xs font-extrabold text-slate-800">{previewLang === 'id' ? formData.lokus_title_id : formData.lokus_title_en}</h2>
                          <p className="text-[9.5px] text-slate-400 leading-relaxed">{previewLang === 'id' ? formData.lokus_desc_id : formData.lokus_desc_en}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="border border-slate-150 p-2.5 rounded-xl space-y-1">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                              {formData.papua_image_url ? (
                                <img src={formData.papua_image_url} alt="Papua mobile preview" className="w-full h-full object-cover" />
                              ) : (
                                <img src="https://images.unsplash.com/photo-1542274368-443d694d79aa?auto=format&fit=crop&q=80&w=300" alt="Papua placeholder" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <span className="font-extrabold text-[10.5px] text-slate-800 block">Kawasan Lokus Papua</span>
                          </div>

                          <div className="border border-slate-150 p-2.5 rounded-xl space-y-1">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                              {formData.non_papua_image_url ? (
                                <img src={formData.non_papua_image_url} alt="Non-papua mobile preview" className="w-full h-full object-cover" />
                              ) : (
                                <img src="https://images.unsplash.com/photo-1590403332412-282490205af4?auto=format&fit=crop&q=80&w=300" alt="Non-papua placeholder" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <span className="font-extrabold text-[10.5px] text-slate-800 block">Kawasan Lokus Non-Papua</span>
                          </div>
                        </div>
                      </section>

                      {/* Sinergi Panel Mobile */}
                      <section className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-2">
                        <span className="font-bold text-[10.5px] text-slate-800 block">{previewLang === 'id' ? formData.cta_title_id : formData.cta_title_en}</span>
                        <p className="text-[9px] text-slate-500 leading-normal">{previewLang === 'id' ? formData.cta_desc_id : formData.cta_desc_en}</p>
                      </section>

                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
}
