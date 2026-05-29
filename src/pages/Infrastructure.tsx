import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  X, 
  Zap, 
  Wifi, 
  Home, 
  HeartPulse, 
  Eye, 
  Compass, 
  Calendar, 
  ArrowUpRight, 
  DollarSign, 
  Globe, 
  CheckCircle2, 
  RefreshCw, 
  MapPin, 
  FileText,
  AlertTriangle,
  Activity,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface InfrastructureItem {
  id?: string;
  name: string;
  type: 'Transportasi' | 'Energi' | 'Telekomunikasi' | 'Sosial' | 'Rumah';
  isPapua: boolean;
  kawasan: string;
  locationName: string;
  lat: number;
  lng: number;
  year: number;
  budget: number;
  fundingSource: string;
  status: 'Rencana' | 'Proses' | 'Selesai' | 'Rehabilitasi';
  impact: string;
  description: string;
  createdAt?: string;
}

const FALLBACK_GEOGRAPHIES = [
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

const DEFAULT_ITEMS: Omit<InfrastructureItem, 'id'>[] = [
  {
    name: "Pembangunan PLTS Terpusat 100 kWp",
    type: "Energi",
    isPapua: true,
    kawasan: "Kawasan Merauke",
    locationName: "Kabupaten Merauke, Papua Selatan",
    lat: -8.4991,
    lng: 140.4050,
    year: 2025,
    budget: 4500000000,
    fundingSource: "APBN Pusat (Kementerian PDTT)",
    status: "Selesai",
    impact: "Menyuplai listrik surya mandiri 24 jam untuk 120 kepala keluarga di Desa Salor-2",
    description: "Instalasi PLTS ramah lingkungan lengkap dengan baterai penyimpan daya Lithium-Ion guna mendukung kemandirian energi transmigran lokal di perbatasan Timur Indonesia."
  },
  {
    name: "Pembangunan Jalan Poros Utama Distrik Kurik",
    type: "Transportasi",
    isPapua: true,
    kawasan: "Kawasan Merauke",
    locationName: "Distrik Kurik, Papua Selatan",
    lat: -8.3054,
    lng: 140.2319,
    year: 2025,
    budget: 18200000000,
    fundingSource: "APBN Ditjen Bina Marga",
    status: "Proses",
    impact: "Mendukung mobilisasi hasil tani & jalan penghubung sepanjang 18.5 KM",
    description: "Pengerasan jalan tanah menjadi jalan aspal hotmix lapis penetrasi makadam guna memudahkan truk logistik pupuk dan beras mengangkut hasil panen raya agropolitan Merauke."
  },
  {
    name: "Instalasi BTS Perintis 4G Layanan Perbatasan",
    type: "Telekomunikasi",
    isPapua: true,
    kawasan: "Kawasan Keerom",
    locationName: "Kabupaten Keerom, Papua",
    lat: -3.2351,
    lng: 140.7301,
    year: 2024,
    budget: 1850000000,
    fundingSource: "Bakti KOMINFO",
    status: "Selesai",
    impact: "Menghubungkan 1.200 warga dengan jaringan seluler & internet berkecepatan tinggi",
    description: "Pendirian menara telekomunikasi mandiri bertenaga surya untuk membuka akses informasi dan memfasilitasi e-monitoring laporan dari lapangan."
  },
  {
    name: "Penyediaan Air Bersih & Sanitasi Higienis",
    type: "Energi",
    isPapua: false,
    kawasan: "Kawasan Nunukan",
    locationName: "Kecamatan Sebatik, Kalimantan Utara",
    lat: 4.1504,
    lng: 117.8825,
    year: 2025,
    budget: 3200000000,
    fundingSource: "APBN Ditjen Cipta Karya",
    status: "Selesai",
    impact: "Mengalirkan air bersih layak konsumsi 2 liter/detik bagi 150 KK transmigran",
    description: "Pemasangan pompa selam sumur dalam (artesis), reservoar kapasitas 20.000 liter, serta jaringan pipa distribusi sekunder ke rumah-rumah warga perbatasan Indonesia-Malaysia."
  },
  {
    name: "Rehabilitasi Rumah Tinggal Layak Huni (RTJK)",
    type: "Rumah",
    isPapua: true,
    kawasan: "Kawasan Jayawijaya",
    locationName: "Kabupaten Jayawijaya, Papua Pegunungan",
    lat: -4.0950,
    lng: 138.9482,
    year: 2026,
    budget: 2100000000,
    fundingSource: "APBD Provinsi",
    status: "Rehabilitasi",
    impact: "Perbaikan struktur kayu, dinding, dan atap seng pada 45 rumah transmigran",
    description: "Renovasi terpadu rumah tinggal transmigran binaan angkatan lama yang mengalami pelapukan agar kembali sehat, kokoh, dan tangguh cuaca dingin pegunungan tengah."
  },
  {
    name: "Sekolah Dasar Perintis Lokasi Natuna",
    type: "Sosial",
    isPapua: false,
    kawasan: "Kawasan Natuna",
    locationName: "Kecamatan Bunguran Timur, Kepulauan Riau",
    lat: 3.9452,
    lng: 108.3842,
    year: 2025,
    budget: 4100000000,
    fundingSource: "DAK Fisik Pendidikan",
    status: "Selesai",
    impact: "Fasilitas 3 ruang kelas baru, perpustakaan, toilet, serta sarana alat peraga",
    description: "Pembangunan gedung sekolah ramah anak berskala standar nasional guna menjamin hak pendidikan anak-anak transmigran di pulau terluar Laut Natuna Utara."
  },
  {
    name: "Pembangunan Puskesmas Pembantu Terpadu",
    type: "Sosial",
    isPapua: true,
    kawasan: "Kawasan Merauke",
    locationName: "Semangga, Kabupaten Merauke",
    lat: -8.4112,
    lng: 140.3892,
    year: 2026,
    budget: 2500000000,
    fundingSource: "DAK Fisik Kesehatan",
    status: "Rencana",
    impact: "Menghadirkan layanan imunisasi, ibu & anak, serta pelayanan rujukan medis dasar",
    description: "Fasilitas kesehatan tingkat pertama untuk menunjang kesehatan kuratif dan preventif masyarakat di klaster pemukiman transmigrasi yang cukup jauh dari ibukota kabupaten."
  },
  {
    name: "Pengerasan Jalan Lingkungan Rabat Beton",
    type: "Transportasi",
    isPapua: false,
    kawasan: "Kawasan Morotai",
    locationName: "Kabupaten Pulau Morotai, Maluku Utara",
    lat: 2.3021,
    lng: 128.2915,
    year: 2025,
    budget: 5400000000,
    fundingSource: "APBD Daerah",
    status: "Proses",
    impact: "Konstruksi rabat beton jalan pemukiman 5.2 KM, bebas kubangan saat musim hujan",
    description: "Pengecoran jalan poros desa transmigrasi untuk mengurangi hambatan sarana transportasi roda dua dan roda empat dalam keseharian ekonomi lokal."
  }
];

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

/**
 * Converts a numeric value into spelled-out wording in Indonesian Rupiah
 */
const terbilangRupiah = (num: number): string => {
  if (num === 0) return 'Nol Rupiah';
  
  const units = ['', 'Ribu', 'Juta', 'Miliar', 'Triliun'];
  const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  const formatThreeDigits = (n: number, isThousands: boolean): string => {
    let output = '';
    const hundreds = Math.floor(n / 100);
    const complex = n % 100;
    
    if (hundreds > 0) {
      if (hundreds === 1) {
        output += 'Seratus ';
      } else {
        output += words[hundreds] + ' Ratus ';
      }
    }
    
    if (complex > 0) {
      if (complex <= 11) {
        output += words[complex] + ' ';
      } else if (complex < 20) {
        output += words[complex - 10] + ' Belas ';
      } else {
        const tens = Math.floor(complex / 10);
        const unitsDigit = complex % 10;
        output += words[tens] + ' Puluh ';
        if (unitsDigit > 0) {
          output += words[unitsDigit] + ' ';
        }
      }
    }
    
    let res = output.trim();
    if (isThousands && res === 'Satu') {
      return 'Se';
    }
    return res;
  };

  let temp = num;
  let unitIdx = 0;
  let parts = [];
  
  while (temp > 0) {
    const rem = temp % 1000;
    if (rem > 0) {
      const isThousandUnit = (unitIdx === 1);
      const digitStr = formatThreeDigits(rem, isThousandUnit);
      if (digitStr === 'Se') {
        parts.unshift('Seribu');
      } else {
        parts.unshift(`${digitStr} ${units[unitIdx]}`.trim());
      }
    }
    temp = Math.floor(temp / 1000);
    unitIdx++;
  }
  
  return parts.join(' ').replace(/\s+/g, ' ').trim() + ' Rupiah';
};

export const Infrastructure: React.FC = () => {
  const [items, setItems] = useState<InfrastructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Semua');
  const [filterRegion, setFilterRegion] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [activeTab, setActiveTab] = useState<'all' | 'papua' | 'non-papua'>('all');
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const geographies = rawProjects.length > 0 ? rawProjects : FALLBACK_GEOGRAPHIES;

  const currentUser = useStore(state => state.user);
  const canEdit = currentUser?.role !== 'pimpinan';
  const canDelete = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat';

  // Modal forms states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InfrastructureItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InfrastructureItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<InfrastructureItem, 'id'>>({
    name: '',
    type: 'Transportasi',
    isPapua: true,
    kawasan: '',
    locationName: '',
    lat: 0,
    lng: 0,
    year: new Date().getFullYear(),
    budget: 0,
    fundingSource: 'APBN Pusat',
    status: 'Rencana',
    impact: '',
    description: '',
  });

  // Reference for Leaflet Maps integration inside the detail modal
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const qProj = query(collection(db, 'projects'));
    const unsubProj = onSnapshot(qProj, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawProjects(projs);
    }, (err) => console.error(err));

    const q = query(collection(db, 'infrastructures'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InfrastructureItem));
      setItems(dbItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'infrastructures');
      setLoading(false);
    });
    return () => {
      unsubProj();
      unsubscribe();
    };
  }, []);

  // Safe Seeding function if database has 0 items
  const handleAutoSeed = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      DEFAULT_ITEMS.forEach((item) => {
        const itemRef = doc(collection(db, 'infrastructures'));
        batch.set(itemRef, {
          ...item,
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'infrastructures/seed');
      setLoading(false);
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmittedAttempted, setFormSubmittedAttempted] = useState(false);

  // Form Validation Logic
  const validateForm = (data: Omit<InfrastructureItem, 'id'>): boolean => {
    const errs: Record<string, string> = {};

    // 1. Program / Nama Proyek
    if (!data.name.trim()) {
      errs.name = 'Program / nama proyek wajib diisi.';
    } else if (data.name.trim().length < 10) {
      errs.name = 'Nama terlalu pendek. Minimal 10 karakter untuk memperjelas sasaran/lokasi proyek.';
    } else if (data.name.trim().length > 120) {
      errs.name = 'Nama terlalu panjang (maksimal 120 karakter). Sederhanakan deskripsi proyek.';
    }

    // 2. Geografi & Kawasan Pemetaan
    if (!selectedRegion) {
      errs.region = 'Wilayah (Geografis / Provinsi) wajib dipilih.';
    }
    if (!data.kawasan) {
      errs.kawasan = 'Kawasan (Pemetaan / Distrik) wajib dipilih.';
    }

    // 3. Latitude & Longitude (Coordinates of Indonesia: Lat -11 to +6, Lng 95 to 141)
    if (isNaN(data.lat)) {
      errs.lat = 'Titik Lintang (Latitude) harus berupa angka desimal valid.';
    } else if (data.lat < -11 || data.lat > 6) {
      errs.lat = 'Garis lintang berada di luar jangkauan kedaulatan Indonesia (-11.0 s.d 6.0 LU/LS).';
    } else if (data.lat === 0) {
      errs.lat = 'Koordinat Lintang tidak boleh bernilai nol (0) agar pemetaan presisi.';
    }

    if (isNaN(data.lng)) {
      errs.lng = 'Titik Bujur (Longitude) harus berupa angka desimal valid.';
    } else if (data.lng < 95 || data.lng > 141) {
      errs.lng = 'Garis bujur berada di luar jangkauan kedaulatan Indonesia (95.0 s.d 141.0 BT).';
    } else if (data.lng === 0) {
      errs.lng = 'Koordinat Bujur tidak boleh bernilai nol (0) agar pemetaan presisi.';
    }

    // 4. Budget (Anggaran)
    if (isNaN(data.budget) || data.budget <= 0) {
      errs.budget = 'Anggaran tidak boleh kosong atau Rp 0.';
    } else if (data.budget < 1000000) {
      errs.budget = 'Minimal pagu anggaran proyek infrastruktur adalah Rp 1.000.000.';
    } else if (data.budget > 10000000000000) {
      errs.budget = 'Anggaran melebihi batas realistis (maksimal Rp 10 Triliun).';
    }

    // 5. Sumber Pendanaan
    if (!data.fundingSource.trim()) {
      errs.fundingSource = 'Sumber pendanaan wajib dimasukkan.';
    } else if (data.fundingSource.trim().length < 3) {
      errs.fundingSource = 'Silakan tulis sumber pendanaan lengkap (min. 3 karakter).';
    }

    // 6. Tahun Anggaran
    if (!data.year) {
      errs.year = 'Tahun anggaran wajib dimasukkan.';
    } else if (data.year < 2015 || data.year > 2035) {
      errs.year = 'Tahun anggaran harus berkisar antara 2015 dan 2035.';
    }

    // 7. Indikator Dampak
    if (!data.impact.trim()) {
      errs.impact = 'Indikator dampak / penerima manfaat bagi masyarakat 3T wajib diisi.';
    } else if (data.impact.trim().length < 15) {
      errs.impact = 'Deskripsikan dampak secara detail (minimal 15 karakter). Contoh: Melayani air bersih bagi 250 KK di wilayah terpencil.';
    }

    // 8. Deskripsi Lengkap
    if (data.description && data.description.trim().length > 0 && data.description.trim().length < 15) {
      errs.description = 'Harap tulis deskripsi lebih lengkap (minimal 15 karakter) jika ingin mencantumkannya.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Reactive inline validation on field change (after first submit attempt)
  useEffect(() => {
    if (formSubmittedAttempted) {
      validateForm(formData);
    }
  }, [formData, selectedRegion, formSubmittedAttempted]);

  const handleOpenForm = (item?: InfrastructureItem) => {
    setErrors({});
    setFormSubmittedAttempted(false);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        type: item.type,
        isPapua: item.isPapua,
        kawasan: item.kawasan,
        locationName: item.locationName,
        lat: item.lat,
        lng: item.lng,
        year: item.year,
        budget: item.budget,
        fundingSource: item.fundingSource,
        status: item.status,
        impact: item.impact,
        description: item.description,
      });
      const matchingGeog = geographies.find(g => g.name === item.kawasan);
      setSelectedRegion(matchingGeog ? matchingGeog.region : (item.isPapua ? 'Papua Selatan' : 'NTT'));
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        type: 'Transportasi',
        isPapua: activeTab === 'papua' ? true : activeTab === 'non-papua' ? false : true,
        kawasan: '',
        locationName: '',
        lat: 0,
        lng: 0,
        year: new Date().getFullYear(),
        budget: 0,
        fundingSource: 'APBN Pusat',
        status: 'Rencana',
        impact: '',
        description: '',
      });
      setSelectedRegion('');
    }
    setIsFormOpen(true);
  };

  const handleOpenDetail = (item: InfrastructureItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  // Setup Map inside modal dynamically after opening and template renders
  useEffect(() => {
    if (isDetailOpen && selectedItem && mapContainerRef.current) {
      // Lazy load window Leaflet to prevent any SSR/Vite hydration collision
      import('leaflet').then((L) => {
        // Destroy existing map instance to re-mount
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const coords: [number, number] = [selectedItem.lat || -5.0, selectedItem.lng || 120.0];
        const zoom = selectedItem.lat ? 10 : 4;
        
        const map = L.map(mapContainerRef.current, {
          center: coords,
          zoom: zoom,
          zoomControl: false,
          attributionControl: false
        });

        // Add custom positioned zoom control
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps'
        }).addTo(map);

        L.marker(coords, {
          icon: L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })
        })
        .addTo(map)
        .bindPopup(`<b>${selectedItem.name}</b><br>${selectedItem.locationName}`)
        .openPopup();

        mapInstanceRef.current = map;
        // Invalidate size to ensure it fits perfectly inside Tailwind flex/hidden transitions
        setTimeout(() => {
          map.invalidateSize();
        }, 300);
      }).catch(err => {
        console.error("Leaflet load error:", err);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isDetailOpen, selectedItem]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittedAttempted(true);

    if (!validateForm(formData)) {
      // Find modal scroll container and scroll to top dynamically and responsively
      const scrollContainer = document.getElementById('form-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    try {
      setLoading(true);

      // Server-side location validation
      if (formData.lat && formData.lng) {
        const valRes = await fetch('/api/validate-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: formData.lat, lng: formData.lng, kawasan: formData.kawasan })
        });
        const valData = await valRes.json();
        if (!valData.valid) {
          alert('Validasi Koordinat Gagal: ' + valData.error);
          setLoading(false);
          return;
        }
      }

      const parsedData = {
        ...formData,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        year: Number(formData.year),
        budget: Number(formData.budget),
      };

      if (editingItem?.id) {
        await updateDoc(doc(db, 'infrastructures', editingItem.id), parsedData);
        setToastMessage('Data infrastruktur berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'infrastructures'), {
          ...parsedData,
          createdAt: new Date().toISOString()
        });
        setToastMessage('Data infrastruktur berhasil ditambahkan');
      }
      setIsFormOpen(false);
      setLoading(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'infrastructures');
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingId) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'infrastructures', deletingId));
      setDeletingId(null);
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `infrastructures/${deletingId}`);
      setLoading(false);
    }
  };

  // Filtering Logic
  const filteredItems = items.filter(item => {
    // Tab filtering (Papua vs Non Papua)
    if (activeTab === 'papua' && !item.isPapua) return false;
    if (activeTab === 'non-papua' && item.isPapua) return false;

    // Search query
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.kawasan.toLowerCase().includes(search.toLowerCase()) ||
      item.locationName.toLowerCase().includes(search.toLowerCase()) ||
      item.fundingSource.toLowerCase().includes(search.toLowerCase());

    // Type filter
    const matchesType = filterType === 'Semua' || item.type === filterType;

    // Region category filter (redundant but good if user combines other tab configs)
    const matchesRegion = 
      filterRegion === 'Semua' || 
      (filterRegion === 'Papua' && item.isPapua) ||
      (filterRegion === 'Non Papua' && !item.isPapua);

    // Status filter
    const matchesStatus = filterStatus === 'Semua' || item.status === filterStatus;

    return matchesSearch && matchesType && matchesRegion && matchesStatus;
  });

  // Calculate high quality functional summaries
  const totalBudget = filteredItems.reduce((acc, curr) => acc + curr.budget, 0);
  const finishedCount = filteredItems.filter(i => i.status === 'Selesai').length;
  const processCount = filteredItems.filter(i => i.status === 'Proses').length;
  const rehabCount = filteredItems.filter(i => i.status === 'Rehabilitasi').length;
  const planCount = filteredItems.filter(i => i.status === 'Rencana').length;

  const papuaCount = items.filter(i => i.isPapua).length;
  const nonPapuaCount = items.filter(i => !i.isPapua).length;

  // Formatting helper
  const formatRupiah = (num: number) => {
    if (num >= 1000000000) {
      return `Rp ${(num / 1000000000).toFixed(1)} Miliar`;
    }
    return `Rp ${(num / 1000000).toFixed(1)} Juta`;
  };

  // Helper mapping icon configuration
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Transportasi': return Compass;
      case 'Energi': return Zap;
      case 'Telekomunikasi': return Wifi;
      case 'Sosial': return HeartPulse;
      case 'Rumah': return Home;
      default: return Building2;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Selesai': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Proses': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Rehabilitasi': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Rencana': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header section with rich context mapping */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary-500" />
            Infrastruktur Kawasan 3T
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manajemen dan pemantauan infrastruktur fisik di daerah Terdepan, Terluar, dan Tertinggal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length === 0 && (
            <button 
              onClick={handleAutoSeed}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-all shadow-sm shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              Seed Data Demo
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => handleOpenForm()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700 rounded-lg shadow-sm transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Sertakan Proyek Baru
            </button>
          )}
        </div>
      </div>

      {/* Regional Segment Tabs (Papua vs Non-Papua) */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
        <button
          onClick={() => { setActiveTab('all'); }}
          className={cn(
            "px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0",
            activeTab === 'all' 
              ? "border-primary-500 text-primary-600 font-bold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Globe className="w-4 h-4 shrink-0" />
          Kawasan Nasional 3T
          <span className="bg-slate-100 text-slate-600 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium">
            {items.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('papua'); }}
          className={cn(
            "px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0",
            activeTab === 'papua' 
              ? "border-primary-500 text-primary-600 font-bold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Award className="w-4 h-4 text-orange-500 shrink-0" />
          Kawasan Papua
          <span className="bg-orange-50 text-orange-700 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium">
            {papuaCount}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('non-papua'); }}
          className={cn(
            "px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0",
            activeTab === 'non-papua' 
              ? "border-primary-500 text-primary-600 font-bold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Activity className="w-4 h-4 text-teal-500 shrink-0" />
          Non Papua
          <span className="bg-teal-50 text-teal-700 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium">
            {nonPapuaCount}
          </span>
        </button>
      </div>

      {/* Structured Statistics Widget Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.025)] flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold tracking-wider block uppercase">Total Anggaran Wilayah</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-800">{formatRupiah(totalBudget)}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Tercakup dalam filter aktif</span>
        </div>
        <div className="bg-white p-4 rounded-xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.025)] flex flex-col justify-between">
          <span className="text-emerald-600 text-xs font-semibold tracking-wider block uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Selesai
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{finishedCount}</span>
            <span className="text-xs text-slate-500">Proyek</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Fungsional 100% di lokasi</span>
        </div>
        <div className="bg-white p-4 rounded-xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.025)] flex flex-col justify-between">
          <span className="text-sky-600 text-xs font-semibold tracking-wider block uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse inline-block"></span> Konstruksi
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{processCount}</span>
            <span className="text-xs text-slate-500">Proyek</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Sedang berjalan fisik</span>
        </div>
        <div className="bg-white p-4 rounded-xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.025)] flex flex-col justify-between">
          <span className="text-amber-600 text-xs font-semibold tracking-wider block uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span> Pemeliharaan
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{rehabCount}</span>
            <span className="text-xs text-slate-500">Proyek</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Rehabilitasi struktural</span>
        </div>
        <div className="bg-white p-4 rounded-xl border-0 hidden lg:flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.025)]">
          <span className="text-slate-500 text-xs font-semibold tracking-wider block uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span> Perencanaan
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{planCount}</span>
            <span className="text-xs text-slate-500">Proyek</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Tahapan usulan DAK</span>
        </div>
      </div>

      {/* Responsive Filters and Search Console */}
      <div className="bg-white p-4 rounded-xl border-0 shadow-[0_4px_22px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row items-center gap-3 justify-between">
        {/* Search Input */}
        <div className="relative w-full lg:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Cari Proyek, Kawasan, Lokasi, atau Sumber Dana..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-slate-400"
          />
        </div>

        {/* Categories Selection */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="grid grid-cols-2 gap-2 flex-grow sm:flex-grow-0 sm:flex sm:flex-wrap sm:items-center">
            {/* Sektor filter */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 px-2.5 py-2 sm:py-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-450 font-medium whitespace-nowrap">Sektor:</span>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent border-none outline-none font-semibold text-slate-700 cursor-pointer text-right sm:text-left text-xs bg-slate-50 focus:ring-0"
              >
                <option value="Semua">Semua</option>
                <option value="Transportasi">Transportasi</option>
                <option value="Energi">Energi</option>
                <option value="Telekomunikasi">Telekomunikasi</option>
                <option value="Sosial">Fasilitas Sosial</option>
                <option value="Rumah">RTJK Trans</option>
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 px-2.5 py-2 sm:py-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-450 font-medium whitespace-nowrap">Status:</span>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-none outline-none font-semibold text-slate-700 cursor-pointer text-right sm:text-left text-xs bg-slate-50 focus:ring-0"
              >
                <option value="Semua">Semua</option>
                <option value="Rencana">Rencana</option>
                <option value="Proses">Proses</option>
                <option value="Selesai">Selesai</option>
                <option value="Rehabilitasi">Rehabilitasi</option>
              </select>
            </div>
          </div>

          {/* Reset Filters button */}
          {(search !== '' || filterType !== 'Semua' || filterStatus !== 'Semua') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('Semua');
                setFilterStatus('Semua');
              }}
              className="text-xs text-slate-500 hover:text-primary-500 transition-colors font-medium sm:ml-1 py-1.5 flex items-center justify-center gap-1 border border-slate-200 sm:border-transparent rounded-lg sm:border-0 hover:bg-slate-50 sm:hover:bg-transparent"
            >
              <RefreshCw className="w-3 h-3" /> Bersihkan Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500 mt-2">Membuka repositori database...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-xl p-8 ">
          <FileText className="w-12 h-12 text-slate-350 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-slate-800 mt-3">Tidak Ada Proyek Ditemukan</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Gunakan kata kunci pencarian alternatif, sesuaikan tab Papua/Non-Papua, atau periksa filter status sektor yang dipilih.
          </p>
          {items.length === 0 && (
            <button
              onClick={handleAutoSeed}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg text-xs font-semibold border border-primary-200 transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              Suntik Database Seeding (8 Proyek)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const SektorIcon = getTypeIcon(item.type);
            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.025)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.065)] transition-all relative overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Accent Bar */}
                <div className={cn(
                  "h-1.5 w-full absolute top-0 left-0",
                  item.isPapua ? "bg-orange-500" : "bg-teal-500"
                )} />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Sektor Indicator + Tab Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border-0">
                        <SektorIcon className="w-3.5 h-3.5 text-primary-500" />
                        <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wider">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                          item.isPapua ? "bg-orange-50 text-orange-700" : "bg-teal-50 text-teal-700"
                        )}>
                          {item.isPapua ? "Papua" : "Non-Papua"}
                        </span>
                        <span className={cn(
                          "text-[9px] font-semibold px-2 py-0.5 border rounded-full uppercase tracking-wider",
                          getStatusColor(item.status)
                        )}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Project Title */}
                    <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-snug hover:text-primary-600 transition-colors cursor-pointer" onClick={() => handleOpenDetail(item)}>
                      {item.name}
                    </h3>

                    {/* Regional Kawasan Detail */}
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-700">{item.kawasan}</span>
                      </div>
                      <div className="text-[11px] text-slate-450 italic pl-5 line-clamp-1">
                        {item.locationName}
                      </div>
                    </div>

                    {/* Description excerpt */}
                    <p className="text-xs text-slate-500 mt-3 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Operational Details Summary Grid */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-medium text-slate-400 block uppercase tracking-widest">Alokasi Anggaran</span>
                      <span className="text-xs font-bold text-slate-800">{formatRupiah(item.budget)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-medium text-slate-400 block uppercase tracking-widest">Tahun Anggaran</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-450" />
                        {item.year}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer control buttons */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2 rounded-b-xl">
                  <button
                    onClick={() => handleOpenDetail(item)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-primary-600 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detail Dashboard
                  </button>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenForm(item)}
                        title="Ubah Rencana"
                        className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-white border hover:border-slate-200 rounded-md transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeletingId(item.id || null)}
                        title="Hapus Proyek"
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white border hover:border-slate-200 rounded-md transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Main Form Modal for Creating/Editing Infrastructure */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border-0"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  {editingItem ? 'Sunting Data Proyek' : 'Tambahkan Rencana Pembangunan'}
                </h2>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="form-scroll-container" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar" noValidate>
                {/* Form-wide Error Warning Banner */}
                {formSubmittedAttempted && Object.keys(errors).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-xs text-red-800"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-red-900 mb-1">Terdapat {Object.keys(errors).length} Kesalahan Pengisian Formulir:</span>
                      <ul className="list-disc list-inside space-y-1 font-semibold opacity-95 text-[11px]">
                        {Object.values(errors).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {/* Form row (Name) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">PROGRAM / NAMA PROYEK <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pembangunan Jaringan Listrik PLTS Kemandirian"
                    className={cn(
                      "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-1 focus:ring-offset-0",
                      errors.name 
                        ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                        : "border-slate-200 focus:border-primary-500 focus:ring-primary-500"
                    )}
                  />
                  {errors.name && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.name}
                    </motion.p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sektor Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">SEKTOR / BIDANG <span className="text-red-500">*</span></label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white focus:border-primary-500"
                    >
                      <option value="Transportasi">Transportasi (Jalan, Jembatan, Pelabuhan)</option>
                      <option value="Energi">Energi & Utilitas (PLTS, Listrik, Air Bersih)</option>
                      <option value="Telekomunikasi">Telekomunikasi (BTS 4G, Internet)</option>
                      <option value="Sosial">Fasilitas Sosial (Sekolah, Puskesmas)</option>
                      <option value="Rumah">RTJK (Rumah Transmigran)</option>
                    </select>
                  </div>

                  {/* Region selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">KLASIFIKASI WILAYAH <span className="text-red-500">*</span></label>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden h-[38px] p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPapua: true })}
                        className={cn(
                          "flex-1 text-xs font-bold rounded-md transition-colors",
                          formData.isPapua 
                            ? "bg-white text-orange-700 shadow-sm" 
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        Papuan 3T
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPapua: false })}
                        className={cn(
                          "flex-1 text-xs font-bold rounded-md transition-colors",
                          !formData.isPapua 
                            ? "bg-white text-teal-700 shadow-sm" 
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        Non Papua 3T
                      </button>
                    </div>
                  </div>
                </div>

                {/* Geografis & Pemetaan Kawasan Dropdowns */}
                <div className={cn(
                  "p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all",
                  (errors.region || errors.kawasan) 
                    ? "bg-red-50/10 border-red-300" 
                    : "bg-slate-50 border-slate-200"
                )}>
                  {/* Wilayah Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WILAYAH (GEOGRAFIS) <span className="text-red-500">*</span></label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => {
                        const reg = e.target.value;
                        setSelectedRegion(reg);
                        setFormData(prev => ({
                          ...prev,
                          kawasan: '',
                          locationName: reg ? `, ${reg}` : '',
                        }));
                      }}
                      className={cn(
                        "w-full bg-white border rounded-lg px-3.5 py-2 text-xs font-semibold outline-none cursor-pointer text-slate-700 focus:border-primary-500",
                        errors.region ? "border-red-400 ring-1 ring-red-400" : "border-slate-200"
                      )}
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
                    {errors.region && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[10px] font-bold mt-1 px-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> {errors.region}
                      </motion.p>
                    )}
                  </div>

                  {/* Kawasan Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">KAWASAN (PEMETAAN) <span className="text-red-500">*</span></label>
                    <select
                      value={formData.kawasan}
                      onChange={(e) => {
                        const kaw = e.target.value;
                        const matchingObj = geographies.find(g => g.name === kaw);
                        if (matchingObj) {
                          setFormData(prev => ({
                            ...prev,
                            kawasan: matchingObj.name,
                            locationName: `${matchingObj.name}, ${matchingObj.region}`,
                            lat: matchingObj.lat,
                            lng: matchingObj.lng,
                            isPapua: matchingObj.region.toLowerCase().includes('papua')
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, kawasan: kaw }));
                        }
                      }}
                      className={cn(
                        "w-full bg-white border rounded-lg px-3.5 py-2 text-xs font-semibold outline-none cursor-pointer text-slate-700 focus:border-primary-500",
                        errors.kawasan ? "border-red-400 ring-1 ring-red-400" : "border-slate-200"
                      )}
                      required
                      disabled={!selectedRegion}
                    >
                      <option value="">{selectedRegion ? '-- Pilih Kawasan --' : 'Pilih Wilayah Terlebih Dahulu'}</option>
                      {geographies.filter(g => g.region === selectedRegion).map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                    {errors.kawasan && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[10px] font-bold mt-1 px-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> {errors.kawasan}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lat coords */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">TITIK LINTANG (LATITUDE) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                      placeholder="Contoh: -8.4991"
                      className={cn(
                        "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-1",
                        errors.lat 
                          ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                          : "border-slate-200 focus:border-primary-500"
                      )}
                    />
                    {errors.lat && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.lat}
                      </motion.p>
                    )}
                  </div>

                  {/* Lng coords */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">TITIK BUJUR (LONGITUDE) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                      placeholder="Contoh: 140.4050"
                      className={cn(
                        "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-1",
                        errors.lng 
                          ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                          : "border-slate-200 focus:border-primary-500"
                      )}
                    />
                    {errors.lng && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.lng}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Budget */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">JUMLAH ANGGARAN (RUPIAH) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                        Rp
                      </span>
                      <input
                        type="text"
                        name="budget"
                        required
                        value={formData.budget ? formData.budget.toLocaleString('id-ID') : ''}
                        onChange={(e) => {
                          const rawNumString = e.target.value.replace(/\D/g, '');
                          const numericValue = rawNumString ? parseInt(rawNumString, 10) : 0;
                          setFormData({ ...formData, budget: numericValue });
                        }}
                        placeholder="Contoh: 4.500.000.000"
                        className={cn(
                          "w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none transition-all",
                          errors.budget 
                            ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                            : "border-slate-200 focus:border-primary-500 bg-white dark:bg-[#081531] text-slate-900 dark:text-slate-100"
                        )}
                      />
                    </div>
                    {errors.budget && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.budget}
                      </motion.p>
                    )}
                    {formData.budget > 0 && !errors.budget && (
                      <div className="mt-1.5 p-2 bg-slate-50 dark:bg-[#0c1e45]/50 border-0 dark:border-[#1c3c7a]/40 rounded-lg text-xs space-y-0.5 animate-fadeIn">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span>Ejaan Nominal:</span>
                          <span className="font-extrabold text-primary-600 dark:text-[#E3C16F]">
                            Rp {formData.budget.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-500 font-bold italic break-words leading-relaxed select-all">
                          "{terbilangRupiah(formData.budget)}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Funding Source */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">SUMBER PENDANAAN <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.fundingSource}
                      onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                      placeholder="Contoh: APBN DAK Fisik / KemenPUPR"
                      className={cn(
                        "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-1",
                        errors.fundingSource 
                          ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                          : "border-slate-200 focus:border-primary-500"
                      )}
                    />
                    {errors.fundingSource && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.fundingSource}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tahun Pembangunan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">TAHUN ANGGARAN <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="2015"
                      max="2035"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      placeholder="Contoh: 2025"
                      className={cn(
                        "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all focus:ring-1",
                        errors.year 
                          ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                          : "border-slate-200 focus:border-primary-500"
                      )}
                    />
                    {errors.year && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.year}
                      </motion.p>
                    )}
                  </div>

                  {/* Status Rencana */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">STATUS PEMBANGUNAN <span className="text-red-500">*</span></label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white focus:border-primary-500"
                    >
                      <option value="Rencana">Rencana (Masuk RKPD / Pra-Konstruksi)</option>
                      <option value="Proses">Proses (Kontrak / Sedang Konstruksi)</option>
                      <option value="Selesai">Selesai (Sudah Serah Terima / Fungsional)</option>
                      <option value="Rehabilitasi">Rehabilitasi (Mengalami Kerusakan / Pemeliharaan)</option>
                    </select>
                  </div>
                </div>

                {/* Impact Info */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">INDIKATOR DAMPAK / PENERIMA MANFAAT <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                    placeholder="Contoh: Melayani listrik 24 jam untuk 150 KK & Kantor Desa"
                    className={cn(
                      "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all placeholder-slate-400 focus:ring-1",
                      errors.impact 
                        ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                        : "border-slate-200 focus:border-primary-500"
                    )}
                  />
                  {errors.impact && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.impact}
                    </motion.p>
                  )}
                </div>

                {/* Description Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">DESKRIPSI LENGKAP PROYEK</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tulis ringkasan latar belakang proyek, spesifikasi teknis penting, serta detail kontraktor pelaksana..."
                    className={cn(
                      "w-full px-3.5 py-2 border rounded-lg text-sm outline-none transition-all custom-scrollbar resize-none focus:ring-1",
                      errors.description 
                        ? "border-red-400 ring-1 ring-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500" 
                        : "border-slate-200 focus:border-primary-500"
                    )}
                  />
                  {errors.description && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-[11px] font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {errors.description}
                    </motion.p>
                  )}
                </div>

                {/* Submitting state controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    {editingItem ? 'Simpan Perubahan' : 'Masukkan Rencana'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Structured Detailed Monitoring View Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col border-0"
            >
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  <span className="text-xs sm:text-sm font-bold text-slate-800">Detail Monitoring Infrastruktur 3T</span>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 custom-scrollbar font-sans">
                {/* Information LHS Column (Ratio 3/5) */}
                <div className="lg:col-span-3 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 border text-slate-600 font-mono tracking-wider uppercase">
                        SEKTOR {selectedItem.type.toUpperCase()}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        selectedItem.isPapua ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-teal-50 text-teal-700 border border-teal-100"
                      )}>
                        {selectedItem.isPapua ? "Kawasan Papua 3T" : "Kawasan Non-Papua"}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                      {selectedItem.name}
                    </h3>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3 shadow-inner">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informasi Umum Pemukiman</h4>
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-y-3.5 gap-x-2">
                      <div>
                        <span className="text-[10px] text-slate-450 block">Kawasan Trans</span>
                        <span className="text-xs font-bold text-slate-700">{selectedItem.kawasan}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-450 block">Kelayakan Fisik</span>
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border",
                          getStatusColor(selectedItem.status)
                        )}>
                          {selectedItem.status}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-450 block">Kabupaten / Wilayah</span>
                        <span className="text-xs font-semibold text-slate-700">{selectedItem.locationName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5Packed">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Metrik Penilaian Dampak Lapangan</span>
                    <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-primary-650 block">Hasil Realisasi</span>
                        <span className="text-xs font-semibold text-slate-700 leading-relaxed block">{selectedItem.impact}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ulasan Detail Penyelenggaraan</span>
                    <p className="text-xs font-medium text-slate-650 leading-relaxed bg-slate-50/50 p-3 rounded-lg border-0">
                      {selectedItem.description || "Tidak ada deskripsi tambahan yang dimasukkan untuk rancangan pembangunan proyek infrastruktur fisik kawasan 3T ini."}
                    </p>
                  </div>
                </div>

                {/* Map Panel and Budget Detail RHS Column (Ratio 2/5) */}
                <div className="lg:col-span-2 space-y-5">
                  <div className="bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-xl overflow-hidden ">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-600 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-slate-500" />
                      Visualisasi Peta Geografis (GPS)
                    </div>
                    {/* Interactive Leaflet container inside modal */}
                    <div ref={mapContainerRef} className="h-44 w-full bg-slate-100 relative z-10" />
                    <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-450">
                      <span>Lat: {selectedItem.lat.toFixed(4)}</span>
                      <span>Lng: {selectedItem.lng.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alokasi & Pembiayaan Proyek</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-200">
                        <span className="text-slate-500">Jumlah Dana</span>
                        <span className="font-bold text-slate-800 text-sm">{formatRupiah(selectedItem.budget)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-200">
                        <span className="text-slate-500">Tahun Anggaran</span>
                        <span className="font-semibold text-slate-800">{selectedItem.year}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-1.5">
                        <span className="text-slate-500">Sumber Dana</span>
                        <span className="font-semibold text-slate-800 text-right max-w-[150px] min-[400px]:max-w-[240px] truncate" title={selectedItem.fundingSource}>
                          {selectedItem.fundingSource}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 font-bold text-white text-xs rounded-lg transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)]"
                >
                  Tutup Tampilan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal using local confirm helper instead of window.alert */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteItem}
        title="Apakah Anda Yakin Ingin Menghapus Proyek Infrastruktur Ini?"
        message="Data infrastruktur fisik penunjang transmigrasi yang sudah terhapus tidak dapat dikembalikan lagi dari arsip Kementerian."
      />

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl border border-emerald-500"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
            <button onClick={() => setShowToast(false)} className="p-1 hover:bg-emerald-700 rounded-lg ml-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
