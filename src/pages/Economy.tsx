import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Coins, 
  Users, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  X, 
  ArrowRightLeft, 
  Globe, 
  Briefcase, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ShoppingBag,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '../store/useStore';

interface EconomyRecord {
  id?: string;
  kawasanName: string;
  region: string;
  isPapua: boolean;
  sector: string; // 'Pertanian & Perkebunan' | 'Perikanan & Kelautan' | 'Kerajinan & Kriya' | 'UMKM & Jasa' | 'Pariwisata & Kuliner'
  commodity: string;
  monthlyIncome: number;
  activeEntrepreneurs: number;
  marketAccess: string; // 'Lokal' | 'Regional' | 'Nasional' | 'Ekspor'
  assistanceProgram: string;
  notes: string;
  month?: string; // e.g. 'Januari', 'Mei'
  year?: string;  // e.g. '2026'
  createdAt?: string;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEARS = ['2023', '2024', '2025', '2026', '2027'];

const SEED_DATA: EconomyRecord[] = [
  { kawasanName: 'Kawasan Merauke (Muting) - 3T', region: 'Papua Selatan', isPapua: true, sector: 'Pertanian & Perkebunan', commodity: 'Sagu, Ubi Kebun, Padi', monthlyIncome: 2800000, activeEntrepreneurs: 85, marketAccess: 'Regional / Antar Kota', assistanceProgram: 'Peralatan Penggilingan Sagu Modern', notes: 'Potensi sagu melimpah, membutuhkan alat pengemas modern untuk pasar retail.', month: 'Mei', year: '2026' },
  { kawasanName: 'Kawasan Sorong (Klamono) - 3T', region: 'Papua Barat Daya', isPapua: true, sector: 'Kerajinan & Kriya', commodity: 'Noken, Ukiran Kayu, Mahkota Bulu', monthlyIncome: 2100000, activeEntrepreneurs: 45, marketAccess: 'Nasional / E-Commerce', assistanceProgram: 'Pelatihan Digital UMKM & Foto Produk', notes: 'Pemasaran noken merambah ke Tokopedia dan Instagram, peningkatan omset 30%.', month: 'Mei', year: '2026' },
  { kawasanName: 'Kawasan Nabire (Teluk Kimi)', region: 'Papua Tengah', isPapua: true, sector: 'Perikanan & Kelautan', commodity: 'Ikan Kerapu, Lobster, Rumput Laut', monthlyIncome: 4200000, activeEntrepreneurs: 110, marketAccess: 'Ekspor', assistanceProgram: 'Penyediaan Cold Storage bertenaga Surya', notes: 'Cold storage bertenaga surya berhasil menekan kerugian hasil tangkap nelayan.', month: 'April', year: '2026' },
  { kawasanName: 'Kawasan Pegunungan Bintang - 3T', region: 'Papua Pegunungan', isPapua: true, sector: 'Pertanian & Perkebunan', commodity: 'Kopi Arabika Papua, Buah Merah', monthlyIncome: 3500000, activeEntrepreneurs: 60, marketAccess: 'Nasional / E-Commerce', assistanceProgram: 'Bantuan Pengering Kopi & Sertifikasi Organik', notes: 'Cita rasa kopi organik Pegunungan Bintang sangat digemari penikmat kopi nasional.', month: 'April', year: '2026' },
  { kawasanName: 'Kawasan Sumba Timur - 3T', region: 'NTT', isPapua: false, sector: 'Kerajinan & Kriya', commodity: 'Kain Tenun Ikat Sumba, Anyaman Pandan', monthlyIncome: 3100000, activeEntrepreneurs: 75, marketAccess: 'Nasional / E-Commerce', assistanceProgram: 'Insentif Pewarna Alami & Desain Kontemporer', notes: 'Tenun ikat bermotif tradisional Sumba lolos kurasi pameran UMKM nasional.', month: 'Maret', year: '2026' },
  { kawasanName: 'Kawasan Mentawai - 3T', region: 'Sumatera Barat', isPapua: false, sector: 'Pariwisata & Kuliner', commodity: 'Homestay Terpadu, Kerajinan Batok Kelapa', monthlyIncome: 3800000, activeEntrepreneurs: 40, marketAccess: 'Ekspor', assistanceProgram: 'Pelatihan Sapta Pesona & Bahasa Inggris', notes: 'Wisatawan mancanegara surf-camp memberikan pengaruh positif pada ekonomi lokal.', month: 'Maret', year: '2026' },
  { kawasanName: 'Kawasan Konawe', region: 'Sulawesi Tenggara', isPapua: false, sector: 'Pertanian & Perkebunan', commodity: 'Kakao, Nilam, Jagung Pipil', monthlyIncome: 4500000, activeEntrepreneurs: 240, marketAccess: 'Regional / Antar Kota', assistanceProgram: 'Bantuan Bibit Unggul Kakao & Pupuk Organik', notes: 'Sentra produksi kakao stabil dengan pasokan rutin ke pabrik olahan Makassar.', month: 'Februari', year: '2026' },
  { kawasanName: 'Kawasan Natuna - 3T', region: 'Kepulauan Riau', isPapua: false, sector: 'Perikanan & Kelautan', commodity: 'Ikan Tongkol, Ikan Kurau Asin', monthlyIncome: 4900000, activeEntrepreneurs: 130, marketAccess: 'Regional / Antar Kota', assistanceProgram: 'Bantuan Kapal Motor Tangkap 5 GT', notes: 'Tangkapan melimpah, kendala utama pada frekuensi kapal logistik reguler.', month: 'Januari', year: '2026' }
];

const SECTORS = [
  'Pertanian & Perkebunan',
  'Perikanan & Kelautan',
  'Kerajinan & Kriya',
  'UMKM & Jasa',
  'Pariwisata & Kuliner'
];

const REGIONS_SAMPLE = [
  'Papua Selatan', 'Papua Tengah', 'Papua Barat Daya', 'Papua Pegunungan', 'Papua Barat', 'Papua',
  'NTT', 'Sumatera Barat', 'Sulawesi Tenggara', 'Kepulauan Riau', 'Kalimantan Timur', 'Maluku Utara'
];

const COLORS = ['#696cff', '#03c3ec', '#10b981', '#9b5de5', '#ffab00', '#ff3e1d'];

const MASTER_LOKASI_FALLBACK = [
  { id: '1', name: 'Kawasan Merauke (Muting) - 3T', lat: -8.115, lng: 140.755, region: 'Papua Selatan', status: 'Pelaksanaan', is3T: true, category: 'Daerah 3T' },
  { id: '4', name: 'Kawasan Sorong (Klamono) - 3T', lat: -1.050, lng: 131.500, region: 'Papua Barat Daya', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '5', name: 'Kawasan Nabire (Teluk Kimi)', lat: -3.366, lng: 135.500, region: 'Papua Tengah', status: 'Pembinaan', is3T: false, category: 'Reguler' },
  { id: '7', name: 'Kawasan Asmat - 3T', lat: -5.538, lng: 138.134, region: 'Papua Selatan', status: 'Persiapan', is3T: true, category: 'Terpencil' },
  { id: '8', name: 'Kawasan Pegunungan Bintang - 3T', lat: -4.567, lng: 140.316, region: 'Papua Pegunungan', status: 'Pembinaan', is3T: true, category: 'Perbatasan' },
  { id: '2', name: 'Kawasan Sumba Timur - 3T', lat: -9.658, lng: 120.264, region: 'NTT', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '3', name: 'Kawasan Mentawai - 3T', lat: -2.040, lng: 99.553, region: 'Sumatera Barat', status: 'Pembinaan', is3T: true, category: 'Daerah 3T' },
  { id: '10', name: 'Kawasan Natuna - 3T', lat: 3.949, lng: 108.142, region: 'Kepulauan Riau', status: 'Pelaksanaan', is3T: true, category: 'Perbatasan' },
  { id: '11', name: 'Kawasan Pulau Morotai - 3T', lat: 2.045, lng: 128.293, region: 'Maluku Utara', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '6', name: 'Kawasan Konawe', lat: -3.850, lng: 122.050, region: 'Sulawesi Tenggara', status: 'Pelaksanaan', is3T: false, category: 'Reguler' },
];

export const Economy: React.FC = () => {
  const [data, setData] = useState<EconomyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPop, setFilterPop] = useState<'Semua' | 'Papua' | 'Non-Papua'>('Semua');
  const [filterSector, setFilterSector] = useState<string>('Semua');
  const [filterRegion, setFilterRegion] = useState<string>('Semua');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const geographies = rawProjects.length > 0 ? rawProjects : MASTER_LOKASI_FALLBACK;
  
  const currentUser = useStore(state => state.user);
  const canEdit = currentUser?.role !== 'pimpinan';
  const canDelete = currentUser?.role === 'superadmin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EconomyRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingInProgress, setSeedingInProgress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmittedAttempted, setFormSubmittedAttempted] = useState(false);

  const [formData, setFormData] = useState<Omit<EconomyRecord, 'id'>>({
    kawasanName: '',
    region: 'Papua Selatan',
    isPapua: true,
    sector: 'Pertanian & Perkebunan',
    commodity: '',
    monthlyIncome: 3000000,
    activeEntrepreneurs: 50,
    marketAccess: 'Lokal',
    assistanceProgram: '',
    notes: '',
    month: 'Mei',
    year: '2026'
  });

  // Load records from firestore
  useEffect(() => {
    const qProj = query(collection(db, 'projects'));
    const unsubProj = onSnapshot(qProj, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawProjects(projs);
    }, (err) => console.error(err));

    const q = query(collection(db, 'community_economy'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EconomyRecord));
      setData(items);
      setLoading(false);
    }, async (error) => {
      handleFirestoreError(error, OperationType.LIST, 'community_economy');
      setLoading(false);
    });
    return () => {
      unsubProj();
      unsubscribe();
    };
  }, []);

  // Seed default data if database is empty or user requests it
  const seedDefaultData = async () => {
    setSeedingInProgress(true);
    try {
      const q = query(collection(db, 'community_economy'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const batch = writeBatch(db);
        SEED_DATA.forEach(record => {
          const newDocRef = doc(collection(db, 'community_economy'));
          batch.set(newDocRef, { ...record, createdAt: new Date().toISOString() });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error("Error seeding default data:", e);
    } finally {
      setSeedingInProgress(false);
    }
  };

  // Run automatically if first load turns out empty
  useEffect(() => {
    if (!loading && data.length === 0) {
      seedDefaultData();
    }
  }, [loading, data]);

  const validateForm = (data: typeof formData): boolean => {
    const errs: Record<string, string> = {};
    if (!data.kawasanName.trim()) errs.kawasanName = 'Kawasan wajib dipilih.';
    if (!data.commodity.trim()) errs.commodity = 'Komoditi utama wajib diisi.';
    if (data.monthlyIncome < 0) errs.monthlyIncome = 'Pendapatan tidak valid.';
    if (data.activeEntrepreneurs < 0) errs.activeEntrepreneurs = 'Jumlah pelaku tidak valid.';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    if (formSubmittedAttempted) validateForm(formData);
  }, [formData, formSubmittedAttempted]);

  const handleOpenModal = (item?: EconomyRecord) => {
    setErrors({});
    setFormSubmittedAttempted(false);
    if (item) {
      setEditingItem(item);
      setFormData({
        kawasanName: item.kawasanName,
        region: item.region,
        isPapua: item.isPapua,
        sector: item.sector,
        commodity: item.commodity,
        monthlyIncome: item.monthlyIncome,
        activeEntrepreneurs: item.activeEntrepreneurs,
        marketAccess: item.marketAccess,
        assistanceProgram: item.assistanceProgram || '',
        notes: item.notes || '',
        month: item.month || (item.createdAt ? MONTHS[new Date(item.createdAt).getMonth()] : 'Mei'),
        year: item.year || (item.createdAt ? String(new Date(item.createdAt).getFullYear()) : '2026')
      });
      setSelectedRegion(item.region || '');
    } else {
      setEditingItem(null);
      setFormData({
        kawasanName: '',
        region: 'Papua Selatan',
        isPapua: true,
        sector: 'Pertanian & Perkebunan',
        commodity: '',
        monthlyIncome: 3000000,
        activeEntrepreneurs: 50,
        marketAccess: 'Lokal',
        assistanceProgram: '',
        notes: '',
        month: MONTHS[new Date().getMonth()] || 'Mei',
        year: String(new Date().getFullYear()) || '2026'
      });
      setSelectedRegion('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittedAttempted(true);
    if (!validateForm(formData)) return;
    
    try {
      if (editingItem?.id) {
        await updateDoc(doc(db, 'community_economy', editingItem.id), {
          ...formData,
          createdAt: editingItem.createdAt || new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'community_economy'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'community_economy');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'community_economy', deletingId));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `community_economy/${deletingId}`);
    }
  };

  // Filters application
  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.kawasanName.toLowerCase().includes(search.toLowerCase()) ||
      item.region.toLowerCase().includes(search.toLowerCase()) ||
      item.commodity.toLowerCase().includes(search.toLowerCase()) ||
      (item.assistanceProgram || '').toLowerCase().includes(search.toLowerCase());

    const matchesPop = 
      filterPop === 'Semua' || 
      (filterPop === 'Papua' && item.isPapua) || 
      (filterPop === 'Non-Papua' && !item.isPapua);

    const matchesSector = filterSector === 'Semua' || item.sector === filterSector;
    const matchesRegion = filterRegion === 'Semua' || item.region === filterRegion;

    const itemDate = item.createdAt ? item.createdAt.substring(0, 10) : '';
    let matchesDate = true;
    if (itemDate) {
      if (filterStartDate && itemDate < filterStartDate) matchesDate = false;
      if (filterEndDate && itemDate > filterEndDate) matchesDate = false;
    } else if (filterStartDate || filterEndDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesPop && matchesSector && matchesRegion && matchesDate;
  });

  // Dynamic DYNAMIC Stats computation based on filteredData!
  const statsPapua = filteredData.filter(d => d.isPapua);
  const statsNonPapua = filteredData.filter(d => !d.isPapua);

  const avgIncomePapua = statsPapua.length > 0 
    ? statsPapua.reduce((sum, d) => sum + d.monthlyIncome, 0) / statsPapua.length 
    : 0;

  const avgIncomeNonPapua = statsNonPapua.length > 0 
    ? statsNonPapua.reduce((sum, d) => sum + d.monthlyIncome, 0) / statsNonPapua.length 
    : 0;

  const totalEntrepreneursPapua = statsPapua.reduce((sum, d) => sum + d.activeEntrepreneurs, 0);
  const totalEntrepreneursNonPapua = statsNonPapua.reduce((sum, d) => sum + d.activeEntrepreneurs, 0);

  // Formatting helper
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Chart 1 Data: Average income comparison per sector
  const sectorIncomeChartData = SECTORS.map(sec => {
    const papuaSec = statsPapua.filter(d => d.sector === sec);
    const nonPapuaSec = statsNonPapua.filter(d => d.sector === sec);

    const papuaAvg = papuaSec.length > 0 ? papuaSec.reduce((s, d) => s + d.monthlyIncome, 0) / papuaSec.length : 0;
    const nonPapuaAvg = nonPapuaSec.length > 0 ? nonPapuaSec.reduce((s, d) => s + d.monthlyIncome, 0) / nonPapuaSec.length : 0;

    return {
      sector: sec.split(' & ')[0], // Compact label
      Papua: Math.round(papuaAvg),
      NonPapua: Math.round(nonPapuaAvg)
    };
  });

  // Chart 2 Data: Sector Distribution comparison
  const sectorDistributionData = SECTORS.map(sec => {
    const count = filteredData.filter(d => d.sector === sec).length;
    return {
      name: sec,
      value: count
    };
  }).filter(d => d.value > 0);

  // Chart 3 Data: Market Access comparison
  const ACCESS_LEVELS = ['Lokal', 'Regional / Antar Kota', 'Nasional / E-Commerce', 'Ekspor'];
  const marketAccessChartData = ACCESS_LEVELS.map(level => {
    const papuaCount = statsPapua.filter(d => d.marketAccess.includes(level.split(' / ')[0])).length;
    const nonPapuaCount = statsNonPapua.filter(d => d.marketAccess.includes(level.split(' / ')[0])).length;

    return {
      subject: level.split(' / ')[0],
      Papua: papuaCount,
      'Non Papua': nonPapuaCount,
      fullMark: Math.max(papuaCount, nonPapuaCount, 5)
    };
  });

  const exportCSV = () => {
    const exportData = filteredData.map(item => ({
      'Nama Kawasan': item.kawasanName,
      'Wilayah / Provinsi': item.region,
      'Masyarakat Papua': item.isPapua ? 'Ya' : 'Bukan (Non-Papua)',
      'Sektor Usaha': item.sector,
      'Komoditas Utama': item.commodity,
      'Rata-rata Pendapatan Per Bulan (Rp)': item.monthlyIncome,
      'Jumlah Pelaku Usaha (KK)': item.activeEntrepreneurs,
      'Akses Pasar Utama': item.marketAccess,
      'Program Pemberdayaan / Bantuan': item.assistanceProgram || 'None',
      'Catatan': item.notes || ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Socio_Economy_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Laporan Sosial Ekonomi Masyarakat Transmigrasi (Papua & Non-Papua)', 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 21);

    const tableRows = filteredData.map((item, index) => [
      index + 1,
      item.kawasanName,
      item.region,
      item.isPapua ? 'Papua' : 'Non-Papua',
      item.sector,
      item.commodity,
      formatRupiah(item.monthlyIncome),
      item.activeEntrepreneurs,
      item.marketAccess,
      item.assistanceProgram || '-'
    ]);

    autoTable(doc, {
      head: [['No', 'Kawasan', 'Wilayah', 'Kelompok', 'Sektor', 'Komoditi', 'Pendapatan', 'Pelaku', 'Pasar', 'Program Utama']],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [105, 108, 255] }
    });

    doc.save(`Socio_Economy_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const uniqueRegions = Array.from(new Set(data.map(item => item.region)));

  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterPop, filterSector, filterRegion, filterStartDate, filterEndDate]);

  const renderPageNumbers = () => {
    const pages = [];
    const maxNeighbours = 1;
    const leftBound = Math.max(2, currentPage - maxNeighbours);
    const rightBound = Math.min(totalPages - 1, currentPage + maxNeighbours);

    pages.push(1);

    if (leftBound > 2) {
      pages.push('ellipsis-left');
    }

    for (let i = leftBound; i <= rightBound; i++) {
      pages.push(i);
    }

    if (rightBound < totalPages - 1) {
      pages.push('ellipsis-right');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages.map((p, index) => {
      if (typeof p === 'string') {
        return <span key={`ellipsis-${index}`} className="text-slate-400 px-1 font-medium">...</span>;
      }
      return (
        <button
          key={p}
          type="button"
          onClick={() => setCurrentPage(p)}
          className={cn(
            "w-8 h-8 text-xs sm:text-sm font-bold rounded-lg transition-all border shrink-0",
            currentPage === p 
              ? "bg-primary-500 text-white border-primary-500 shadow-xs" 
              : "border-slate-200 text-slate-650 hover:bg-slate-50 cursor-pointer"
          )}
        >
          {p}
        </button>
      );
    });
  };

  // Dynamic insight based on the actual Firestore dataset (eliminates hardcoded stubs)
  const getDynamicInsight = () => {
    if (loading) return 'Sedang memuat analisis pasar kualitatif...';
    if (data.length === 0) return 'Belum ada data pemberdayaan ekonomi masyarakat tercatat.';
    
    const oapCount = data.filter(d => d.isPapua).length;
    const sectorsCount = new Set(data.map(d => d.sector)).size;
    
    // Find representative items
    const exportRecord = [...data].reverse().find(d => d.marketAccess.toLowerCase().includes('ekspor'));
    const maxIncomeRecord = [...data].sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0];
    
    if (exportRecord) {
      return `Komunitas ${exportRecord.isPapua ? 'OAP' : 'Pendatang'} di ${exportRecord.kawasanName} (${exportRecord.region}) berhasil memperluas pemasaran produk ${exportRecord.commodity} hingga menembus pasar Ekspor terbantu program ${exportRecord.assistanceProgram || 'pemberdayaan kementerian'}.`;
    } else if (maxIncomeRecord) {
      return `Sub-lokus ${maxIncomeRecord.kawasanName} (${maxIncomeRecord.region}) mencatat rata-rata omset pelaku usaha tertinggi sebesar ${formatRupiah(maxIncomeRecord.monthlyIncome)} / bulan pada sektor ${maxIncomeRecord.sector}.`;
    }
    
    return `Analisis mencakup total ${data.length} sub-lokus binaan di ${sectorsCount} sektor utama, memantau kemandirian ${oapCount} kelompok pelaku usaha OAP.`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans animate-fade-in id-container-economy">
      {/* Header Panel */}
      <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex flex-wrap items-center gap-2">
              Ekonomi Pemberdayaan Masyarakat 3T
              <span className="text-xs font-bold px-2 py-0.5 bg-primary-100/50 text-primary-600 rounded-full">Comparative Module</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Monitor, analisis, dan kembangkan ekosistem ekonomi antara masyarakat asli Papua (OAP) dan Non-Papua di wilayah Transmigrasi 3T.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold transition-all hover:border-slate-350 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-450" />
            CSV Export
          </button>
          
          <button 
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold transition-all hover:border-slate-350 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-rose-500" />
            PDF Report
          </button>

          {canEdit && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1 px-4 py-2 text-xs bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600 transition-all shadow-md shadow-primary-500/10 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Socio-Ekonomi Baru
            </button>
          )}
        </div>
      </div>

      {seedingInProgress && (
        <div className="bg-primary-50 border border-primary-250 p-4 rounded-xl text-xs text-primary-700 font-bold animate-pulse text-center">
          Menginisialisasi data pelacak ekonomi kualitatif wilayah Papua ke Firestore...
        </div>
      )}

      {/* Comparative Overview Row (Papua vs Non Papua) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Pendapatan Papua */}
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Pendapatan OAP (Papua)</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-primary-600 truncate leading-none pt-1">
              {loading ? '...' : formatRupiah(avgIncomePapua)}
            </h3>
            <p className="text-[11px] text-slate-450 font-medium">Berdasarkan data {statsPapua.length} sub-lokus Papua</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-100/50 flex items-center justify-center text-primary-600 shrink-0 shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 : Pendapatan Non-Papua */}
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Pendapatan Non-Papua</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 truncate leading-none pt-1">
              {loading ? '...' : formatRupiah(avgIncomeNonPapua)}
            </h3>
            <p className="text-[11px] text-slate-450 font-medium">Berdasarkan data {statsNonPapua.length} sub-lokus lainnya</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Aktivitas Kewirausahaan Meluas */}
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Pelaku UMKM Papua</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-primary-550 truncate leading-none pt-1">
              {loading ? '...' : `${totalEntrepreneursPapua} KK`}
            </h3>
            <p className="text-[11px] text-slate-450 font-medium">Terbina dari bantuan produktif</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-500 shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Ratio Kesenjangan */}
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)] transition-all flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Rasio Gini Wilayah (Kesenjangan)</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 truncate leading-none pt-1">
              {loading ? '...' : `${Math.round((avgIncomePapua / (avgIncomeNonPapua || 1)) * 100)} %`}
            </h3>
            <p className="text-[11px] text-slate-450 font-medium">Nilai ideal pembanding daerah</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytical Charts Block Removed */}

      {/* Smart Filters Pane */}
      <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-4">
        <div className="flex flex-col lg:flex-row gap-3.5 items-center justify-between">
          {/* Left search */}
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Cari Lokasi, Komoditi, atau Program Bantuan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-10 pr-4 py-2.5 outline-none focus:bg-white focus:border-primary-500 transition-all font-medium text-slate-700"
            />
          </div>

          {/* Filters selectors - Fully responsive grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="col-span-2 md:col-span-1 lg:col-span-1 flex items-center gap-1.5 shrink-0 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-450" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">FILTER:</span>
            </div>

            {/* Kelompok Pembanding */}
            <select
              value={filterPop}
              onChange={(e) => setFilterPop(e.target.value as any)}
              className="w-full lg:w-auto bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-primary-500 focus:bg-white cursor-pointer shadow-2xs transition-all"
            >
              <option value="Semua">Kelompok (Semua)</option>
              <option value="Papua">Papua (OAP)</option>
              <option value="Non-Papua">Non-Papua</option>
            </select>

            {/* Sektor Usaha */}
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="w-full lg:w-auto bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-primary-500 focus:bg-white cursor-pointer shadow-2xs transition-all"
            >
              <option value="Semua">Sektor (Semua)</option>
              {SECTORS.map((sec, i) => (
                <option key={i} value={sec}>{sec}</option>
              ))}
            </select>

            {/* Provinsi / Wilayah */}
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full lg:w-auto bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-primary-500 focus:bg-white cursor-pointer shadow-2xs transition-all select-none"
            >
              <option value="Semua">Wilayah (Semua)</option>
              {uniqueRegions.length > 0 ? (
                uniqueRegions.map((reg, i) => (
                  <option key={i} value={reg}>{reg}</option>
                ))
              ) : (
                REGIONS_SAMPLE.map((reg, i) => (
                  <option key={i} value={reg}>{reg}</option>
                ))
              )}
            </select>

            {/* Start Date */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 w-full lg:w-auto shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Mulai</span>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold cursor-pointer w-full text-right lg:text-left focus:ring-0 min-w-[100px]" />
            </div>

            {/* End Date */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 w-full lg:w-auto shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Akhir</span>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold cursor-pointer w-full text-right lg:text-left focus:ring-0 min-w-[100px]" />
            </div>
            
            {/* Clear Filters Button */}
            {(search !== '' || filterPop !== 'Semua' || filterSector !== 'Semua' || filterRegion !== 'Semua' || filterStartDate !== '' || filterEndDate !== '') && (
              <button 
                onClick={() => {
                  setSearch('');
                  setFilterPop('Semua');
                  setFilterSector('Semua');
                  setFilterRegion('Semua');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="col-span-2 md:col-span-1 lg:col-span-1 text-center text-[11px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-all cursor-pointer"
              >
                Atur Ulang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Socio-Economic Table and Cards */}
      <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] overflow-hidden">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-450 font-bold text-xs uppercase tracking-widest animate-pulse">Menghubungkan data Real Ekonomi...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm mb-1">Data Sosial Ekonomi Tidak Ditemukan</h3>
            <p className="text-xs text-slate-450 max-w-sm mx-auto mb-4 font-semibold">
              Tidak ada pelacakan indikator ekonomi daerah pemberdayaan yang memenuhi kriteria filter saat ini.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setFilterPop('Semua');
                setFilterSector('Semua');
                setFilterRegion('Semua');
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Hapus Semua Filter
            </button>
          </div>
        ) : (
          <div>
            {/* Mobile-first Cards View: Hidden on medium screens (md) and up, block on mobile */}
            <div className="block md:hidden divide-y divide-slate-200">
              {paginatedData.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-50/50 transition-colors space-y-4 text-left">
                  {/* Card Title & Kelompok OAP/Non-OAP Tag */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-[13.5px] tracking-tight leading-snug break-words">
                        {item.kawasanName}
                      </h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                          {item.region}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                          {item.month || (item.createdAt ? MONTHS[new Date(item.createdAt).getMonth()] : 'Mei')} {item.year || (item.createdAt ? String(new Date(item.createdAt).getFullYear()) : '2026')}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-black tracking-wider rounded-md select-none shrink-0 border",
                      item.isPapua 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-100" 
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {item.isPapua ? 'OAP' : 'NON-OAP'}
                    </span>
                  </div>

                  {/* Income and Entrepreneurs indicators in a sleek mini-bento card */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border-0 font-sans">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Rata Pendapatan</span>
                      <p className="font-mono font-extrabold text-slate-800 text-[12px] sm:text-[13px]">
                        {formatRupiah(item.monthlyIncome)}
                      </p>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-200 pl-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Masyarakat Usaha</span>
                      <p className="font-mono font-extrabold text-slate-800 text-[12px] sm:text-[13px]">
                        {item.activeEntrepreneurs} KK
                      </p>
                    </div>
                  </div>

                  {/* Context Details: Sector & Market access */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Sektor Komoditas</span>
                      <span className="font-bold text-slate-700 text-right truncate">
                        {item.sector} <span className="text-slate-400 font-normal">({item.commodity})</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Rantai Akses Pasar</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase font-sans",
                        item.marketAccess.includes('Ekspor') ? 'bg-rose-50 text-rose-600' :
                        item.marketAccess.includes('Nasional') ? 'bg-primary-50 text-primary-600' :
                        item.marketAccess.includes('Regional') ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-500'
                      )}>
                        {item.marketAccess}
                      </span>
                    </div>

                    {item.assistanceProgram && (
                      <div className="bg-primary-50/35 p-3 rounded-xl border border-primary-100/50 mt-1.5">
                        <span className="text-[9px] font-black text-primary-600 block uppercase tracking-wider mb-0.5">Program Intervensi Utama</span>
                        <p className="font-extrabold text-slate-800 text-[11px] leading-relaxed mb-1">{item.assistanceProgram}</p>
                        {item.notes && (
                          <p className="text-[10px] font-medium text-slate-500 italic leading-normal border-t border-primary-100/40 pt-1.5 mt-1.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions (Edit / Delete) for mobile card format */}
                  {canEdit && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-primary-600 hover:bg-primary-50 active:scale-95 rounded-lg font-bold transition-all border border-primary-150 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Data
                      </button>
                      
                      {canDelete && (
                        <button
                          onClick={() => setDeletingId(item.id || null)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 active:scale-95 rounded-lg font-bold transition-all border border-rose-150 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View Table: Shown on tablet/desktop devices */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100/80 text-[10.5px] font-black text-slate-450 uppercase tracking-widest">
                    <th className="py-4 px-5">Sub-Lokus Pemberdayaan</th>
                    <th className="py-4 px-5">Kelompok</th>
                    <th className="py-4 px-5">Sektor Industri</th>
                    <th className="py-4 px-5 text-right">Rata pendapatan</th>
                    <th className="py-4 px-5 text-center">Pelaku (KK)</th>
                    <th className="py-4 px-5">Rantai Akses Pasar</th>
                    <th className="py-4 px-5">Intervensi Bantuan Utama</th>
                    {canEdit && <th className="py-4 px-5 text-center">Pilihan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Lokus & Region */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col min-w-[200px]">
                          <span className="font-bold text-slate-800 text-[13px] group-hover:text-primary-500 transition-colors">{item.kawasanName}</span>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {item.region}
                            </span>
                            <span className="inline-block text-slate-300 select-none">•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              {item.month || (item.createdAt ? MONTHS[new Date(item.createdAt).getMonth()] : 'Mei')} {item.year || (item.createdAt ? String(new Date(item.createdAt).getFullYear()) : '2026')}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Kelompok OAP vs Non */}
                      <td className="py-3.5 px-5">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-xl select-none",
                          item.isPapua 
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        )}>
                          {item.isPapua ? 'OAP PAPUA' : 'NON PAPUA'}
                        </span>
                      </td>

                      {/* Sektor & Komoditi */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col min-w-[150px]">
                          <span className="text-slate-800 text-[12.5px] font-bold">{item.sector}</span>
                          <span className="text-[10.5px] text-slate-450 italic mt-0.5 mt-1 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                            Komoditas: {item.commodity}
                          </span>
                        </div>
                      </td>

                      {/* Monthly Income */}
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-800 text-[12.5px]">
                        {formatRupiah(item.monthlyIncome)}
                      </td>

                      {/* Active entrepreneurs (HHs) */}
                      <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-800 text-[12.5px]">
                        {item.activeEntrepreneurs} KK
                      </td>

                      {/* Market access */}
                      <td className="py-3.5 px-5">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide uppercase",
                          item.marketAccess.includes('Ekspor') ? 'bg-rose-50 text-rose-600' :
                          item.marketAccess.includes('Nasional') ? 'bg-primary-50 text-primary-600' :
                          item.marketAccess.includes('Regional') ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-500'
                        )}>
                          {item.marketAccess}
                        </span>
                      </td>

                      {/* Assistance program and notes */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col max-w-[280px]">
                          <span className="font-bold text-slate-800 text-[12px] truncate">{item.assistanceProgram || 'None'}</span>
                          <span className="text-[10px] font-medium text-slate-450 line-clamp-2 mt-1 leading-normal leading-relaxed">{item.notes || '-'}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      {canEdit && (
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-center gap-1 my-auto">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="p-1.5 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            
                            {canDelete && (
                              <button
                                onClick={() => setDeletingId(item.id || null)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border-t border-slate-100 w-full text-left">
                <div className="text-xs sm:text-sm text-slate-500 font-medium">
                  Menampilkan {Math.min(filteredData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} sampai {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length} data
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button 
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                     Sebelumnya
                  </button>
                  <div className="flex items-center gap-1 flex-wrap">
                    {renderPageNumbers()}
                  </div>
                  <button 
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                     className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                     Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CRUD Form Dialog Modal - Highly Responsive Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in custom-scrollbar">
          <div className="bg-white rounded-2xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
                <h3 className="font-extrabold text-[15px] sm:text-base text-slate-800">
                  {editingItem ? 'Edit Data Sosial Ekonomi' : 'Catat Data Sosial Ekonomi Baru'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-left" noValidate>
              
              {/* Geografis & Pemetaan Kawasan Dropdowns */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Wilayah Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5 mb-1">WILAYAH (GEOGRAFIS) <span className="text-red-500">*</span></label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      const reg = e.target.value;
                      setSelectedRegion(reg);
                      // reset selected kawasan inside state
                      setFormData(prev => ({
                        ...prev,
                        kawasanName: '',
                        region: reg,
                      }));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-primary-500 cursor-pointer text-slate-700"
                    required
                  >
                    <option value="">-- Pilih Wilayah --</option>
                    <optgroup label="Daerah 3T Papua">
                      {Array.from(new Set(geographies.map(g => g.region)))
                        .sort()
                        .filter(r => r.toLowerCase().includes('papua'))
                        .map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Non Papua">
                      {Array.from(new Set(geographies.map(g => g.region)))
                        .sort()
                        .filter(r => !r.toLowerCase().includes('papua'))
                        .map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* Kawasan Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5 mb-1">KAWASAN (PEMETAAN) <span className="text-red-500">*</span></label>
                  <select
                    value={formData.kawasanName}
                    onChange={(e) => {
                      const kaw = e.target.value;
                      const matchingObj = geographies.find(g => g.name === kaw);
                      if (matchingObj) {
                        setFormData(prev => ({
                          ...prev,
                          kawasanName: matchingObj.name,
                          region: matchingObj.region,
                          isPapua: matchingObj.region.toLowerCase().includes('papua')
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, kawasanName: kaw }));
                      }
                    }}
                    className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors cursor-pointer text-slate-700", errors.kawasanName ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")}
                    required
                    disabled={!selectedRegion}
                  >
                    <option value="">{selectedRegion ? '-- Pilih Kawasan --' : 'Pilih Wilayah Terlebih Dahulu'}</option>
                    {geographies.filter(g => g.region === selectedRegion).map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                  {errors.kawasanName && <p className="text-[10px] text-red-500 px-1 font-medium mt-1">{errors.kawasanName}</p>}
                </div>
              </div>

              {/* Kelompok Masyarakat (OAP vs Non-Papua) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5 block mb-1">Klasifikasi Kelompok Masyarakat</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="isPapua"
                      checked={formData.isPapua}
                      onChange={() => setFormData({ ...formData, isPapua: true })}
                      className="w-4 h-4 text-primary-500 border-slate-300 focus:ring-primary-500 cursor-pointer"
                    />
                    Orang Asli Papua (OAP)
                  </label>
                  
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="isPapua"
                      checked={!formData.isPapua}
                      onChange={() => setFormData({ ...formData, isPapua: false })}
                      className="w-4 h-4 text-primary-550 border-slate-300 focus:ring-primary-500 cursor-pointer"
                    />
                    Non-Papuans / Pendatang
                  </label>
                </div>
              </div>

              {/* Sektor & Komoditi Utama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Sektor Industri Utama</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-primary-500 cursor-pointer"
                  >
                    {SECTORS.map((sec, i) => (
                      <option key={i} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Komoditas Yang Dihasilkan</label>
                  <input
                    type="text"
                    required
                    placeholder="Sagu, Kopi Arabika, Noken, Ikan dll"
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    className={cn("w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors", errors.commodity ? "border-red-500 focus:bg-white focus:border-red-500" : "border-slate-200 focus:bg-white focus:border-primary-500")}
                  />
                  {errors.commodity && <p className="text-[10px] text-red-500 px-1 font-medium mt-1">{errors.commodity}</p>}
                </div>
              </div>

              {/* Periode Laporan (Bulan / Tahun) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Bulan Pelaporan</label>
                  <select
                    value={formData.month || 'Mei'}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-primary-500 cursor-pointer"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Tahun Pelaporan</label>
                  <select
                    value={formData.year || '2026'}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-primary-500 cursor-pointer"
                  >
                    {YEARS.map((y, i) => (
                      <option key={i} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pendapatan, Estimasi unit usaha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Rata-rata Pendapatan / KK (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    max="100000000"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                    className={cn("w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors font-mono", errors.monthlyIncome ? "border-red-500 focus:bg-white focus:border-red-500" : "border-slate-200 focus:bg-white focus:border-primary-500")}
                  />
                  {errors.monthlyIncome && <p className="text-[10px] text-red-500 px-1 font-medium mt-1">{errors.monthlyIncome}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Jumlah Pelaku Usaha (KK)</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={formData.activeEntrepreneurs}
                    onChange={(e) => setFormData({ ...formData, activeEntrepreneurs: Number(e.target.value) })}
                    className={cn("w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors font-mono", errors.activeEntrepreneurs ? "border-red-500 focus:bg-white focus:border-red-500" : "border-slate-200 focus:bg-white focus:border-primary-500")}
                  />
                  {errors.activeEntrepreneurs && <p className="text-[10px] text-red-500 px-1 font-medium mt-1">{errors.activeEntrepreneurs}</p>}
                </div>
              </div>

              {/* Rantai Akses Pasar */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Rantai Akses Pasar Terpenuhi</label>
                <select
                  value={formData.marketAccess}
                  onChange={(e) => setFormData({ ...formData, marketAccess: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-primary-500 cursor-pointer"
                >
                  <option value="Lokal">Lokal (Pasar Tradisional / Wilayah Terdekat)</option>
                  <option value="Regional / Antar Kota">Regional (Hilirisasi Tingkat Provinsi / Kota Lain)</option>
                  <option value="Nasional / E-Commerce">Nasional / Digital (Penjualan daring via E-Commerce transnasional)</option>
                  <option value="Ekspor">Ekspor (Dikirim ke luar negeri / Port komersial)</option>
                </select>
              </div>

              {/* Interpensi Program Utama */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Program Intervensi Utama Pemerintah</label>
                <input
                  type="text"
                  placeholder="Bantuan modal bergulir, penyediaan cold storage bertenaga surya dsb"
                  value={formData.assistanceProgram}
                  onChange={(e) => setFormData({ ...formData, assistanceProgram: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-primary-500"
                />
              </div>

              {/* Catatan Kualitatif */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Catatan Perkembangan & Hambatan Lapangan</label>
                <textarea
                  rows={3}
                  placeholder="Keberlangsungan usaha, kendala logistik dsb"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-semibold outline-none focus:bg-white focus:border-primary-500 leading-normal"
                />
              </div>

              {/* Prompt Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-500 text-white rounded-lg text-xs font-bold hover:bg-primary-600 transition-colors shadow-xs hover:shadow-md cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Catat Data Baru'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Complete deletion dialog */}
      <ConfirmDialog 
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Sosial Ekonomi?"
        message="Segala pencatatan pendapatan bulanan dan intervensi program di lokus ini akan dihapus secara permanen dari basis data utama."
        confirmText="Hapus Permanen"
        cancelText="Batal"
      />
    </div>
  );
};
