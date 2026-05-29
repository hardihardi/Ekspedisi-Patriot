import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Info, Layers, Navigation, Plus, Trash2, Edit2, X, Map, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useStore } from '../store/useStore';
import { translations } from '../lib/translations';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, Circle, LayerGroup, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const HeatmapLayer = ({ points, maxVal = 1.0 }: { points: [number, number, number][], maxVal?: number }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const heatLayer = (L as any).heatLayer(points, {
      radius: 35,
      blur: 20,
      maxZoom: 10,
      max: maxVal,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, maxVal]);
  return null;
};

const DEMO_PROJECTS = [
  // Wilayah Papua & Papua 3T
  { id: '1', name: 'Kawasan Merauke (Muting) - 3T', lat: -8.115, lng: 140.755, region: 'Papua Selatan', status: 'Pelaksanaan', is3T: true, category: 'Daerah 3T' },
  { id: '4', name: 'Kawasan Sorong (Klamono) - 3T', lat: -1.050, lng: 131.500, region: 'Papua Barat Daya', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '5', name: 'Kawasan Nabire (Teluk Kimi)', lat: -3.366, lng: 135.500, region: 'Papua Tengah', status: 'Pembinaan', is3T: false, category: 'Reguler' },
  { id: '7', name: 'Kawasan Asmat - 3T', lat: -5.538, lng: 138.134, region: 'Papua Selatan', status: 'Persiapan', is3T: true, category: 'Terpencil' },
  { id: '8', name: 'Kawasan Pegunungan Bintang - 3T', lat: -4.567, lng: 140.316, region: 'Papua Pegunungan', status: 'Pembinaan', is3T: true, category: 'Perbatasan' },
  // Wilayah Non-Papua 3T & Lainnya
  { id: '2', name: 'Kawasan Sumba Timur - 3T', lat: -9.658, lng: 120.264, region: 'NTT', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '3', name: 'Kawasan Mentawai - 3T', lat: -2.040, lng: 99.553, region: 'Sumatera Barat', status: 'Pembinaan', is3T: true, category: 'Daerah 3T' },
  { id: '10', name: 'Kawasan Natuna - 3T', lat: 3.949, lng: 108.142, region: 'Kepulauan Riau', status: 'Pelaksanaan', is3T: true, category: 'Perbatasan' },
  { id: '11', name: 'Kawasan Pulau Morotai - 3T', lat: 2.045, lng: 128.293, region: 'Maluku Utara', status: 'Persiapan', is3T: true, category: 'Daerah 3T' },
  { id: '6', name: 'Kawasan Konawe', lat: -3.850, lng: 122.050, region: 'Sulawesi Tenggara', status: 'Pelaksanaan', is3T: false, category: 'Reguler' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pembinaan': return '#10b981';
    case 'Pelaksanaan': return '#2563eb';
    default: return '#f59e0b';
  }
};

const createCustomIcon = (status: string) => {
  const color = getStatusColor(status);
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); transition: transform 0.2s;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

export const Geographic: React.FC = () => {
  const { language } = useStore();
  const isEn = language === 'en';
  const t = translations[language];

  const translateGeoStatus = (st: string) => {
    if (!isEn) return st;
    switch (st) {
      case 'Persiapan': return 'Preparation';
      case 'Pelaksanaan': return 'Implementation';
      case 'Pembinaan': return 'Coaching';
      default: return st;
    }
  };

  const translateGeoCategory = (cat: string) => {
    if (!isEn) return cat;
    switch (cat) {
      case 'Reguler': return 'Regular';
      case 'Daerah 3T': return '3T Region';
      case 'Terpencil': return 'Remote';
      case 'Perbatasan': return 'Borderland';
      case 'Transmigrasi Umum': return 'General Transmigration';
      default: return cat;
    }
  };

  const [projects, setProjects] = useState<any[]>([]);
  const [transmigrants, setTransmigrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useStore(state => state.user);
  
  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat';
  const canDelete = currentUser?.role === 'superadmin';
  
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', lat: -2.5489, lng: 118.0149, region: 'Kalimantan', status: 'Persiapan', is3T: false, category: 'Reguler' });

  useEffect(() => {
    const qProjects = query(collection(db, 'projects'));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(items);
      setLoading(false);
      
      if (items.length === 0 && canEdit) {
        // Auto-seed demo projects if empty
        DEMO_PROJECTS.forEach(async (proj) => {
           try {
              await setDoc(doc(db, 'projects', proj.id), { ...proj, createdAt: new Date().toISOString() });
           } catch (e) {
              console.error("Failed to seed project", e);
           }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoading(false);
    });

    const qTrans = query(collection(db, 'transmigrants'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransmigrants(items);
    }, (error) => {
      console.error(error);
    });

    return () => {
      unsubProjects();
      unsubTrans();
    };
  }, [canEdit]);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name || '', lat: item.lat || -2.5489, lng: item.lng || 118.0149, region: item.region || 'Kalimantan', status: item.status || 'Persiapan', is3T: item.is3T || false, category: item.category || (item.is3T ? 'Daerah 3T' : 'Reguler') });
    } else {
      setEditingItem(null);
      setFormData({ name: '', lat: -2.5489, lng: 118.0149, region: 'Kalimantan', status: 'Persiapan', is3T: false, category: 'Reguler' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Server-side location validation
      if (formData.lat && formData.lng) {
        const valRes = await fetch('/api/validate-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: formData.lat, lng: formData.lng, kawasan: formData.name })
        });
        const valData = await valRes.json();
        if (!valData.valid) {
          alert('Validasi Koordinat Gagal: ' + valData.error);
          return;
        }
      }

      if (editingItem) {
        await setDoc(doc(db, 'projects', editingItem.id), formData, { merge: true });
      } else {
        const newDocId = Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'projects', newDocId), { ...formData, createdAt: new Date().toISOString() });
      }
      setIsModalOpen(false);
    } catch (error) {
       handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'projects');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, 'projects');
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterRegion === 'Semua') return true;
    if (filterRegion === 'Papua & 3T') return p.region.toLowerCase().includes('papua') || p.is3T;
    if (filterRegion === 'Non-Papua 3T') return !p.region.toLowerCase().includes('papua') && p.is3T;
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      <style>
        {`
          .leaflet-container {
            font-family: inherit;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            border: 1px solid var(--slate-200);
            background: var(--slate-100);
          }
          .custom-popup .leaflet-popup-content {
            margin: 0;
            width: auto !important;
          }
          .custom-popup .leaflet-popup-tip-container {
            display: none;
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          }
          .leaflet-control-zoom a {
            border-radius: 8px !important;
            margin: 4px !important;
            background: var(--slate-100) !important;
            border: 1px solid var(--slate-200) !important;
            color: var(--slate-700) !important;
          }
        `}
      </style>
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={isEn ? "Delete Area Marker" : "Hapus Marker Kawasan"}
        message={isEn ? "Are you sure you want to delete this area data from the map? This action cannot be undone." : "Apakah Anda yakin ingin menghapus data kawasan ini dari peta? Tindakan ini tidak dapat dibatalkan."}
        confirmText={isEn ? "Delete Area" : "Hapus Kawasan"}
      />

      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{isEn ? "Area Details" : "Detail Kawasan"}</h3>
              <button onClick={() => setViewingItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{isEn ? "Area Name" : "Nama Kawasan"}</h4>
                <p className="text-sm font-semibold text-slate-900">{viewingItem.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</h4>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                    viewingItem.status === 'Persiapan' ? "bg-amber-100 text-amber-700" :
                    viewingItem.status === 'Pelaksanaan' ? "bg-primary-500/10 text-primary-500" :
                    "bg-emerald-100 text-emerald-700"
                  )}>{translateGeoStatus(viewingItem.status)}</span>
                </div>
                <div>
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{isEn ? "Category" : "Kategori"}</h4>
                   <p className="text-sm font-medium text-slate-700 shrink-0">{translateGeoCategory(viewingItem.category || (viewingItem.is3T ? 'Daerah 3T' : 'Reguler'))}</p>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{isEn ? "Regional" : "Regional"}</h4>
                <p className="text-sm font-medium text-slate-700 block">{viewingItem.region}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{isEn ? "Coordinate (Lat)" : "Koordinat (Lat)"}</h4>
                  <p className="text-sm font-mono text-slate-700">{viewingItem.lat.toFixed(6)}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{isEn ? "Coordinate (Lng)" : "Koordinat (Lng)"}</h4>
                  <p className="text-sm font-mono text-slate-700">{viewingItem.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50">
               <button onClick={() => setViewingItem(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary-500 text-white hover:bg-primary-500 rounded-lg transition-colors">{isEn ? "Close" : "Tutup"}</button>
            </div>
          </motion.div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? (isEn ? 'Edit Area' : 'Edit Kawasan') : (isEn ? 'New Area' : 'Kawasan Baru')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Area Name" : "Nama Kawasan"}</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Region / Province" : "Regional / Provinsi"}</label>
                  <input required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Latitude</label>
                    <input required value={formData.lat} onChange={e => setFormData({...formData, lat: parseFloat(e.target.value) || 0})} type="number" step="any" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Longitude</label>
                    <input required value={formData.lng} onChange={e => setFormData({...formData, lng: parseFloat(e.target.value) || 0})} type="number" step="any" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Area Status" : "Status Kawasan"}</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                    <option value="Persiapan">{isEn ? "Preparation" : "Persiapan"}</option>
                    <option value="Pelaksanaan">{isEn ? "Implementation" : "Pelaksanaan"}</option>
                    <option value="Pembinaan">{isEn ? "Coaching" : "Pembinaan"}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Area Category" : "Kategori Kawasan"}</label>
                  <select value={formData.category} onChange={e => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      category: val,
                      is3T: val === 'Daerah 3T' || val === 'Terpencil' || val === 'Perbatasan' ? true : formData.is3T
                    });
                  }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                    <option value="Reguler">{isEn ? "Regular" : "Reguler"}</option>
                    <option value="Daerah 3T">{isEn ? "3T Region" : "Daerah 3T"}</option>
                    <option value="Terpencil">{isEn ? "Remote" : "Terpencil"}</option>
                    <option value="Perbatasan">{isEn ? "Borderland" : "Perbatasan"}</option>
                    <option value="Transmigrasi Umum">{isEn ? "General Transmigration" : "Transmigrasi Umum"}</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-2 px-1">
                  <input id="is3TCheck" type="checkbox" checked={formData.is3T} onChange={e => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      is3T: checked,
                      category: checked && formData.category === 'Reguler' ? 'Daerah 3T' : (!checked && formData.category !== 'Reguler' ? 'Reguler' : formData.category)
                    });
                  }} className="w-4 h-4 text-primary-500 rounded border-slate-300 focus:ring-primary-500" />
                  <label htmlFor="is3TCheck" className="text-xs font-bold text-slate-700">{isEn ? "Mark as 3T Locus (Frontier, Outermost, Underdeveloped)" : "Tandai sebagai Lokus 3T (Tertinggal, Terdepan, Terluar)"}</label>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">{isEn ? "Cancel" : "Batal"}</button>
                 <button type="submit" className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all border-0 flex items-center justify-center gap-2">
                   {editingItem ? (isEn ? 'Save' : 'Simpan') : (isEn ? 'Add' : 'Tambah')}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{isEn ? "Geographical & Area Mapping" : "Geografis & Pemetaan Kawasan"}</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{isEn ? "Detailed mapping of transmigrant settlement layouts including Papua 3T and Non-Papua loci." : "Pemetaan detail sebaran kawasan transmigrasi termasuk Lokus 3T Papua dan Non-Papua."}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)} 
            className={cn("flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs md:text-[13px] font-semibold tracking-wide transition-all shadow-sm active:scale-95 border", showHeatmap ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-amber-500/30" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}
          >
            <Map className="w-4 h-4" /> {showHeatmap ? (isEn ? "Hide Heatmap" : "Sembunyikan Heatmap") : (isEn ? "3T Heatmap" : "Heatmap 3T")}
          </button>
          
          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs md:text-[13px] font-semibold tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95">
              <Plus className="w-4 h-4" /> {isEn ? "Add Area" : "Tambah Area"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0 bg-transparent">
        {/* Sidebar List Kawasan */}
        <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="mb-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={isEn ? "Search area..." : "Cari kawasan..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              />
            </div>
            
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{isEn ? "Region Filter" : "Filter Wilayah"}</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFilterRegion('Semua')} 
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-all border", filterRegion === 'Semua' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
              >
                {isEn ? "All" : "Semua"}
              </button>
              <button 
                onClick={() => setFilterRegion('Papua & 3T')} 
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-all border", filterRegion === 'Papua & 3T' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
              >
                {isEn ? "Papua & 3T Locus" : "Lokus Papua & 3T"}
              </button>
              <button 
                onClick={() => setFilterRegion('Non-Papua 3T')} 
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-all border", filterRegion === 'Non-Papua 3T' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
              >
                Non-Papua 3T
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
            {filteredProjects.length === 0 ? (
               <div className="p-8 text-center text-[13px] font-medium text-slate-400">{isEn ? "No area data available" : "Tidak ada data kawasan"}</div>
            ) : filteredProjects.map((p) => (
              <div 
                key={p.id}
                onClick={() => {
                  setViewingItem(p);
                  if (mapInstance && p.lat && p.lng) {
                     mapInstance.flyTo([p.lat, p.lng], 10, { duration: 1.5 });
                  }
                }}
                className="p-4 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-semibold text-[14px] text-slate-700 group-hover:text-primary-500 transition-colors">{p.name}</h4>
                   {p.is3T && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-500 text-[10px] font-semibold tracking-wider rounded whitespace-nowrap">3T</span>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                   <div className="flex items-center gap-1">
                     <MapPin className="w-3.5 h-3.5 text-slate-400" />
                     <span className="text-[12px] text-slate-500 font-medium">{p.region}</span>
                   </div>
                   <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                     {translateGeoCategory(p.category || (p.is3T ? 'Daerah 3T' : 'Reguler'))}
                   </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-semibold border-transparent shadow-sm",
                    p.status === 'Persiapan' ? "bg-amber-50 text-amber-500" :
                    p.status === 'Pelaksanaan' ? "bg-primary-500/10 text-primary-500" :
                    "bg-emerald-50 text-emerald-500"
                  )}>{translateGeoStatus(p.status)}</span>
                  {(canEdit || canDelete) && (
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && <button onClick={(e) => { e.stopPropagation(); handleOpenModal(p); }} className="px-2 py-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-[12px] font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-md transition-all flex items-center gap-1.5 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] border-0 active:scale-95"><Edit2 className="w-3.5 h-3.5" /></button>}
                        {canDelete && <button onClick={(e) => { e.stopPropagation(); setItemToDelete(p.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden relative min-h-[60vh] lg:min-h-0">
          <MapContainer
            center={[-2.5489, 118.0149]}
            zoom={5}
            className="w-full h-full z-0 relative"
            zoomControl={false}
            ref={setMapInstance}
          >
          <ZoomControl position="bottomright" />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name={isEn ? "Google Road Map" : "Google Peta Standar"}>
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name={isEn ? "Google Satellite Hybrid" : "Google Satelit hibrida"}>
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name={isEn ? "Google Terrain" : "Google Topografi"}>
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
              />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay checked name={isEn ? "Project Clusters" : "Gugusan Proyek"}>
              <LayerGroup>
                {showHeatmap ? (
                  (() => {
                    const heatmapData = filteredProjects.filter(p => p.is3T).map(p => {
                      const matchedTrans = transmigrants.filter(t => t.destination && t.destination.includes(p.name));
                      const score = matchedTrans.reduce((sum, t) => sum + (Number(t.familyMembers) || 1), 0);
                      return { lat: p.lat, lng: p.lng, score: score };
                    });
                    const maxScore = Math.max(...heatmapData.map(d => d.score), 10); // at least 10 for max to prevent over-saturation on small numbers
                    
                    return (
                      <HeatmapLayer 
                        points={heatmapData.map(d => [d.lat, d.lng, Math.max(0.5, d.score)])} 
                        maxVal={maxScore}
                      />
                    );
                  })()
                ) : (
                  <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
                    {filteredProjects.map((p) => (
                      <Marker 
                        key={p.id} 
                        position={[p.lat, p.lng]} 
                        icon={createCustomIcon(p.status)}
                      >
                        <Popup className="custom-popup" closeButton={false}>
                        <div className="bg-white min-w-[200px]">
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                          <h3 className="font-bold text-sm text-slate-900 leading-tight pr-4">{p.name}</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5">
                            {p.region} • {translateGeoStatus(p.status)} • {translateGeoCategory(p.category || (p.is3T ? 'Daerah 3T' : 'Reguler'))}
                          </p>
                        </div>
                        <div className="p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-500">
                            <div><span className="text-[9px] text-slate-400 font-sans block mb-1">LATITUDE</span>{p.lat.toFixed(4)}</div>
                            <div><span className="text-[9px] text-slate-400 font-sans block mb-1">LONGITUDE</span>{p.lng.toFixed(4)}</div>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-100">
                            <button onClick={() => setViewingItem(p)} className="w-full text-[10px] bg-primary-500/10 text-primary-500 py-1.5 rounded font-bold uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                              <Info className="w-3 h-3" /> Detail
                            </button>
                          </div>

                          {(canEdit || canDelete) && (
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                               {canEdit && (
                                 <button onClick={() => handleOpenModal(p)} className="px-3 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-[13px] font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] border-0 active:scale-95">
                                   <Edit2 className="w-3 h-3" /> Edit
                                 </button>
                               )}
                               {canDelete && (
                                 <button onClick={() => setItemToDelete(p.id)} className="flex-1 text-[9px] bg-red-50 text-red-600 py-1.5 rounded font-bold uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                                   <Trash2 className="w-3 h-3" /> Hapus
                                 </button>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  ))}
                  </MarkerClusterGroup>
                )}
              </LayerGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay name={isEn ? "Area Boundaries" : "Batas Area"}>
              <LayerGroup>
                {filteredProjects.map((p) => (
                  <Circle
                    key={`boundary-${p.id}`}
                    center={[p.lat, p.lng]}
                    radius={30000}
                    pathOptions={{ color: p.is3T ? '#ef4444' : '#3b82f6', fillColor: p.is3T ? '#ef4444' : '#3b82f6', fillOpacity: 0.1, weight: 2 }}
                  />
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>

        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto flex z-[10] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex flex-wrap gap-3 sm:gap-4 pointer-events-auto w-full sm:w-auto overflow-x-auto">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm border-2 border-white ring-1 ring-amber-500/20"></div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{isEn ? "Preparation" : "Persiapan"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500 shadow-sm border-2 border-white ring-1 ring-primary-500/50"></div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{isEn ? "Implementation" : "Pelaksanaan"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm border-2 border-white ring-1 ring-emerald-500/20"></div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{isEn ? "Coaching" : "Pembinaan"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

