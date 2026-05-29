import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, UserPlus, Search, List, Activity, Key, Edit2, Trash2, Download, X, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

import { AccessDenied } from '../components/AccessDenied';

interface UserManagementProps {
  setActiveTab?: (tab: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ setActiveTab }) => {
  const [activeTab, setActiveTabLocal] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [search, setSearch] = useState('');
  
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmittedAttempted, setFormSubmittedAttempted] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', email: '', role: 'petugas_lapangan', nip: '', nik: '', department: '', phone: '', address: '' });

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
  
  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat';
  const canDelete = currentUser?.role === 'superadmin';

  const validateForm = (data: typeof formData): boolean => {
    const errs: Record<string, string> = {};
    if (!data.name.trim()) errs.name = 'Nama lengkap wajib diisi.';
    else if (data.name.trim().length < 3) errs.name = 'Nama minimal 3 karakter.';
    
    if (!data.email.trim()) errs.email = 'Email wajib diisi.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Format email tidak valid.';
    
    if (!data.nik.trim()) errs.nik = 'NIK wajib diisi.';
    else if (!/^\d{16}$/.test(data.nik.trim())) errs.nik = 'NIK harus 16 digit angka.';
    
    if (data.phone && !/^\d{9,14}$/.test(data.phone.replace(/\D/g, ''))) errs.phone = 'No HP tidak valid (9-14 digit).';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    if (formSubmittedAttempted) validateForm(formData);
  }, [formData, formSubmittedAttempted]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    const qLog = query(collection(db, 'logs'));
    const unsubscribeLog = onSnapshot(qLog, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(items);
      setLoadingLogs(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logs');
      setLoadingLogs(false);
    });

    return () => {
      unsubscribe();
      unsubscribeLog();
    }
  }, []);

  const handleOpenModal = (user?: any) => {
    setErrors({});
    setFormSubmittedAttempted(false);
    if (user) {
      setEditingItem(user);
      setFormData({ name: user.name || '', email: user.email || '', role: user.role || 'petugas_lapangan', nip: user.nip || '', nik: user.nik || '', department: user.department || '', phone: user.phone || '', address: user.address || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', email: '', role: 'petugas_lapangan', nip: '', nik: '', department: '', phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittedAttempted(true);
    if (!validateForm(formData)) return;

    try {
      const docId = editingItem ? editingItem.id : formData.email.replace(/[@.]/g, '_');
      await setDoc(doc(db, 'users', docId), {
        ...formData,
        lastActive: editingItem ? editingItem.lastActive : 'Baru Saja ditambahkan'
      }, { merge: true });
      setIsModalOpen(false);
    } catch (error) {
       console.error("Error saving user:", error);
       alert("Gagal menyimpan pengguna.");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUserToDelete(null);
    } catch(error) {
      console.error("Error deleting user:", error);
    }
  };

  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const fullyFilteredUsers = users.filter(u => {
     let match = (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
     if (filterRole && u.role !== filterRole) match = false;
     return match;
  });

  const fullyFilteredLogs = logs.filter(l => {
     let match = (l.user || '').toLowerCase().includes(search.toLowerCase()) || (l.action || '').toLowerCase().includes(search.toLowerCase());
     return match;
  });

  const totalPages = Math.ceil((activeTab === 'users' ? fullyFilteredUsers.length : fullyFilteredLogs.length) / ITEMS_PER_PAGE);
  const paginatedUsers = fullyFilteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedLogs = fullyFilteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, activeTab]);

  const exportPDF = () => {
    const pdfDoc = new jsPDF();
    if (activeTab === 'users') {
      pdfDoc.text('Data Pengguna', 14, 15);
      const tableData = fullyFilteredUsers.map(u => [u.name, u.email, u.role, u.department || '-', u.phone || '-']);
      autoTable(pdfDoc, {
        head: [['Nama', 'Email', 'Role', 'Instansi', 'No HP']],
        body: tableData,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      pdfDoc.save('Data_Pengguna.pdf');
    } else {
      pdfDoc.text('Audit Log', 14, 15);
      const tableData = fullyFilteredLogs.map(l => [l.user, l.action, l.details || '-', l.timestamp || '-']);
      autoTable(pdfDoc, {
        head: [['Pengguna', 'Aksi', 'Detail', 'Waktu']],
        body: tableData,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      pdfDoc.save('Audit_Log.pdf');
    }
  };

  const exportCSV = () => {
    let csvData;
    let fileName;
    if (activeTab === 'users') {
      csvData = fullyFilteredUsers.map(u => ({ 'Nama': u.name, 'Email': u.email, 'Role': u.role, 'Instansi': u.department || '-', 'No HP': u.phone || '-' }));
      fileName = 'Data_Pengguna.csv';
    } else {
      csvData = fullyFilteredLogs.map(l => ({ 'Pengguna': l.user, 'Aksi': l.action, 'Detail': l.details || '-', 'Waktu': l.timestamp || '-' }));
      fileName = 'Audit_Log.csv';
    }
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Hapus Pengguna"
        message="Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Pengguna"
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden" noValidate>
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Nama Lengkap</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.name ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                  {errors.name && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
                  <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.email ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} disabled={!!editingItem} />
                  {errors.email && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.email}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Role/Peran</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" disabled={currentUser?.role !== 'superadmin' && currentUser?.role !== 'admin_pusat'}>
                    {currentUser?.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                    {(currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat') && <option value="admin_pusat">Admin Pusat</option>}
                    <option value="admin_daerah">Admin Daerah</option>
                    <option value="petugas_lapangan">Petugas Lapangan</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">NIK</label>
                    <input required value={formData.nik} onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 16) setFormData({...formData, nik: val});
                    }} type="text" maxLength={16} title="NIK harus terdiri dari 16 digit angka" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.nik ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                    {errors.nik && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.nik}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">NIP (Opsional)</label>
                    <input value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Instansi</label>
                  <input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">No HP</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="text" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.phone ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                  {errors.phone && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.phone}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Alamat</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 bg-white shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">Batal</button>
                 <button type="submit" className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all border-0 flex items-center justify-center gap-2">{editingItem ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna & Log</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Kontrol hak akses RBAC dan audit trail aktivitas sistem.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTabLocal('users')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'users' ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Shield className="w-3.5 h-3.5" /> Daftar User
          </button>
          <button 
            onClick={() => setActiveTabLocal('logs')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'logs' ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Activity className="w-3.5 h-3.5" /> Audit Log
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-transparent focus-within:bg-white focus-within:border-primary-500 focus-within:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Cari user (nama atau email)..." className="bg-transparent border-none outline-none text-[14px] text-slate-600 focus:ring-0 w-full py-0.5" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                     <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-lg text-[13px] font-medium text-slate-600  hover:bg-slate-50 shrink-0">
                       <Download className="w-3.5 h-3.5" /> PDF
                     </button>
                     <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-lg text-[13px] font-medium text-slate-600  hover:bg-slate-50 shrink-0">
                       <Download className="w-3.5 h-3.5" /> CSV
                     </button>
                     <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-lg text-[13px] font-medium text-slate-600  hover:bg-slate-50 shrink-0 outline-none">
                       <option value="">Semua Role</option>
                       <option value="superadmin">Superadmin</option>
                       <option value="admin_pusat">Admin Pusat</option>
                       <option value="admin_daerah">Admin Daerah</option>
                       <option value="petugas_lapangan">Petugas Lapangan</option>
                     </select>
                    {canEdit && (
                      <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs md:text-[13px] font-semibold tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95">
                        <UserPlus className="w-3.5 h-3.5" /> Tambah User
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50/20 max-h-[600px] overflow-y-auto custom-scrollbar">
                   {loading ? (
                       <div className="flex justify-center py-8">
                         <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                       </div>
                   ) : paginatedUsers.length === 0 ? (
                     <div className="py-12 text-center text-[14px] font-medium text-slate-400">Tidak ada data pengguna</div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                       {paginatedUsers.map((u, i) => (
                         <motion.div
                           key={u.id}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-primary-500 transition-all group overflow-hidden flex flex-col"
                         >
                           <div className="p-4 border-b border-slate-100 flex items-start gap-4">
                             <div className="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0 uppercase font-bold text-lg">
                               {u.name?.charAt(0) || 'U'}
                             </div>
                             <div className="flex-1 min-w-0">
                               <h3 className="text-[15px] font-semibold text-slate-700 line-clamp-1">{u.name}</h3>
                               <p className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">{u.email}</p>
                             </div>
                           </div>
                           <div className="p-4 space-y-3 flex-1 bg-slate-50/30">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Peran (Role)</span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-widest border border-transparent shadow-sm",
                                  (u.role || '').includes('superadmin') ? "bg-red-50 text-red-500" :
                                  (u.role || '').includes('admin') ? "bg-primary-500/10 text-primary-500 " : "bg-slate-100 text-slate-500"
                                )}>
                                  {(u.role || 'petugas_lapangan').replace('_', ' ')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">NIK</p>
                                  <p className="text-[12px] font-mono text-slate-700">{u.nik || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">NIP</p>
                                  <p className="text-[12px] font-mono text-slate-700">{u.nip || '-'}</p>
                                </div>
                              </div>
                              {u.department && (
                                <div>
                                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">Instansi</p>
                                  <p className="text-[13px] font-medium text-slate-700 line-clamp-1">{u.department}</p>
                                </div>
                              )}
                           </div>
                           {(canEdit || canDelete) && (
                              <div className="p-3 border-t border-slate-100 bg-white flex justify-end gap-2 shrink-0">
                                {canEdit && (
                                  <button onClick={() => handleOpenModal(u)} className="px-3 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-[13px] font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] border-0 active:scale-95"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                                )}
                                {canDelete && (
                                  <button onClick={() => setUserToDelete(u.id)} className="px-3 py-1.5 text-[12px] font-medium bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-600 hover:text-red-500 hover:border-red-200 rounded-lg transition-all flex items-center gap-1.5 "><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
                                )}
                              </div>
                           )}
                         </motion.div>
                       ))}
                     </div>
                   )}
                   {totalPages > 1 && (
                     <div className="mt-6 flex items-center justify-center gap-2 pb-4">
                       <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                         Prev
                       </button>
                       <span className="text-sm font-medium text-slate-600 px-2">Hal {currentPage} dari {totalPages}</span>
                       <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                         Next
                       </button>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden"
          >
             <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-wrap gap-4">
               <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-transparent focus-within:bg-white focus-within:border-primary-500 focus-within:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all w-full sm:w-80 shrink-0">
                   <Search className="w-3.5 h-3.5 text-slate-400" />
                   <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Cari log..." className="bg-transparent border-none outline-none text-[14px] text-slate-600 focus:ring-0 w-full py-0.5" />
                 </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                   <button onClick={exportPDF} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-lg text-[13px] font-medium text-slate-600  hover:bg-slate-50 shrink-0">
                     <Download className="w-3.5 h-3.5" /> PDF
                   </button>
                   <button onClick={exportCSV} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-lg text-[13px] font-medium text-slate-600  hover:bg-slate-50 shrink-0">
                     <Download className="w-3.5 h-3.5" /> CSV
                   </button>
                 </div>
               </div>
               <div className="text-[13px] font-medium text-slate-500 w-full sm:w-auto">Total: {paginatedLogs.length} Data</div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-[12px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-50/50">Timestamp</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-50/50">User</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-50/50">Aksi</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-50/50">Modul</th>
                      <th className="px-6 py-4 text-[12px] font-semibold text-slate-500 uppercase tracking-widest text-right bg-slate-50/50">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                        <td className="px-6 py-4 text-[13px] font-medium text-slate-500 whitespace-nowrap">{log.time}</td>
                        <td className="px-6 py-4 text-[14px] font-semibold text-slate-700 whitespace-nowrap">{log.user}</td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold uppercase tracking-widest whitespace-nowrap">{log.action}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded font-semibold uppercase tracking-widest whitespace-nowrap">{log.module}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-[12px] text-slate-400 whitespace-nowrap">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
             {totalPages > 1 && (
               <div className="p-4 flex items-center justify-center gap-2 border-t border-slate-100">
                 <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                   Prev
                 </button>
                 <span className="text-sm font-medium text-slate-600 px-2">Hal {currentPage} dari {totalPages}</span>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                   Next
                 </button>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
