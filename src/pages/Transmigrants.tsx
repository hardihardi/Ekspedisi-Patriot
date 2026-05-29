import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Plus, Search, Filter, Download, Edit2, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { useStore } from '../store/useStore';
import { translations } from '../lib/translations';

interface Transmigrant {
  id?: string;
  fullName: string;
  nik: string;
  origin: string;
  destination: string;
  familyMembers: number;
  skills: string[];
  status: 'Terdaftar' | 'Proses' | 'Ditempatkan';
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

export const Transmigrants: React.FC = () => {
  const { language } = useStore();
  const isEn = language === 'en';
  const t = translations[language];

  const translateStatus = (st: string) => {
    if (!isEn) return st;
    switch (st) {
      case 'Semua': return 'All';
      case 'Terdaftar': return 'Registered';
      case 'Proses': return 'In Process';
      case 'Ditempatkan': return 'Deployed';
      default: return st;
    }
  };

  const [data, setData] = useState<Transmigrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const geographies = rawProjects.length > 0 ? rawProjects : MASTER_LOKASI_FALLBACK;

  const currentUser = useStore(state => state.user);
  const canEdit = currentUser?.role !== 'pimpinan'; // Everyone else can edit
  const canDelete = currentUser?.role === 'superadmin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transmigrant | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmittedAttempted, setFormSubmittedAttempted] = useState(false);

  const [formData, setFormData] = useState<Transmigrant>({
    fullName: '', nik: '', origin: '', destination: '', familyMembers: 1, skills: [], status: 'Terdaftar'
  });
  const [skillInput, setSkillInput] = useState('');

  const validateForm = (data: typeof formData): boolean => {
    const errs: Record<string, string> = {};
    if (!data.fullName.trim()) errs.fullName = isEn ? 'Full name is required.' : 'Nama lengkap wajib diisi.';
    else if (data.fullName.trim().length < 3) errs.fullName = isEn ? 'Name is too short.' : 'Nama terlalu pendek.';
    
    if (!data.nik.trim()) errs.nik = 'NIK wajib diisi.';
    else if (!/^\d{16}$/.test(data.nik.trim())) errs.nik = isEn ? 'NIK must be 16 numeric digits.' : 'NIK harus 16 digit angka.';
    
    if (!data.origin.trim()) errs.origin = isEn ? 'Origin is required.' : 'Asal wajib diisi.';
    if (!data.destination.trim()) errs.destination = isEn ? 'Destination is required.' : 'Tujuan wajib dipilih.';
    if (data.familyMembers < 1) errs.familyMembers = isEn ? 'Must be at least 1 person.' : 'Minimal 1 jiwa.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    if (formSubmittedAttempted) validateForm(formData);
  }, [formData, formSubmittedAttempted]);

  useEffect(() => {
    const qProj = query(collection(db, 'projects'));
    const unsubProj = onSnapshot(qProj, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawProjects(projs);
    }, (err) => console.error(err));

    const q = query(collection(db, 'transmigrants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transmigrant));
      setData(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transmigrants');
      setLoading(false);
    });
    return () => {
      unsubProj();
      unsubscribe();
    };
  }, []);

  const handleOpenModal = (item?: Transmigrant) => {
    setErrors({});
    setFormSubmittedAttempted(false);
    if (item) {
      setEditingItem(item);
      setFormData(item);
      const matchingGeog = geographies.find(g => g.name === item.destination);
      setSelectedRegion(matchingGeog ? matchingGeog.region : '');
    } else {
      setEditingItem(null);
      setFormData({ fullName: '', nik: '', origin: '', destination: '', familyMembers: 1, skills: [], status: 'Terdaftar' });
      setSelectedRegion('');
    }
    setSkillInput('');
    setIsModalOpen(true);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittedAttempted(true);
    if (!validateForm(formData)) return;
    
    try {
      if (editingItem?.id) {
        await updateDoc(doc(db, 'transmigrants', editingItem.id), { ...formData });
      } else {
        await addDoc(collection(db, 'transmigrants'), formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'transmigrants');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'transmigrants', deletingId));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transmigrants/${deletingId}`);
    }
  };

  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const fullyFilteredData = data.filter(tr => {
    let match = true;
    const matchSearch = tr.fullName.toLowerCase().includes(search.toLowerCase()) || tr.nik.includes(search);
    const matchStatus = filterStatus === 'Semua' || tr.status === filterStatus;
    if (!matchSearch || !matchStatus) match = false;
    // Data might need a createdAt field added to support month/year strictly, 
    // but we can map if it exists, or just ignore if it doesn't.
    // For now we assume tr.createdAt exists or we fall back.
    const trAny = tr as any;
    if (trAny.createdAt) {
      const date = new Date(trAny.createdAt);
      if (filterMonth && (date.getMonth() + 1).toString() !== filterMonth) match = false;
      if (filterYear && date.getFullYear().toString() !== filterYear) match = false;
    }
    return match;
  });

  const totalPages = Math.ceil(fullyFilteredData.length / ITEMS_PER_PAGE);
  const paginatedData = fullyFilteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Data Transmigran', 14, 15);
    const tableData = fullyFilteredData.map(t => [
      t.fullName, t.nik, t.origin, t.destination, t.familyMembers.toString(), t.status
    ]);
    autoTable(doc, {
      head: [['Nama Lengkap', 'NIK', 'Asal', 'Tujuan', 'Anggota Keluarga', 'Status']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    doc.save('Data_Transmigran.pdf');
  };

  const exportCSV = () => {
    const csvData = fullyFilteredData.map(t => ({
      'Nama Lengkap': t.fullName,
      'NIK': t.nik,
      'Asal': t.origin,
      'Tujuan': t.destination,
      'Anggota Keluarga': t.familyMembers,
      'Status': t.status,
      'Keterampilan': t.skills.join(', ')
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Data_Transmigran.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
     setCurrentPage(1);
  }, [search, filterStatus, filterMonth, filterYear]);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={isEn ? "Delete Transmigrant Data" : "Hapus Data Transmigran"}
        message={isEn ? "Are you sure you want to delete this transmigrant data? This action cannot be undone." : "Apakah Anda yakin ingin menghapus data transmigran ini? Tindakan ini tidak dapat dibatalkan."}
        confirmText={isEn ? "Delete Data" : "Hapus Data"}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? t.trans_form_edit : t.trans_form_add}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden" noValidate>
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t.trans_name}</label>
                    <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} type="text" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.fullName ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                    {errors.fullName && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.fullName}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">NIK</label>
                    <input required value={formData.nik} onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 16) {
                        setFormData({...formData, nik: val});
                      }
                    }} maxLength={16} title={isEn ? "NIK must be exactly 16 numeric digits" : "NIK harus terdiri dari 16 digit angka"} type="text" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.nik ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                    {errors.nik && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.nik}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t.trans_origin}</label>
                    <input required value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} type="text" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.origin ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                    {errors.origin && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.origin}</p>}
                  </div>

                  {/* Geografis & Pemetaan Kawasan Dropdowns */}
                  <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Wilayah Dropdown */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "REGION (GEOGRAPHICAL)" : "WILAYAH (GEOGRAFIS)"} <span className="text-red-500">*</span></label>
                      <select
                        value={selectedRegion}
                        onChange={(e) => {
                          const reg = e.target.value;
                          setSelectedRegion(reg);
                          // reset selected kawasan inside state
                          setFormData(prev => ({
                            ...prev,
                            destination: reg ? `, ${reg}` : '',
                          }));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-primary-500 cursor-pointer text-slate-700 text-left"
                        required
                      >
                        <option value="">{isEn ? '-- Select Region --' : '-- Pilih Wilayah --'}</option>
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "AREA (MAPPED)" : "KAWASAN (PEMETAAN)"} <span className="text-red-500">*</span></label>
                      <select
                        value={geographies.find(g => `${g.name} (${g.region})` === formData.destination)?.name || ''}
                        onChange={(e) => {
                          const kaw = e.target.value;
                          const matchingObj = geographies.find(g => g.name === kaw);
                          if (matchingObj) {
                            setFormData(prev => ({
                              ...prev,
                              destination: `${matchingObj.name} (${matchingObj.region})`
                            }));
                          } else {
                            setFormData(prev => ({ ...prev, destination: kaw }));
                          }
                        }}
                        className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors cursor-pointer text-slate-700 text-left", errors.destination ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")}
                        required
                        disabled={!selectedRegion}
                      >
                        <option value="">{selectedRegion ? (isEn ? '-- Select Locus --' : '-- Pilih Kawasan --') : (isEn ? 'Pilih Wilayah Terlebih Dahulu' : 'Pilih Wilayah Terlebih Dahulu')}</option>
                        {geographies.filter(g => g.region === selectedRegion).map(g => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                      {errors.destination && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.destination}</p>}
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t.trans_dest}</label>
                    <input required value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} type="text" className={cn("w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs outline-none transition-colors text-slate-700", errors.destination ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Family Members (Soul)" : "Anggota Keluarga (Jiwa)"}</label>
                    <input required value={formData.familyMembers} onChange={e => setFormData({...formData, familyMembers: Number(e.target.value)})} type="number" min="1" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.familyMembers ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                    {errors.familyMembers && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.familyMembers}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                      <option value="Terdaftar">{isEn ? "Registered" : "Terdaftar"}</option>
                      <option value="Proses">{isEn ? "Process" : "Proses"}</option>
                      <option value="Ditempatkan">{isEn ? "Deployed" : "Ditempatkan"}</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t.trans_skills}</label>
                    <div className="flex gap-2">
                      <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} type="text" placeholder={isEn ? "Enter skill (and press enter)" : "Masukkan keahlian (enter)"} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                      <button type="button" onClick={handleAddSkill} className="bg-slate-100 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200">{isEn ? "Add" : "Tambah"}</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.skills.map((skill) => (
                        <span key={skill} className="text-[10px] font-bold bg-primary-500/10 text-primary-500 px-2 py-1 rounded flex items-center gap-1 border border-primary-500">
                          {skill} <X className="w-3 h-3 cursor-pointer hover:text-primary-500" onClick={() => handleRemoveSkill(skill)} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 bg-white shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">{isEn ? 'Cancel' : 'Batal'}</button>
                 <button type="submit" className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all border-0 flex items-center justify-center gap-2">{editingItem ? (isEn ? 'Save Data' : 'Simpan Data') : (isEn ? 'Add Data' : 'Tambah Data')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-755 tracking-tight">{isEn ? "Transmigrant Database" : "Database Transmigran"}</h1>
          <p className="text-slate-400 text-xs sm:text-[13px] font-semibold">{isEn ? "Demographic management, family relationships, and skill profiles of national transmigrants." : "Manajemen demografi, hubungan keluarga, dan profil keterampilan transmigran nasional."}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex gap-2">
            <button onClick={exportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 text-slate-400" /> Export PDF
            </button>
            <button onClick={exportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
            </button>
          </div>
          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-500 text-white px-5 py-2 rounded-lg text-xs md:text-[13px] font-bold hover:bg-primary-600 transition-all shadow-sm active:scale-95 cursor-pointer">
              <Plus className="w-4 h-4" /> {isEn ? "Add Transmigrant" : "Tambah Transmigran"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: isEn ? 'Total Registered' : 'Total Terdaftar', value: data.length, color: 'text-primary-500', bg: 'bg-white', iconbg: 'bg-primary-50' },
          { label: isEn ? 'Registered Status' : 'Status Terdaftar', value: data.filter(d => d.status === 'Terdaftar').length, color: 'text-blue-500', bg: 'bg-white', iconbg: 'bg-blue-50' },
          { label: isEn ? 'Process Status' : 'Status Proses', value: data.filter(d => d.status === 'Proses').length, color: 'text-amber-500', bg: 'bg-white', iconbg: 'bg-amber-50' },
          { label: isEn ? 'Deployed Status' : 'Status Ditempatkan', value: data.filter(d => d.status === 'Ditempatkan').length, color: 'text-emerald-500', bg: 'bg-white', iconbg: 'bg-emerald-50' },
        ].map((stat, i) => (
           <div key={i} className={cn("p-5 rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex flex-col justify-between items-start min-h-[120px]", stat.bg)}>
             <div className="flex items-center gap-3 w-full">
               <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs", stat.iconbg, stat.color)}>
                 <Users className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-[11px] font-bold tracking-wider uppercase text-slate-450">{stat.label}</p>
                 <h3 className="text-2xl font-black text-slate-700 leading-none mt-1">{stat.value}</h3>
               </div>
             </div>
             <span className="text-[10.5px] font-semibold text-slate-400 mt-2 block">{isEn ? 'Transmigration coverage program' : 'Cakupan program Transmigrasi'}</span>
           </div>
         ))}
      </div>

      <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder={isEn ? "Search NIK or Name..." : "Cari NIK atau Nama..."} className="bg-transparent border-none outline-none text-[13px] font-medium text-slate-700 placeholder-slate-400 w-full py-0.5" />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
               <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-600 outline-none focus:border-primary-500 cursor-pointer">
                  <option value="Semua">{isEn ? "All Statuses" : "Semua Status"}</option>
                  <option value="Terdaftar">{isEn ? "Registered" : "Terdaftar"}</option>
                  <option value="Proses">{isEn ? "In Process" : "Proses"}</option>
                  <option value="Ditempatkan">{isEn ? "Deployed" : "Ditempatkan"}</option>
               </select>
               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-600 outline-none focus:border-primary-500 cursor-pointer">
                  <option value="">{isEn ? "Month" : "Bulan"}</option>
                  {Array.from({length: 12}, (_, i) => (<option key={i+1} value={String(i+1)}>{new Date(0, i).toLocaleString(isEn ? 'en-US' : 'id-ID', {month: 'long'})}</option>))}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-600 outline-none focus:border-primary-500 cursor-pointer">
                  <option value="">{isEn ? "Year" : "Tahun"}</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
               </select>
            </div>
          </div>
          <div className="text-[12.5px] font-bold text-primary-500 bg-primary-50/50 px-3.5 py-1.5 border border-primary-100 rounded-lg whitespace-nowrap">
            {isEn ? `Filtered: ${fullyFilteredData.length} rows` : `Terfilter: ${fullyFilteredData.length} baris`}
          </div>
        </div>

        <div className="p-5 bg-slate-50/20">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-bold text-[14px]">{isEn ? "Transmigrant data is empty or not found." : "Data transmigran kosong atau tidak ditemukan."}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedData.map((tr, i) => (
                  <motion.div
                    key={tr.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-primary-500 transition-all group overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/15">
                      <div>
                         <h3 className="text-[14.5px] font-bold text-slate-700 line-clamp-1 group-hover:text-primary-500 transition-colors">{tr.fullName}</h3>
                         <p className="text-[11.5px] font-mono font-semibold text-slate-400 mt-0.5 tracking-tight">NIK: {tr.nik}</p>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 border",
                        tr.status === 'Ditempatkan' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        tr.status === 'Proses' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-primary-50 text-primary-500 border-primary-100"
                      )}>
                        {translateStatus(tr.status)}
                      </span>
                    </div>
                    <div className="p-5 space-y-4 flex-1">
                      <div className="grid grid-cols-2 gap-3 border-b border-slate-50 pb-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isEn ? "Origin" : "Asal"}</p>
                          <p className="text-[13px] font-semibold text-slate-650 truncate" title={tr.origin}>{tr.origin}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isEn ? "Destination" : "Tujuan"}</p>
                          <p className="text-[13px] font-semibold text-primary-500 truncate" title={tr.destination}>{tr.destination}</p>
                        </div>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            {isEn ? "Skills Owned" : "Keterampilan"}
                            <span className="text-[11px] text-slate-450 font-bold normal-case font-sans">{isEn ? `${tr.familyMembers} Family Members` : `${tr.familyMembers} Jiwa Keluarga`}</span>
                         </p>
                         <div className="flex flex-wrap gap-1.5">
                           {tr.skills.length > 0 ? tr.skills.map(s => (
                             <span key={s} className="text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60 truncate max-w-full" title={s}>{s}</span>
                           )) : (
                             <span className="text-[11px] text-slate-400 font-semibold italic">{isEn ? "No skills updated" : "Belum ada profil bidang"}</span>
                           )}
                         </div>
                      </div>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="p-4 border-t border-slate-50 flex justify-end gap-2 bg-slate-50/10 shrink-0">
                        {canEdit && (
                          <button onClick={() => handleOpenModal(tr)} className="px-3.5 py-1.5 text-xs font-bold bg-primary-100/50 hover:bg-primary-100 text-primary-600 rounded-lg transition-all flex items-center gap-1.5 border-0 shadow-xs cursor-pointer">
                            <Edit2 className="w-3.5 h-3.5" /> {isEn ? "Edit" : "Edit"}
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeletingId(tr.id!)} className="px-3.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-all flex items-center gap-1.5 border-0 shadow-xs cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" /> {isEn ? "Delete" : "Hapus"}
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                 <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isEn ? "Prev" : "Sebelumnya"}
                 </button>
                 <span className="text-sm font-medium text-slate-600 px-2">
                    {isEn ? `Page ${currentPage} of ${totalPages}` : `Hal ${currentPage} dari ${totalPages}`}
                 </span>
                 <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isEn ? "Next" : "Berikutnya"}
                 </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

