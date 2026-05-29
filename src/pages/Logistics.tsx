import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Truck, CheckCircle2, Clock, Search, Filter, Plus, Package, Edit2, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

interface LogisticsItem {
  id?: string;
  transmigrant: string;
  category: string; // 'Jaminan Hidup (Jadup)' | 'Alat Pertanian'
  item: string;
  qty: number;
  unit: string;
  status: string;
  distributionDate: string;
  kawasan?: string;
}

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

export const Logistics: React.FC = () => {
  const [items, setItems] = useState<LogisticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const geographies = rawProjects.length > 0 ? rawProjects : MASTER_LOKASI_FALLBACK;
  
  const currentUser = useStore(state => state.user);
  const canModify = currentUser?.role !== 'pimpinan'; // Assuming pimpinan is read-only

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LogisticsItem | null>(null);
  
  const [formData, setFormData] = useState<LogisticsItem>({
     transmigrant: '',
     category: 'Jaminan Hidup (Jadup)',
     item: '',
     qty: 1,
     unit: 'Paket',
     status: 'Pending',
     distributionDate: new Date().toISOString().split('T')[0],
     kawasan: ''
  });

  useEffect(() => {
    const qProj = query(collection(db, 'projects'));
    const unsubProj = onSnapshot(qProj, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawProjects(projs);
    }, (err) => console.error(err));

    const q = query(collection(db, 'logistics'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogisticsItem));
      // Sort by latest distribution date conceptually, or just leave it
      dbItems.sort((a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime());
      setItems(dbItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error as any, OperationType.LIST, 'logistics');
      setLoading(false);
    });
    return () => {
      unsubProj();
      unsubscribe();
    };
  }, []);

  const handleOpenModal = (item?: LogisticsItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ 
         transmigrant: item.transmigrant || '', 
         category: item.category || 'Jaminan Hidup (Jadup)',
         item: item.item || '', 
         qty: item.qty || 1, 
         unit: item.unit || 'Paket',
         status: item.status || 'Pending',
         distributionDate: item.distributionDate || new Date().toISOString().split('T')[0],
         kawasan: item.kawasan || ''
      });
      const matchingGeog = geographies.find(g => g.name === item.kawasan);
      setSelectedRegion(matchingGeog ? matchingGeog.region : '');
    } else {
      setEditingItem(null);
      setFormData({
         transmigrant: '', 
         category: 'Jaminan Hidup (Jadup)',
         item: '', 
         qty: 1, 
         unit: 'Paket',
         status: 'Pending',
         distributionDate: new Date().toISOString().split('T')[0],
         kawasan: ''
      });
      setSelectedRegion('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && editingItem.id) {
         await setDoc(doc(db, 'logistics', editingItem.id), formData, { merge: true });
      } else {
         await addDoc(collection(db, 'logistics'), formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error as any, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'logistics');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'logistics', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error as any, OperationType.DELETE, 'logistics');
    }
  };

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const fullyFilteredItems = items.filter(c => {
     let match = c.transmigrant?.toLowerCase().includes(search.toLowerCase()) || 
                 c.item?.toLowerCase().includes(search.toLowerCase()) ||
                 c.category?.toLowerCase().includes(search.toLowerCase());
     
     // Category Filter
     if (filterCategory !== 'Semua' && c.category !== filterCategory) {
       match = false;
     }

     // Start/End Date Filter
     if (c.distributionDate && match) {
       if (filterStartDate && c.distributionDate < filterStartDate) match = false;
       if (filterEndDate && c.distributionDate > filterEndDate) match = false;
     } else if ((filterStartDate || filterEndDate) && !c.distributionDate) {
       match = false;
     }
     
     return match;
  });

  const totalPages = Math.ceil(fullyFilteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = fullyFilteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
     setCurrentPage(1);
  }, [search, filterStartDate, filterEndDate, filterCategory]);

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
          onClick={() => setCurrentPage(p)}
          className={cn(
            "w-8 h-8 text-xs sm:text-sm font-bold rounded-lg transition-all border shrink-0",
            currentPage === p 
              ? "bg-primary-600 text-white border-primary-600 shadow-xs" 
              : "border-slate-200 text-slate-650 hover:bg-slate-50 cursor-pointer"
          )}
        >
          {p}
        </button>
      );
    });
  };

  const exportPDF = () => {
    const pdfDoc = new jsPDF();
    pdfDoc.text('Data Logistik & Jadup', 14, 15);
    const tableData = fullyFilteredItems.map(t => [
      t.transmigrant, t.category, t.item, `${t.qty} ${t.unit}`, t.distributionDate, t.status
    ]);
    autoTable(pdfDoc, {
      head: [['Penerima', 'Kategori', 'Barang', 'Jumlah', 'Distribusi', 'Status']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    pdfDoc.save('Data_Logistik.pdf');
  };

  const exportCSV = () => {
    const csvData = fullyFilteredItems.map(t => ({
      'Penerima': t.transmigrant,
      'Kategori': t.category,
      'Barang': t.item,
      'Jumlah': t.qty,
      'Satuan': t.unit,
      'Status': t.status,
      'Tanggal Distribusi': t.distributionDate
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Data_Logistik.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Data Logistik"
        message="Apakah Anda yakin ingin menghapus data distribusi ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Data"
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? 'Edit Distribusi' : 'Distribusi Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Nama Penerima</label>
                  <input required value={formData.transmigrant} onChange={e => setFormData({...formData, transmigrant: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                </div>

                {/* Geografis & Pemetaan Kawasan Dropdowns */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Wilayah Dropdown */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">WILAYAH (GEOGRAFIS) <span className="text-red-500">*</span></label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => {
                        const reg = e.target.value;
                        setSelectedRegion(reg);
                        // reset location inside state
                        setFormData(prev => ({
                          ...prev,
                          kawasan: '',
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-primary-500 cursor-pointer text-slate-700 text-left bg-slate-50"
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
                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">KAWASAN (PEMETAAN) <span className="text-red-500">*</span></label>
                    <select
                      value={formData.kawasan || ''}
                      onChange={(e) => {
                        const kaw = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          kawasan: kaw
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-primary-500 cursor-pointer text-slate-700 text-left"
                      required
                      disabled={!selectedRegion}
                    >
                      <option value="">{selectedRegion ? '-- Pilih Kawasan --' : 'Pilih Wilayah Terlebih Dahulu'}</option>
                      {geographies.filter(g => g.region === selectedRegion).map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tipe Bantuan</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                    <option value="Jaminan Hidup (Jadup)">Jaminan Hidup (Jadup)</option>
                    <option value="Alat Pertanian">Alat Pertanian</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Nama Item Detail</label>
                  <input required value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" placeholder="e.g. Beras 50kg, Traktor Tangan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Jumlah (Qty)</label>
                    <input required min="1" value={formData.qty} onChange={e => setFormData({...formData, qty: parseInt(e.target.value) || 0})} type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Satuan</label>
                    <input required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" placeholder="Unit, Kg, Paket" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tanggal Distribusi</label>
                    <input required value={formData.distributionDate} onChange={e => setFormData({...formData, distributionDate: e.target.value})} type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                      <option value="Pending">Pending</option>
                      <option value="Dikirim">Dikirim</option>
                      <option value="Diterima">Diterima</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 bg-white shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">Batal</button>
                 <button type="submit" className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all border-0 flex items-center justify-center gap-2">{editingItem ? 'Simpan' : 'Buat'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-750 tracking-tight">Logistik & Jadup</h1>
          <p className="text-slate-400 text-xs sm:text-[13px] font-semibold">Pemantauan distribusi bantuan bahan pokok, jaminan hidup (jadup), dan alat produksi tani transmigran.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-3 sm:mt-0">
          <button onClick={exportPDF} className="flex-grow sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-xs">
             Export PDF
          </button>
          <button onClick={exportCSV} className="flex-grow sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-xs">
             Export CSV
          </button>
          {canModify && (
            <button onClick={() => handleOpenModal()} className="flex-grow sm:flex-none w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-500 text-white px-5 py-2 rounded-lg text-xs md:text-[13px] font-bold tracking-wide hover:bg-primary-600 transition-all shadow-sm active:scale-95 cursor-pointer">
               <Plus className="w-4 h-4" /> Distribusi Baru
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.1)]">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center shadow-xs"><Package className="w-5 h-5" /></div>
             <p className="text-[12.5px] font-bold text-slate-450 uppercase tracking-wider">Total Terdaftar</p>
           </div>
           <h3 className="text-3xl font-black text-slate-700 mt-1">{1417 + items.length} <span className="text-xs text-slate-400 font-semibold normal-case">Bantuan</span></h3>
           <p className="text-[10.5px] text-slate-400 mt-2 font-semibold">Paket bantuan terhitung dari database</p>
        </div>
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.1)]">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs"><CheckCircle2 className="w-5 h-5" /></div>
             <p className="text-[12.5px] font-bold text-slate-450 uppercase tracking-wider">Tersalurkan</p>
           </div>
           <h3 className="text-3xl font-black text-slate-700 mt-1">{items.filter(i => i.status === 'Diterima').length + 1199} <span className="text-xs text-emerald-500 font-bold normal-case">84.5% Sukses</span></h3>
           <p className="text-[10.5px] text-emerald-500/80 mt-2 font-bold">Resi bukti fisik telah ditandatangani</p>
        </div>
        <div className="bg-white p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.1)]">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs"><Clock className="w-5 h-5" /></div>
             <p className="text-[12.5px] font-bold text-slate-450 uppercase tracking-wider">Transit / Pending</p>
           </div>
           <h3 className="text-3xl font-black text-slate-700 mt-1">{items.filter(i => i.status !== 'Diterima').length + 218} <span className="text-xs text-amber-600 font-bold normal-case">Dalam Pengantaran</span></h3>
           <p className="text-[10.5px] text-amber-550 mt-2 font-bold">Sedang dimonitor oleh kurir lapangan</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.1)] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
           <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full">
             <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all w-full lg:w-80 shrink-0 shadow-2xs">
               <Search className="w-4 h-4 text-slate-400" />
               <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Cari nama, item, kategori bantuan..." className="bg-transparent border-none outline-none text-[13px] font-semibold text-slate-700 focus:ring-0 w-full py-0.5 placeholder:font-normal" />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
               <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-600 outline-none focus:border-primary-500 cursor-pointer shadow-2xs">
                 <option value="Semua">Semua Kategori</option>
                 <option value="Jaminan Hidup (Jadup)">Jaminan Hidup (Jadup)</option>
                 <option value="Alat Pertanian">Alat Pertanian</option>
               </select>
               <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-full shadow-2xs">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Start</span>
                 <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold cursor-pointer w-full text-right lg:text-left focus:ring-0 min-w-[100px]" />
               </div>
               <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-full shadow-2xs">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">End</span>
                 <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold cursor-pointer w-full text-right lg:text-left focus:ring-0 min-w-[100px]" />
               </div>
             </div>
           </div>
           <div className="text-[12.5px] font-bold text-primary-500 bg-primary-50/50 px-3.5 py-1.5 border border-primary-100 rounded-lg whitespace-nowrap self-start lg:self-center">
             Terfilter: {fullyFilteredItems.length} baris
           </div>
        </div>

        <div className="p-5 bg-slate-50/20">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-bold text-[14px]">Tidak ditemukan data logistik bantuan yang cocok.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.08)] border-0 hover:border-primary-400 hover:shadow-md transition-all group overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/15">
                       <div className="flex flex-col">
                          <h3 className="text-[14.5px] font-bold text-slate-700 line-clamp-1 group-hover:text-primary-500 transition-colors">{item.transmigrant}</h3>
                          <span className="text-[11px] font-semibold text-slate-450 mt-0.5 tracking-wide">{item.category}</span>
                       </div>
                       <span className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase whitespace-nowrap shadow-xs border shrink-0",
                          item.status === 'Diterima' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          item.status === 'Dikirim' ? "bg-primary-50 text-primary-500 border-primary-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {item.status}
                        </span>
                    </div>
                    
                    <div className="p-5 space-y-4 flex-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-0.5">Item Bantuan</p>
                        <p className="text-[13.5px] font-semibold text-slate-700 line-clamp-2 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border-0/45">{item.item}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Jumlah</p>
                          <p className="text-[13px] text-slate-600 font-bold"><span className="text-primary-500 font-extrabold">{item.qty}</span> {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tanggal</p>
                          <p className="text-[12px] font-mono text-slate-450 font-bold">{item.distributionDate}</p>
                        </div>
                      </div>
                    </div>
 
                    {canModify && (
                      <div className="p-4 border-t border-slate-50 flex justify-end gap-2 bg-slate-50/10 shrink-0">
                        <button onClick={() => handleOpenModal(item)} className="px-3.5 py-1.5 text-xs font-bold bg-primary-100/50 hover:bg-primary-100 text-primary-600 rounded-lg transition-all flex items-center gap-1.5 border-0 shadow-xs cursor-pointer"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => setItemToDelete(item.id!)} className="px-3.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-all flex items-center gap-1.5 border-0 shadow-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-250/20 shadow-xs w-full">
                <div className="text-xs sm:text-sm text-slate-500 font-medium">
                  Menampilkan {Math.min(fullyFilteredItems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} sampai {Math.min(fullyFilteredItems.length, currentPage * ITEMS_PER_PAGE)} dari {fullyFilteredItems.length} data
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
      </div>
    </div>
  );
};
