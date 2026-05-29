import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  CheckSquare, 
  AlertCircle,
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  X,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useStore } from '../store/useStore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectQRCode } from '../components/ProjectQRCode';
import { ProjectDocuments } from '../components/ProjectDocuments';
import Papa from 'papaparse';

const COLUMNS = [
  { id: 'todo', label: 'To-Do', color: 'bg-primary-500' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-amber-500' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

export const ProjectManagement: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('tasks');
  const [searchTask, setSearchTask] = useState('');
  
  const currentUser = useStore(state => state.user);
  
  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat' || currentUser?.role === 'admin_daerah';
  const canDelete = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [taskToArchive, setTaskToArchive] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmittedAttempted, setFormSubmittedAttempted] = useState(false);

  const [formData, setFormData] = useState({ title: '', projectId: selectedProject, priority: 'Medium', date: '', status: 'todo', description: '', tags: '' });

  const validateForm = (data: typeof formData): boolean => {
    const errs: Record<string, string> = {};
    if (!data.title.trim()) errs.title = 'Judul task wajib diisi.';
    else if (data.title.trim().length < 5) errs.title = 'Judul task minimal 5 karakter.';
    
    if (!data.projectId) errs.projectId = 'Proyek wajib dipilih.';
    if (!data.date) errs.date = 'Tenggat waktu wajib diisi.';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    if (formSubmittedAttempted) validateForm(formData);
  }, [formData, formSubmittedAttempted]);

  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setProjectsList(items);
      if (items.length > 0 && !selectedProject) {
         setSelectedProject(items[0].id);
         setFormData(prev => ({ ...prev, projectId: items[0].id }));
      }
      setLoadingProjects(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoadingProjects(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setTasks(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete));
      setTaskToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && draggedTask) {
      if (statusId === 'done') {
        setTaskToArchive(taskId);
      } else {
        try {
          await setDoc(doc(db, 'tasks', taskId), { status: statusId }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'tasks');
        }
      }
    }
    setDraggedTask(null);
  };

  const handleOpenModal = (task?: any, columnId?: string) => {
    setErrors({});
    setFormSubmittedAttempted(false);
    if (task) {
      setEditingItem(task);
      setFormData({ 
        title: task.title || '', 
        projectId: task.projectId || selectedProject, 
        priority: task.priority || 'Medium', 
        date: task.date || '', 
        status: task.status || 'todo',
        description: task.description || '',
        tags: task.tags || ''
      });
    } else {
      setEditingItem(null);
      setFormData({ 
        title: '', 
        projectId: selectedProject, 
        priority: 'Medium', 
        date: new Date().toISOString().split('T')[0], 
        status: columnId || 'todo',
        description: '',
        tags: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittedAttempted(true);
    if (!validateForm(formData)) return;
    
    try {
      if (editingItem) {
        await setDoc(doc(db, 'tasks', editingItem.id), {
          ...formData, // projectId is submitted here
        }, { merge: true });
      } else {
        const newDocId = Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'tasks', newDocId), {
          ...formData,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    }
  };

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPriority, setFilterPriority] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20; // larger for kanban

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

  const fullyFilteredProjectTasks = tasks.filter(t => {
     let match = t.projectId === selectedProject && t.title?.toLowerCase().includes(searchTask.toLowerCase());
     
     // Filter by priority
     if (filterPriority !== 'Semua' && t.priority !== filterPriority) {
       match = false;
     }

     // Filter by Start/End Date
     if (t.date && match) {
       if (filterStartDate && t.date < filterStartDate) match = false;
       if (filterEndDate && t.date > filterEndDate) match = false;
     } else if ((filterStartDate || filterEndDate) && !t.date) {
       match = false;
     }
     return match;
  });

  const totalPages = Math.ceil(fullyFilteredProjectTasks.length / ITEMS_PER_PAGE);
  const projectTasks = fullyFilteredProjectTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportPDF = () => {
    const pdfDoc = new jsPDF();
    pdfDoc.text('Data Proyek ' + selectedProject, 14, 15);
    const tableData = fullyFilteredProjectTasks.map(t => [
      t.title, t.status, t.description || '-', t.date || '-', t.assignee || '-'
    ]);
    autoTable(pdfDoc, {
      head: [['Judul Task', 'Status', 'Deskripsi', 'Tanggal', 'Penanggung Jawab']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    pdfDoc.save('Data_Proyek.pdf');
  };

  const exportCSV = () => {
    const csvData = fullyFilteredProjectTasks.map(t => ({
      'Kawasan': selectedProject,
      'Judul Task': t.title,
      'Status': t.status,
      'Deskripsi': t.description || '-',
      'Tanggal': t.date || '-',
      'Penanggung Jawab': t.assignee || '-'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Data_Proyek.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
     setCurrentPage(1);
  }, [searchTask, filterStartDate, filterEndDate, filterPriority, selectedProject]);

  const taskStats = [
    { name: 'To-Do', value: fullyFilteredProjectTasks.filter(t => t.status === 'todo').length, color: '#3b82f6' },
    { name: 'In Progress', value: fullyFilteredProjectTasks.filter(t => t.status === 'in-progress').length, color: '#f59e0b' },
    { name: 'Done', value: fullyFilteredProjectTasks.filter(t => t.status === 'done').length, color: '#10b981' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-4 sm:space-y-6 flex flex-col min-h-[calc(100vh-140px)] lg:h-full">
      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Hapus Task"
        message="Apakah Anda yakin ingin menghapus task ini? Semua data terkait akan ikut terhapus."
        confirmText="Hapus Task"
      />

      {taskToArchive && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900">Task Selesai</h3>
              <p className="text-sm text-slate-500 mt-2">Apakah Anda ingin mengarsipkan task ini agar tidak muncul lagi di papan?</p>
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
               <button onClick={() => setTaskToArchive(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Batal</button>
               <button onClick={async () => {
                  try {
                    await setDoc(doc(db, 'tasks', taskToArchive), { status: 'done' }, { merge: true });
                  } catch(e: any) {
                    handleFirestoreError(e, OperationType.UPDATE, 'tasks');
                  }
                  setTaskToArchive(null);
               }} className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Tetap di Board</button>
               <button onClick={async () => {
                  try {
                    await setDoc(doc(db, 'tasks', taskToArchive), { status: 'archived' }, { merge: true });
                  } catch(e: any) {
                    handleFirestoreError(e, OperationType.UPDATE, 'tasks');
                  }
                  setTaskToArchive(null);
               }} className="px-4 py-2 text-xs font-bold text-white bg-primary-500 hover:bg-primary-500 rounded-lg transition-colors shadow-sm">Arsipkan Task</button>
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
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? 'Edit Task' : 'Tambah Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden" noValidate>
              <div id="form-scroll-container" className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Judul Task</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.title ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                  {errors.title && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.title}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Deskripsi</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" placeholder="Detail lengkap mengenai task ini..."></textarea>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Proyek / Lokasi</label>
                  <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.projectId ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")}>
                     <option value="">-- Pilih Proyek --</option>
                     {projectsList.map((p) => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                  </select>
                  {errors.projectId && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.projectId}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Label (Pisahkan dengan koma)</label>
                  <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" placeholder="Contoh: Frontend, UI/UX" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Prioritas</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                      <option value="todo">To-Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Tenggat Waktu</label>
                  <input required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} type="date" className={cn("w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none transition-colors", errors.date ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary-500")} />
                  {errors.date && <p className="text-[10px] text-red-500 px-1 font-medium">{errors.date}</p>}
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">Batal</button>
                 <button type="submit" className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all border-0 flex items-center justify-center gap-2">{editingItem ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Project Selector */}
      <div className="flex bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none p-1.5 overflow-x-auto no-scrollbar shrink-0">
        {projectsList.map(proj => (
          <button 
             key={proj.id}
             onClick={() => {
               setSelectedProject(proj.id);
               setFormData(prev => ({ ...prev, projectId: proj.id }));
             }}
             className={cn("px-4 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors", 
               selectedProject === proj.id ? "bg-primary-600 text-white shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
             )}
          >
            Kawasan {proj.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Project Management</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Pantau kemajuan infrastruktur dan adminstrasi lahan di Kawasan {selectedProject}.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center w-full lg:w-auto mt-4 lg:mt-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-2xs transition-all w-full sm:w-56 shrink-0">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={searchTask} onChange={e => setSearchTask(e.target.value)} type="text" placeholder="Cari task..." className="bg-transparent border-none outline-none text-[13px] font-semibold text-slate-700 focus:ring-0 w-full placeholder:font-normal placeholder-slate-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-705 outline-none focus:border-primary-500 cursor-pointer shadow-2xs">
                 <option value="Semua">Semua Prioritas</option>
                 <option value="Low">Rendah (Low)</option>
                 <option value="Medium">Sedang (Medium)</option>
                 <option value="High">Tinggi (High)</option>
              </select>
              <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 w-full shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Start</span>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold cursor-pointer w-full text-right lg:text-left focus:ring-0 min-w-[100px]" />
              </div>
              <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 w-full shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">End</span>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold cursor-pointer w-full text-right lg:text-left focus:ring-0 min-w-[100px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
              <button onClick={exportPDF} className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
                PDF
              </button>
              <button onClick={exportCSV} className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-all cursor-pointer">
                CSV
              </button>
            </div>
          </div>
          {canEdit && activeTab === 'tasks' && (
            <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold tracking-wide hover:bg-primary-700 transition-all shadow-[0_4px_12px_rgba(105,108,255,0.25)] shrink-0 mt-2 lg:mt-0 cursor-pointer">
              <Plus className="w-4 h-4" /> Task Baru
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6 border-b border-slate-200 px-2 shrink-0">
        <button 
           onClick={() => setActiveTab('overview')}
           className={cn("pb-3 text-[13px] font-semibold transition-colors flex items-center gap-2 border-b-2",
             activeTab === 'overview' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-400 hover:text-slate-600"
           )}
        >
          <LayoutDashboard className="w-4 h-4" /> Overview
        </button>
        <button 
           onClick={() => setActiveTab('tasks')}
           className={cn("pb-3 text-[13px] font-semibold transition-colors flex items-center gap-2 border-b-2",
             activeTab === 'tasks' ? "border-primary-600 text-primary-600" : "border-transparent text-slate-400 hover:text-slate-600"
           )}
        >
          <CheckSquare className="w-4 h-4" /> Tasks
          <span className={cn("px-1.5 py-0.5 rounded text-[11px]", activeTab === 'tasks' ? "bg-primary-500/10 text-primary-500" : "bg-slate-100 text-slate-500")}>
            {fullyFilteredProjectTasks.length}
          </span>
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 flex-1 overflow-y-auto no-scrollbar pb-6 content-start">
          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none">
              <h3 className="text-[14px] font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-500" />
                Progress Kawasan {selectedProject}
              </h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                  <span>Penyelesaian Tasks</span>
                  <span className="text-primary-500">{Math.round((fullyFilteredProjectTasks.filter(t => t.status === 'done').length / (fullyFilteredProjectTasks.length || 1)) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(fullyFilteredProjectTasks.filter(t => t.status === 'done').length / (fullyFilteredProjectTasks.length || 1)) * 100}%` }}
                    className="h-full bg-primary-500" />
                  </div>
              </div>
              
              {taskStats.length > 0 && (
                <div className="h-48 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#334155', fontSize: '12px', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            
             <div className="bg-white p-5 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none">
               <h3 className="text-[14px] font-semibold text-slate-700 mb-4">Informasi Proyek</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border-none shadow-[0_2px_4px_rgba(105,108,255,0.05)]">
                   <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1">Status Proyek</p>
                   <p className="text-[14px] font-semibold text-slate-700">Aktif</p>
                 </div>
                 <div className="p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg border-none shadow-[0_2px_4px_rgba(105,108,255,0.05)]">
                   <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1">Total Tasks</p>
                   <p className="text-[14px] font-semibold text-slate-700">{fullyFilteredProjectTasks.length} Task</p>
                 </div>
               </div>
             </div>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <ProjectQRCode 
              projectId={selectedProject} 
              projectName={`Kawasan ${selectedProject}`} 
            />
            <div className="bg-white p-5 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none">
              <h3 className="text-[14px] font-semibold text-slate-700 mb-4">Aktivitas Terkini</h3>
               {fullyFilteredProjectTasks.slice(0, 3).map((task, i) => (
                 <div key={task.id} className="mb-4 last:mb-0 relative pl-4 border-l-2 border-slate-100 pb-2">
                   <div className="absolute w-2 h-2 bg-primary-500rounded-full -left-[5px] top-1 border-2 border-white" />
                   <p className="text-[13px] font-semibold text-slate-700">{task.title}</p>
                   <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-widest">{task.status}</p>
                 </div>
               ))}
            </div>
            <ProjectDocuments projectId={selectedProject} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4 no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0 mt-4">
          <div className="flex gap-4 h-full min-w-max lg:min-w-0 lg:grid lg:grid-cols-3 items-start">
            {COLUMNS.map((col) => (
              <div 
                key={col.id} 
                className={cn("flex flex-col bg-slate-50/70 rounded-xl p-4 border-0 shadow-[0_4px_15px_rgba(0,0,0,0.015)] w-[280px] sm:w-[320px] lg:w-auto h-[65vh] lg:h-[calc(100vh-280px)] min-h-[400px] transition-colors duration-200",
                    draggedTask && !projectTasks.find(t => t.id === draggedTask && t.status === col.id) ? "bg-primary-500/10 border-dashed border-primary-500" : ""
                 )}
                 onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", col.color)} />
                  <h3 className="text-[13px] font-semibold text-slate-700 tracking-wide">{col.label}</h3>
                  <span className="bg-white shadow-sm border border-transparent text-[11px] font-semibold px-2 py-0.5 rounded text-slate-500">
                    {projectTasks.filter(t => t.status === col.id).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {projectTasks.filter(t => t.status === col.id).map((task) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, task.id)}
                    className={cn("bg-white p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.055)] transition-all group cursor-grab active:cursor-grabbing",
                       draggedTask === task.id ? "opacity-50 scale-95" : "opacity-100 scale-100"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3 group/header">
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap",
                        task.priority === 'High' ? "bg-red-50 text-red-500" : 
                        task.priority === 'Medium' ? "bg-amber-50 text-amber-500" : "bg-primary-500/10 text-primary-500")}>
                        {task.priority} Priority
                      </span>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover/header:opacity-100 transition-opacity">
                        {canEdit && (
                          <button 
                             onClick={() => handleOpenModal(task)}
                             className="text-slate-400 hover:text-primary-600 hover:bg-primary-600/10 p-1 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                             onClick={() => setTaskToDelete(task.id)}
                             className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h4 className="text-[13px] font-semibold text-slate-700 leading-tight mb-2 group-hover:text-primary-500transition-colors">{task.title}</h4>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{task.description}</p>
                    )}
                    {task.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.tags.split(',').map((tag: string, i: number) => {
                          const t = tag.trim();
                          if (!t) return null;
                          return (
                            <span key={i} className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{t}</span>
                          );
                        })}
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-widest truncate mr-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.date}</span>
                      </div>
                      <div className="flex -space-x-1.5 shrink-0">
                        {['A', 'B'].map((initial, i) => (
                           <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                             {initial}
                           </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {canEdit && (
                  <button onClick={() => handleOpenModal(null, col.id)} className="w-full py-3 border-2 border-dashed border-slate-300/80 rounded-lg text-slate-500 text-[13px] sm:text-[14px] font-bold hover:border-primary-500 hover:text-primary-600 bg-slate-100/50 hover:bg-primary-50/50 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Task
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
      
      {totalPages > 1 && activeTab === 'tasks' && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/50 shadow-xs w-full">
          <div className="text-xs sm:text-sm text-slate-500 font-medium">
            Menampilkan {Math.min(fullyFilteredProjectTasks.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} sampai {Math.min(fullyFilteredProjectTasks.length, currentPage * ITEMS_PER_PAGE)} dari {fullyFilteredProjectTasks.length} data
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
  );
};

