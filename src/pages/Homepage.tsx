import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map, Users, Sprout, Building, GraduationCap, 
  HeartPulse, ChevronRight, Globe, ArrowRight, 
  ShieldCheck, Sun, LayoutDashboard, Search, 
  TrendingUp, PieChart, CheckCircle2, ChevronDown,
  Scale, Briefcase, Leaf, Flag, MapPin, 
  Lightbulb, Factory, Wifi, Zap, Menu, X, MessageSquare
} from 'lucide-react';

import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';

export function Homepage() {
  const [activeTab, setActiveTab] = useState<'papua' | 'non-papua'>('papua');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dynamicContent, setDynamicContent] = useState<any>({});
  const { appSettings, language, setLanguage } = useStore();
  const isEn = language === 'en';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchDynamicContent = async () => {
      try {
        const docRef = doc(db, 'settings', 'homepage');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDynamicContent(docSnap.data());
        }
      } catch (err) {
        console.error('Failed to load homepage content:', err);
      }
    };
    fetchDynamicContent();
  }, []);

  const translations = {
    id: {
      nav_program: "Program",
      nav_lokus: "Area Lokus",
      nav_pilar: "Pilar",
      nav_complaint: "Pengaduan",
      nav_tte: "Cek TTE",
      nav_dashboard: "Dashboard",
      system_title: "Sistem Informasi Terpadu Pelaporan 3T",
      hero_headline: dynamicContent.hero_headline_id || "Membangun Harapan di Kawasan 3T Indonesia",
      hero_subhead: dynamicContent.hero_subhead_id || "SaaS Platform untuk Manajemen Transmigrasi Daerah 3T (Papua & Non-Papua). Memantau integrasi ekonomi, pertumbuhan demografi, dan percepatan infrastruktur.",
      stat_locus: "Kawasan Lokus 3T",
      stat_family: "Kepala Keluarga",
      stat_land: "Hektar Lahan",
      stat_facility: "Fasilitas Bangunan",
      about_tag: "Filosofi Program",
      about_title: dynamicContent.about_title_id || "Revitalisasi Transmigrasi Menuju Indonesia Emas",
      about_desc: dynamicContent.about_desc_id || "Program transmigrasi saat ini bukan sekadar memindahkan penduduk, melainkan membangun ekosistem kehidupan yang lebih baik, sejahtera, dan terintegrasi di kawasan perbatasan dan pelosok.",
      about_p1_title: "Fokus Kawasan 3T",
      about_p1_desc: "Memprioritaskan daerah Tertinggal, Terdepan, dan Terluar untuk mempercepat akselerasi pembangunan infrastruktur.",
      about_p2_title: "Pendekatan Komprehensif",
      about_p2_desc: "Menjamin ketersediaan lahan, rumah layak huni, jaminan hidup, serta bimbingan teknis pertanian.",
      about_p3_title: "Harmonisasi Budaya",
      about_p3_desc: "Merajut kebhinekaan dengan memadukan kearifan lokal antara warga pendatang dan penduduk asli wilayah setempat.",
      about_badge: "Pembangunan Berkelanjutan",
      about_badge_desc: "Mendorong kemandirian ekonomi daerah baru.",
      lokus_tag: "Area Fokus Regional",
      lokus_title: dynamicContent.lokus_title_id || "Pembagian Lokus Program 3T",
      lokus_desc: dynamicContent.lokus_desc_id || "Kami membagi strategi pengembangan menjadi dua fokus wilayah utama dengan pendekatan operasional dan kultural yang disesuaikan dengan kondisi geografis.",
      lokus_tab_papua: "Lokus Papua",
      lokus_tab_non_papua: "Lokus Non-Papua",
      papua_title: "Akselerasi Kawasan Papua",
      papua_desc: "Pengembangan kawasan transmigrasi di Tanah Papua difokuskan pada pengakuan hak ulayat, pendekatan antropologis, dan pemajuan sentra-sentra ekonomi komoditas lokal (sagu, kopi, dan perikanan air tawar).",
      papua_card1_title: "Pendekatan Kultural",
      papua_card1_desc: "Dialog intensif dengan Majelis Rakyat Papua & Tokoh Adat.",
      papua_card2_title: "Ekonomi Hijau",
      papua_card2_desc: "Fokus pada agrikultur berkelanjutan non-eksploitatif.",
      papua_l1: "Merauke (Kawasan Pangan Nasional)",
      papua_l2: "Keerom (Pengembangan Komoditas Perbatasan)",
      papua_l3: "Sorong & Manokwari (Sentra Industri Lokal)",
      non_papua_title: "Pengembangan Kawasan Non-Papua",
      non_papua_desc: "Tersebar di wilayah Sumatera, Kalimantan, Sulawesi, hingga Nusa Tenggara. Fokus pada optimalisasi lahan, hilirisasi produk pertanian, dan pengentasan kawasan pulau terluar atau wilayah pasca-konflik/bencana.",
      non_papua_card1_title: "Hilirisasi Mandiri",
      non_papua_card1_desc: "Penciptaan pabrik dan lumbung pengolahan komoditas.",
      non_papua_card2_title: "Konektivitas",
      non_papua_card2_desc: "Pembukaan akses jalan poros desa ke jalan nasional.",
      non_papua_l1: "Kalimantan Perbatasan (Kaltara, Kalbar)",
      non_papua_l2: "Sulawesi Terluar (Sulteng, Sultra)",
      non_papua_l3: "Kepulauan Maluku & Nusa Tenggara Timur",
      pilar_tag: "13 Program Prioritas",
      pilar_title: dynamicContent.pilar_title_id || "Pembangunan Berkelanjutan di Kawasan 3T",
      pilar_desc: dynamicContent.pilar_desc_id || "Integrasi percepatan pembangunan berbasis Asta Cita dan program strategis nasional untuk mewujudkan kemandirian daerah tertinggal.",
      cta_title: dynamicContent.cta_title_id || "Mari Bersinergi Membangun Pelosok Negeri",
      cta_desc: dynamicContent.cta_desc_id || "Gunakan portal manajemen terpadu kami untuk memantau progress kinerja daerah, mengelola data demografi transmigran, dan memproses laporan logistik secara terpusat.",
      cta_btn: "Akses Live Dashboard",
      footer_desc: appSettings?.footerDescription || "Sistem Informasi Terpadu Pelaporan, Pendataan, dan Evaluasi Perkembangan Kawasan Transmigrasi Lokus 3T.",
      footer_links: "Tautan Cepat",
      footer_contact: "Kontak",
      footer_rights: "Hak Cipta Dilindungi.",
      footer_terms: "Syarat & Ketentuan",
      footer_privacy: "Kebijakan Privasi",
      helpful_center: "Pusat Bantuan SaaS",
    },
    en: {
      nav_program: "Program",
      nav_lokus: "Locus Areas",
      nav_pilar: "Pillars",
      nav_complaint: "Complaints",
      nav_tte: "Check TTE",
      nav_dashboard: "Dashboard",
      system_title: "Integrated 3T Reporting & Information System",
      hero_headline: dynamicContent.hero_headline_en || "Building Hope in Indonesia's 3T Regions",
      hero_subhead: dynamicContent.hero_subhead_en || "SaaS Platform for 3T Region Transmigration Management (Papua & Non-Papua). Monitoring economic integration, demographic growth, and infrastructure acceleration.",
      stat_locus: "3T Locus Regions",
      stat_family: "Heads of Households",
      stat_land: "Hectares of Land",
      stat_facility: "Building Facilities",
      about_tag: "Program Philosophy",
      about_title: dynamicContent.about_title_en || "Revitalizing Transmigration Towards Golden Indonesia",
      about_desc: dynamicContent.about_desc_en || "The current transmigration program is not just about relocating citizens, but about building a better, prosperous, and integrated living ecosystem in border and remote areas.",
      about_p1_title: "Focus on 3T Regions",
      about_p1_desc: "Prioritizing Disadvantaged, Frontier, and Outermost areas to accelerate basic infrastructure development.",
      about_p2_title: "Comprehensive Approach",
      about_p2_desc: "Ensuring land availability, decent housing, living support, and technical agricultural guidance.",
      about_p3_title: "Cultural Harmonization",
      about_p3_desc: "Weaving diversity by blending local wisdom of new settlers and indigenous citizens.",
      about_badge: "Sustainable Development",
      about_badge_desc: "Encouraging economic independence in newly developed regions.",
      lokus_tag: "Regional Focus Areas",
      lokus_title: dynamicContent.lokus_title_en || "Division of 3T Program Loci",
      lokus_desc: dynamicContent.lokus_desc_en || "We divide development strategies into two main focus areas with operational and cultural approaches customized to geographical conditions.",
      lokus_tab_papua: "Papua Locus",
      lokus_tab_non_papua: "Non-Papua Locus",
      papua_title: "Papua Locus Acceleration",
      papua_desc: "Transmigration area development in Papua is focused on recognizing customary land rights, anthropological approaches, and advancing local commodity economic centers (sago, coffee, and fresh water fishery).",
      papua_card1_title: "Cultural Approach",
      papua_card1_desc: "Intensive dialogue with the Papuan People's Assembly & Customary Leaders.",
      papua_card2_title: "Green Economy",
      papua_card2_desc: "Focus on sustainable, non-exploitative agriculture.",
      papua_l1: "Merauke (National Food Estate)",
      papua_l2: "Keerom (Border Commodity Development)",
      papua_l3: "Sorong & Manokwari (Local Industrial Center)",
      non_papua_title: "Non-Papua Locus Development",
      non_papua_desc: "Spread across Sumatra, Kalimantan, Sulawesi, and Nusa Tenggara. Focuses on land optimization, agricultural product downstreaming, and uplifting outermost island areas or post-conflict/disaster regions.",
      non_papua_card1_title: "Independent Downstreaming",
      non_papua_card1_desc: "Creation of factories and commodity processing granaries.",
      non_papua_card2_title: "Connectivity",
      non_papua_card2_desc: "Opening access roads from village hubs to national highways.",
      non_papua_l1: "Kalimantan Border (North Kalimantan, West Kalimantan)",
      non_papua_l2: "Outermost Sulawesi (Central Sulawesi, Southeast Sulawesi)",
      non_papua_l3: "Maluku Islands & East Nusa Tenggara",
      pilar_tag: "13 Priority Programs",
      pilar_title: dynamicContent.pilar_title_en || "Sustainable Development in 3T Areas",
      pilar_desc: dynamicContent.pilar_desc_en || "Acceleration of integrated development based on Asta Cita and national strategic programs to realize disadvantaged area independence.",
      cta_title: dynamicContent.cta_title_en || "Let's Collaborate to Build the Nation's Remote Corners",
      cta_desc: dynamicContent.cta_desc_en || "Use our unified management portal to track regional performance, manage transmigrant demographic data, and process logistic reports centrally.",
      cta_btn: "Access Live Dashboard",
      footer_desc: appSettings?.footerDescriptionEn || "Integrated Information System for Reporting, Recording, and Progress Evaluation of 3T Transmigration Areas.",
      footer_links: "Quick Links",
      footer_contact: "Contact Us",
      footer_rights: "All Rights Reserved.",
      footer_terms: "Terms & Conditions",
      footer_privacy: "Privacy Policy",
      helpful_center: "SaaS Help Center",
    }
  };

  type LangKey = keyof typeof translations;
  const t = translations[language as LangKey] || translations['id'];

  // 13 Pillars translation mapping based on language
  const pillarsList = [
    { 
      title: isEn ? 'Governance & Agrarian Reform' : 'Tata Kelola dan Reformasi Agraria', 
      desc: isEn ? 'Arrangement of equitable and legal land tenure, utilization, and allocation.' : 'Penataan penguasaan, penggunaan, dan pemanfaatan tanah yang berkeadilan dan legal.', 
      icon: Scale, color: 'text-primary-600', bg: 'bg-primary-50', shadow: 'hover:shadow-primary-600/20', border: 'hover:border-primary-600' 
    },
    { 
      title: isEn ? 'Merah Putih Economic Institutions' : 'Kelembagaan Ekonomi Merah Putih', 
      desc: isEn ? 'Building self-reliant economic ecosystems based on mutual cooperation principles.' : 'Membangun ekosistem ekonomi mandiri berbasis asas kebersamaan dan gotong royong.', 
      icon: Briefcase, color: 'text-red-500', bg: 'bg-red-50', shadow: 'hover:shadow-red-500/20', border: 'hover:border-red-500' 
    },
    { 
      title: isEn ? 'Green Economy' : 'Ekonomi Hijau', 
      desc: isEn ? 'Development of sustainable and eco-friendly transmigration regions.' : 'Pengembangan kawasan transmigrasi yang berkelanjutan dan ramah lingkungan.', 
      icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-50', shadow: 'hover:shadow-emerald-500/20', border: 'hover:border-emerald-500' 
    },
    { 
      title: isEn ? 'Basic Infrastructure' : 'Infrastruktur Dasar', 
      desc: isEn ? 'Provision of roads, clean water, sanitation, and transportation access.' : 'Pemenuhan kebutuhan jalan, air bersih, sanitasi, dan akses transportasi.', 
      icon: Building, color: 'text-primary-400', bg: 'bg-emerald-100', shadow: 'hover:shadow-primary-400/20', border: 'hover:border-primary-400' 
    },
    { 
      title: isEn ? 'Patriot Transmigration' : 'Transmigrasi Patriot', 
      desc: isEn ? 'Cultivating nationalism and regional resilience in border zones.' : 'Menumbuhkan semangat nasionalisme dan ketahanan wilayah di kawasan perbatasan.', 
      icon: Flag, color: 'text-amber-500', bg: 'bg-amber-50', shadow: 'hover:shadow-amber-500/20', border: 'hover:border-amber-500' 
    },
    { 
      title: isEn ? 'HR Capacity Building' : 'Kapasitas SDM', 
      desc: isEn ? 'Character coaching, technical skills learning, and transmigrant empowerment.' : 'Pelatihan karakter, keterampilan teknis, dan pemberdayaan masyarakat transmigran.', 
      icon: Users, color: 'text-primary-600', bg: 'bg-primary-50', shadow: 'hover:shadow-primary-600/20', border: 'hover:border-primary-600' 
    },
    { 
      title: isEn ? 'Tourism Ecosystem' : 'Ekosistem Pariwisata', 
      desc: isEn ? 'Developing pioneer tourist villages built on local wisdom and natural wealth.' : 'Pengembangan desa wisata perintis berbasis kearifan lokal dan kekayaan alam.', 
      icon: MapPin, color: 'text-primary-400', bg: 'bg-emerald-100', shadow: 'hover:shadow-primary-400/20', border: 'hover:border-primary-400' 
    },
    { 
      title: isEn ? 'Education & Health Services' : 'Layanan Pendidikan & Kesehatan', 
      desc: isEn ? 'Access to basic education facilities and proper medical services for remote citizens.' : 'Akses fasilitas pendidikan dasar dan layanan medis memadai bagi masyarakat pelosok.', 
      icon: GraduationCap, color: 'text-amber-500', bg: 'bg-amber-50', shadow: 'hover:shadow-amber-500/20', border: 'hover:border-amber-500' 
    },
    { 
      title: isEn ? 'Productive Economy' : 'Ekonomi Produktif', 
      desc: isEn ? 'Scaling home industries, agricultural MSMEs, and reinforcing supply chains.' : 'Peningkatan kapasitas industri rumahan, UMKM agrikultur, dan penguatan rantai pasok.', 
      icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', shadow: 'hover:shadow-emerald-500/20', border: 'hover:border-emerald-500' 
    },
    { 
      title: isEn ? 'Innovation & Independent Tech' : 'Inovasi & Teknologi Mandiri', 
      desc: isEn ? 'Application of appropriate technology in farming and crop processing.' : 'Penerapan teknologi tepat guna dalam pertanian dan pengolahan hasil panen.', 
      icon: Lightbulb, color: 'text-red-500', bg: 'bg-red-50', shadow: 'hover:shadow-red-500/20', border: 'hover:border-red-500' 
    },
    { 
      title: isEn ? 'Downstreaming & Industrialization' : 'Hilirisasi & Industrialisasi', 
      desc: isEn ? 'Boosting value-added local commodities through integrated processing blocks.' : 'Peningkatan nilai tambah komoditas lokal melalui lumbung pengolahan terintegrasi.', 
      icon: Factory, color: 'text-primary-600', bg: 'bg-primary-50', shadow: 'hover:shadow-primary-600/20', border: 'hover:border-primary-600' 
    },
    { 
      title: isEn ? 'Village Digitalization' : 'Digitalisasi Desa', 
      desc: isEn ? 'Deployment of Unified Village Info Systems and satellite internet in 3T areas.' : 'Implementasi Sistem Informasi Desa Terpadu dan akses internet satelit daerah 3T.', 
      icon: Wifi, color: 'text-primary-400', bg: 'bg-emerald-100', shadow: 'hover:shadow-primary-400/20', border: 'hover:border-primary-400' 
    },
    { 
      title: isEn ? 'Renewable Energy' : 'Energi Terbarukan', 
      desc: isEn ? 'Self-reliant village electrification via communal solar grids and clean energy.' : 'Elektrifikasi pedesaan mandiri melalui PLTS komunal dan solusi energi bersih.', 
      icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', shadow: 'hover:shadow-amber-500/20', border: 'hover:border-amber-500' 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-500 overflow-x-hidden selection:bg-primary-600 selection:text-white">
      
      {/* 
        HERO SECTION - Using the soft pastel gradient and mockup presentation 
        to match the "Sneat" template reference provided by the user.
      */}
      <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-48 overflow-hidden bg-gradient-to-br from-primary-100/40 via-slate-50 to-primary-50/30">
        {/* Navigation - Transparent, clean */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-0' : 'bg-transparent py-2'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-2 sm:gap-3">
                {appSettings?.logoUrl ? (
                  <img src={appSettings.logoUrl} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md transform -rotate-6" />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/30 transform -rotate-6">
                    <Map className="w-5 h-5 sm:w-6 sm:h-6 transform rotate-6" />
                  </div>
                )}
                <div>
                  <h1 className="font-extrabold text-lg sm:text-xl md:text-2xl text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[125px] xs:max-w-[160px] sm:max-w-none">
                    {appSettings?.appName ? appSettings.appName : <>Trans<span className="text-primary-600">3T</span></>}
                  </h1>
                </div>
              </div>
              <div className="hidden lg:flex space-x-6 xl:space-x-8 items-center">
                <a href="#tentang" className="text-slate-500 hover:text-primary-600 font-semibold transition-colors">{t.nav_program}</a>
                <a href="#lokus" className="text-slate-500 hover:text-primary-600 font-semibold transition-colors">{t.nav_lokus}</a>
                <a href="#pilar" className="text-slate-500 hover:text-primary-600 font-semibold transition-colors">{t.nav_pilar}</a>
                <button 
                  onClick={() => {
                    window.location.href = '/pengaduan';
                  }}
                  className="text-red-500 font-bold text-sm tracking-wide hover:text-red-600 flex items-center gap-1 transition-colors animate-pulse"
                >
                   <MessageSquare className="w-4 h-4" /> {t.nav_complaint}
                </button>
                <button 
                  onClick={() => {
                    window.location.href = '/verify';
                  }}
                  className="text-primary-600 font-bold text-sm tracking-wide hover:text-primary-700 flex items-center gap-1 transition-colors"
                >
                   <ShieldCheck className="w-4 h-4" /> {t.nav_tte}
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Responsive Language Switcher */}
                <div className="flex items-center border border-slate-200 bg-white/75 backdrop-blur-xs rounded-lg p-0.5 shadow-xs">
                  <button 
                    onClick={() => setLanguage('id')}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${!isEn ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    ID
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${isEn ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    EN
                  </button>
                </div>

                <button 
                  onClick={() => {
                    window.history.pushState({}, '', '/login');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hidden lg:flex bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-[0_4px_14px_0_rgba(105,108,255,0.39)] items-center gap-2 text-sm"
                >
                  {t.nav_dashboard} <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 text-slate-500 hover:text-primary-600 focus:outline-none"
                >
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden fixed top-20 left-0 w-full bg-white shadow-xl z-40 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar border-t border-slate-100"
            >
              <div className="px-4 pt-2 pb-6 space-y-2">
                <a 
                  href="#tentang" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-3 text-base font-semibold text-slate-500 hover:text-primary-600 hover:bg-primary-600/5 rounded-lg"
                >
                  {t.nav_program}
                </a>
                <a 
                  href="#lokus" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-3 text-base font-semibold text-slate-500 hover:text-primary-600 hover:bg-primary-600/5 rounded-lg"
                >
                  {t.nav_lokus}
                </a>
                <a 
                  href="#pilar" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-3 text-base font-semibold text-slate-500 hover:text-primary-600 hover:bg-primary-600/5 rounded-lg"
                >
                  {t.nav_pilar}
                </a>
                <button 
                  onClick={() => {
                     window.location.href = '/pengaduan';
                  }}
                  className="w-full text-left px-3 py-3 text-base font-bold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                   <MessageSquare className="w-5 h-5" /> {t.nav_complaint}
                </button>
                <button 
                  onClick={() => {
                    window.location.href = '/verify';
                  }}
                  className="w-full text-left px-3 py-3 text-base font-bold text-primary-600 hover:bg-primary-600/5 rounded-lg flex items-center gap-2"
                >
                   <ShieldCheck className="w-5 h-5" /> {t.nav_tte}
                </button>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      window.history.pushState({}, '', '/login');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)]"
                  >
                    Masuk ke Dashboard <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center mt-12 md:mt-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm text-primary-600 font-bold text-sm mb-8 shadow-sm border border-white/50"
          >
            <ShieldCheck className="w-4 h-4" />
            {t.system_title}
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{ __html: String(t.hero_headline).replace(/(3T Regions|Kawasan 3T Indonesia)/gi, '<span class="text-primary-600">$&</span>') }}
          />
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto"
          >
            {t.hero_subhead}
          </motion.p>
        </div>


      </section>

      {/* Stats/Highlights */}
      <section className="py-12 bg-white border-b-0 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: t.stat_locus, value: dynamicContent.stat_locus_val || '124+', icon: Map, color: 'text-primary-600', bg: 'bg-primary-50' },
              { label: t.stat_family, value: dynamicContent.stat_family_val || '45.000+', icon: Users, color: 'text-primary-400', bg: 'bg-emerald-100' },
              { label: t.stat_land, value: dynamicContent.stat_land_val || '1.2M', icon: Sprout, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: t.stat_facility, value: dynamicContent.stat_facility_val || '3.400+', icon: Building, color: 'text-amber-500', bg: 'bg-amber-50' }
            ].map((stat, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className="text-center"
              >
                <div className={`inline-flex justify-center items-center w-12 h-12 sm:w-14 sm:h-14 ${stat.bg} ${stat.color} rounded-xl mb-4 shadow-sm`}>
                  <stat.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">{stat.value}</h3>
                <p className="text-slate-500 font-medium text-[11px] sm:text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="tentang" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary-50 to-primary-100/30 rounded-[2rem] transform -rotate-3"></div>
                <img 
                  src="https://images.unsplash.com/photo-1596422846543-74c6e271a8c9?auto=format&fit=crop&q=80&w=1000" 
                  alt="Masyarakat Transmigran" 
                  className="relative rounded-2xl shadow-xl z-10 border-4 border-white"
                />
                <div className="absolute -bottom-6 -right-6 bg-white p-4 sm:p-6 rounded-xl shadow-[0_2px_12px_0_rgba(67,89,113,0.15)] z-20 max-w-[220px] sm:max-w-xs border-0">
                  <div className="flex items-center gap-3 sm:gap-4 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight">{isEn ? 'Sustainable\nDevelopment' : 'Pembangunan\nBerkelanjutan'}</h4>
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-2">{t.about_badge_desc}</p>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <span className="bg-primary-50 text-primary-600 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-4 inline-block">{t.about_tag}</span>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 leading-tight">{t.about_title}</h3>
              <p className="text-slate-500 mb-8 leading-relaxed text-base sm:text-lg">
                {t.about_desc}
              </p>
              <ul className="space-y-6">
                {[
                  { title: t.about_p1_title, desc: t.about_p1_desc },
                  { title: t.about_p2_title, desc: t.about_p2_desc },
                  { title: t.about_p3_title, desc: t.about_p3_desc }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 shadow-sm flex items-center justify-center">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Areas (Lokus) - Restyled as SaaS Cards */}
      <section id="lokus" className="py-24 bg-white border-y-0 relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="bg-primary-50 text-primary-600 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-3 inline-block">{t.lokus_tag}</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">{t.lokus_title}</h3>
            <p className="text-slate-500 text-base sm:text-lg">
              {t.lokus_desc}
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-slate-50 p-1.5 rounded-xl text-sm border-0 shadow-[0_2px_4px_inset_rgba(67,89,113,0.05)]">
              <button 
                onClick={() => setActiveTab('papua')}
                className={`px-4 sm:px-8 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all ${
                  activeTab === 'papua' 
                  ? 'bg-white text-primary-600 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]' 
                  : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.lokus_tab_papua}
              </button>
              <button 
                onClick={() => setActiveTab('non-papua')}
                className={`px-4 sm:px-8 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all ${
                  activeTab === 'non-papua' 
                  ? 'bg-white text-primary-600 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]' 
                  : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.lokus_tab_non_papua}
              </button>
            </div>
          </div>

          <div>
            {activeTab === 'papua' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 gap-10 items-center bg-white"
              >
                <div className="order-2 md:order-1">
                  <h4 className="text-2xl font-bold text-slate-800 mb-4">{t.papua_title}</h4>
                  <p className="text-slate-500 mb-8 leading-relaxed text-sm sm:text-base">
                    {t.papua_desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all cursor-default">
                      <Sun className="w-8 h-8 text-amber-500 mb-3" />
                      <h5 className="font-bold text-slate-800 mb-1">{t.papua_card1_title}</h5>
                      <p className="text-xs text-slate-500">{t.papua_card1_desc}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all cursor-default">
                      <Sprout className="w-8 h-8 text-emerald-500 mb-3" />
                      <h5 className="font-bold text-slate-800 mb-1">{t.papua_card2_title}</h5>
                      <p className="text-xs text-slate-500">{t.papua_card2_desc}</p>
                    </div>
                  </div>
                  <ul className="space-y-3 font-semibold text-slate-500 text-sm">
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-primary-50 flex items-center justify-center text-primary-600"><CheckCircle2 className="w-4 h-4" /></div> {t.papua_l1}
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-primary-50 flex items-center justify-center text-primary-600"><CheckCircle2 className="w-4 h-4" /></div> {t.papua_l2}
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-primary-50 flex items-center justify-center text-primary-600"><CheckCircle2 className="w-4 h-4" /></div> {t.papua_l3}
                    </li>
                  </ul>
                </div>
                <div className="order-1 md:order-2 h-[260px] sm:h-[450px] rounded-2xl overflow-hidden shadow-xl border-4 sm:border-8 border-white bg-gray-100 relative">
                  <img src="https://images.unsplash.com/photo-1542274368-443d694d79aa?auto=format&fit=crop&q=80&w=1000" alt="Lokus Papua" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            )}

            {activeTab === 'non-papua' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 gap-10 items-center bg-white"
              >
                 <div className="order-2 md:order-1">
                  <h4 className="text-2xl font-bold text-slate-800 mb-4">{t.non_papua_title}</h4>
                  <p className="text-slate-500 mb-8 leading-relaxed text-sm sm:text-base">
                    {t.non_papua_desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all cursor-default">
                      <Building className="w-8 h-8 text-primary-400 mb-3" />
                      <h5 className="font-bold text-slate-800 mb-1">{t.non_papua_card1_title}</h5>
                      <p className="text-xs text-slate-500">{t.non_papua_card1_desc}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all cursor-default">
                      <Globe className="w-8 h-8 text-primary-400 mb-3" />
                      <h5 className="font-bold text-slate-800 mb-1">{t.non_papua_card2_title}</h5>
                      <p className="text-xs text-slate-500">{t.non_papua_card2_desc}</p>
                    </div>
                  </div>
                  <ul className="space-y-3 font-semibold text-slate-500 text-sm">
                     <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-primary-400"><CheckCircle2 className="w-4 h-4" /></div> {t.non_papua_l1}
                     </li>
                     <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-primary-400"><CheckCircle2 className="w-4 h-4" /></div> {t.non_papua_l2}
                     </li>
                     <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-primary-400"><CheckCircle2 className="w-4 h-4" /></div> {t.non_papua_l3}
                     </li>
                  </ul>
                </div>
                <div className="order-1 md:order-2 h-[260px] sm:h-[450px] rounded-2xl overflow-hidden shadow-xl border-4 sm:border-8 border-white bg-gray-100 relative">
                  <img src="https://images.unsplash.com/photo-1590403332412-282490205af4?auto=format&fit=crop&q=80&w=1000" alt="Lokus Non Papua" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Pillars / Services - Light SaaS Version */}
      <section id="pilar" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="bg-primary-50 text-primary-600 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-3 inline-block">{t.pilar_tag}</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6">{t.pilar_title}</h3>
            <p className="text-slate-500 text-base sm:text-lg">{t.pilar_desc}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillarsList.map((pillar, idx) => (
              <div key={idx} className={`bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] p-6 sm:p-8 rounded-xl transition-all duration-300 hover:-translate-y-2`}>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${pillar.bg} rounded-xl flex items-center justify-center mb-6`}>
                  <pillar.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${pillar.color}`} />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-slate-800 mb-3">{pillar.title}</h4>
                <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl tracking-tight md:text-5xl font-extrabold text-white mb-6">
            {t.cta_title}
          </h2>
          <p className="text-white/80 text-base sm:text-lg md:text-xl mb-10 max-w-3xl mx-auto">
            {t.cta_desc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <button 
                onClick={() => {
                  window.history.pushState({}, '', '/login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="bg-white text-primary-600 hover:bg-gray-50 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-[0_4px_14px_0_rgba(255,255,255,0.39)] transition-all flex items-center justify-center gap-2"
              >
                {t.cta_btn} <ArrowRight className="w-5 h-5" />
              </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-slate-500 py-12 border-0 shadow-[0_-2px_6px_0_rgba(67,89,113,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {appSettings?.logoUrl ? (
                <img src={appSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                  <Map className="w-4 h-4" />
                </div>
              )}
              <h4 className="text-slate-800 font-bold text-lg">
                {appSettings?.appName ? appSettings.appName : <>Trans<span className="text-primary-600">3T</span></>}
              </h4>
            </div>
            <p className="text-slate-500 leading-relaxed text-sm max-w-sm">
              {appSettings?.appName ? (
                isEn ? `Integrated Information System for Reporting, Recording, and Progress Evaluation of 3T Transmigration Areas for platform ${appSettings.appName}.` : `Sistem Informasi Terpadu Pelaporan, Pendataan, dan Evaluasi Perkembangan Kawasan Transmigrasi Lokus 3T untuk platform ${appSettings.appName}.`
              ) : (
                t.footer_desc
              )}
            </p>
          </div>
          <div>
            <h5 className="text-slate-800 font-bold mb-4">{t.footer_links}</h5>
            <ul className="space-y-2 text-sm font-medium">
              <li><a href="#tentang" className="hover:text-primary-600 transition-colors">{t.nav_program}</a></li>
              <li><a href="#lokus" className="hover:text-primary-600 transition-colors">{t.nav_lokus}</a></li>
              <li><a href="#pilar" className="hover:text-primary-600 transition-colors">{t.nav_pilar}</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-slate-800 font-bold mb-4">{t.footer_contact}</h5>
            <ul className="space-y-2 text-sm font-medium">
              <li><a href="/support" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/support'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-primary-600 transition-colors">{t.helpful_center}</a></li>
              <li>Email: {appSettings?.supportEmail || 'info@transmigrasi-3t.go.id'}</li>
              <li>Hotline: {appSettings?.supportHotline || '1500-123'}</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-300 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-sm font-medium">
          <p>© {new Date().getFullYear()} {appSettings?.instansiName || appSettings?.appName || 'Kementerian terkait & Tim Pengembangan'}. {t.footer_rights}</p>
          <div className="space-x-4 mt-4 md:mt-0 flex gap-4">
             <a href="/terms" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-primary-600 cursor-pointer transition-colors block">{t.footer_terms}</a>
             <a href="/privacy" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="hover:text-primary-600 cursor-pointer transition-colors block">{t.footer_privacy}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
