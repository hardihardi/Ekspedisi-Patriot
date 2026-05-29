import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Video, 
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  FileText,
  FileDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useStore } from '../store/useStore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { sendAppNotification } from '../lib/notifications';
import { NotificationGatewayModal } from '../components/NotificationGatewayModal';

// Helper to generate Google Calendar URL without signing in
export const getGoogleCalendarUrl = (item: {
  title: string;
  date: string;
  time: string;
  type: string;
  link?: string;
  attendeesList?: Array<{ name: string; email: string }>;
}) => {
  if (!item.date || !item.time) return 'https://calendar.google.com';

  const base = 'https://calendar.google.com/calendar/render';
  
  // Format dates: YYYYMMDDTHHMMSS
  const dateStr = item.date.replace(/-/g, ''); // -> YYYYMMDD
  const timeStr = item.time.replace(/:/g, '') + '00'; // -> HHMM00
  
  // Construct date time string local representation
  const startStamp = `${dateStr}T${timeStr}`;
  
  // Calculate end time (default to 1 hour later)
  const [hour, min] = item.time.split(':').map(Number);
  let endHour = hour + 1;
  let endDateStr = dateStr;
  
  if (endHour >= 24) {
    endHour = endHour - 24;
    // Advance end date by 1 day if we cross midnight
    const nextDay = new Date(new Date(item.date).getTime() + 24 * 60 * 60 * 1000);
    const yStr = nextDay.getFullYear();
    const mStr = String(nextDay.getMonth() + 1).padStart(2, '0');
    const dStr = String(nextDay.getDate()).padStart(2, '0');
    endDateStr = `${yStr}${mStr}${dStr}`;
  }
  
  const endHourStr = String(endHour).padStart(2, '0');
  const endMinStr = String(min).padStart(2, '0');
  const endStamp = `${endDateStr}T${endHourStr}${endMinStr}00`;
  
  const text = encodeURIComponent(item.title || 'Rapat Koordinasi');
  const dates = `${startStamp}/${endStamp}`;
  
  let detailsText = `Tipe Rapat: ${item.type || 'Online'}\n`;
  if (item.link) {
    detailsText += `Tautan Rapat: ${item.link}\n`;
  }
  if (item.attendeesList && item.attendeesList.length > 0) {
    detailsText += `\nPeserta:\n` + item.attendeesList.map((a: any) => `- ${a.name} (${a.email || '-'})`).join('\n');
  }
  
  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(item.link || item.type || '');
  
  let url = `${base}?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
  if (location) {
    url += `&location=${location}`;
  }
  
  if (item.attendeesList && item.attendeesList.length > 0) {
    const emails = item.attendeesList.filter((a: any) => a.email).map((a: any) => a.email).join(',');
    if (emails) {
      url += `&add=${encodeURIComponent(emails)}`;
    }
  }
  
  return url;
};

export const Meetings: React.FC = () => {
  const currentUser = useStore(state => state.user);
  const language = useStore(state => state.language);
  const isEn = language === 'en';

  const translateMtgType = (type: string) => {
    if (!isEn) return type;
    if (type === 'Online') return 'Online';
    if (type === 'Offline') return 'Offline';
    if (type === 'Hybrid') return 'Hybrid';
    return type;
  };

  const translateMtgStatus = (status: string) => {
    if (!isEn) return status;
    if (status === 'Completed') return 'Completed';
    if (status === 'Scheduled') return 'Scheduled';
    return status;
  };
  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat' || currentUser?.role === 'admin_daerah';
  const canDelete = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat' || currentUser?.role === 'admin_daerah';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Terjadwal' | 'Selesai'>('Terjadwal');
  
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  const [viewNotulenItem, setViewNotulenItem] = useState<any | null>(null);
  const [isNotulenModalOpen, setIsNotulenModalOpen] = useState(false);
  const [notulenContent, setNotulenContent] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedMark, setLastSavedMark] = useState<Date | null>(null);
  
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Notification Gateway visualizer states
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'idle' | 'sending' | 'success' | 'done'>('idle');
  const [gatewayEvent, setGatewayEvent] = useState<'complaint_created' | 'complaint_updated' | 'document_signed' | 'meeting_created' | 'system_alert' | null>(null);
  const [gatewayEmail, setGatewayEmail] = useState('');
  const [gatewayPhone, setGatewayPhone] = useState('');
  const [gatewaySubject, setGatewaySubject] = useState('');

  const [formData, setFormData] = useState<{
    title: string;
    date: string;
    time: string;
    type: string;
    link: string;
    attendeesList: Array<{name: string, email: string}>;
  }>({ 
    title: '', 
    date: '', 
    time: '', 
    type: 'Online', 
    link: '', 
    attendeesList: [],
  });

  const handleAddAttendee = () => {
    setFormData(prev => ({
      ...prev,
      attendeesList: [...prev.attendeesList, { name: '', email: '' }]
    }));
  };

  const handleAttendeeChange = (index: number, field: 'name' | 'email', value: string) => {
    const updatedList = [...formData.attendeesList];
    updatedList[index][field] = value;
    setFormData(prev => ({ ...prev, attendeesList: updatedList }));
  };

  const handleRemoveAttendee = (index: number) => {
    const updatedList = [...formData.attendeesList];
    updatedList.splice(index, 1);
    setFormData(prev => ({ ...prev, attendeesList: updatedList }));
  };

  useEffect(() => {
    const q = query(collection(db, 'meetings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetings');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({ 
        title: item.title || '', 
        date: item.date || '', 
        time: item.time || '', 
        type: item.type || 'Online', 
        link: item.link || '',
        attendeesList: item.attendeesList || []
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', date: '', time: '', type: 'Online', link: '', attendeesList: [] });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditNotulen = (item: any) => {
    setViewNotulenItem(null);
    setEditingItem(item);
    setNotulenContent(item.notulen || '');
    setLastSavedMark(null);
    setIsNotulenModalOpen(true);
  };

  useEffect(() => {
    if (!isNotulenModalOpen || !editingItem) return;
    
    // Only auto-save if content is actually present to prevent overwriting with initial empty state
    // before the state is populated, although this is guarded by modal state checking.
    const timeoutId = setTimeout(async () => {
      setIsSavingDraft(true);
      try {
        await setDoc(doc(db, 'meetings', editingItem.id), {
          notulen: notulenContent
        }, { merge: true });
        setLastSavedMark(new Date());
      } catch (error) {
        console.error("Auto-save failed", error);
      } finally {
        setIsSavingDraft(false);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [notulenContent, isNotulenModalOpen, editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncingCalendar(true);

    try {
      if (editingItem) {
        await setDoc(doc(db, 'meetings', editingItem.id), {
          title: formData.title,
          date: formData.date,
          time: formData.time,
          type: formData.type,
          link: formData.link,
          attendeesList: formData.attendeesList
        }, { merge: true });
      } else {
        const newDocId = Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'meetings', newDocId), {
           title: formData.title,
           date: formData.date,
           time: formData.time,
           type: formData.type,
           link: formData.link,
           attendeesList: formData.attendeesList,
           status: 'Scheduled',
           notulen: ''
        });
      }

      // Real-time dispatch of meeting announcement through Fonnte & SMTP gateways with gateway tracking
      const firstAttendee = formData.attendeesList?.[0];
      const emailsList = formData.attendeesList?.map(a => a.email).filter(Boolean).join(', ') || '';
      
      setIsGatewayOpen(true);
      setGatewayStatus('sending');
      setGatewayEvent('meeting_created');
      setGatewayEmail(emailsList || firstAttendee?.email || 'peserta@kawasan-3t.id');
      setGatewayPhone('628123456789'); // falls back to default notification contact
      setGatewaySubject(formData.title);

      try {
        await sendAppNotification('meeting_created', {
          meetingTitle: formData.title,
          meetingDate: formData.date,
          meetingTime: formData.time,
          meetingLocation: formData.type === 'Online' ? formData.link : 'Kawasan 3T Terkait (Offline)'
        });
        setGatewayStatus('done');
      } catch (notifyErr) {
        console.error('Trigger meeting scheduling announcement failed:', notifyErr);
        setGatewayStatus('done');
      }

      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'meetings');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleNotulenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await setDoc(doc(db, 'meetings', editingItem.id), {
        notulen: notulenContent
      }, { merge: true });
      setIsNotulenModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'meetings');
    }
  };

  const confirmDelete = (id: string) => {
     setItemToDelete(id);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'meetings', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, 'meetings');
    }
  };

  const handleMarkAsCompleted = async (id: string) => {
     try {
       await setDoc(doc(db, 'meetings', id), {
         status: 'Completed'
       }, { merge: true });
     } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'meetings');
     }
  };

  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const fullyFilteredMeetings = meetings.filter(c => {
    const isMatchTab = activeTab === 'Terjadwal' ? c.status !== 'Completed' : c.status === 'Completed';
    let match = isMatchTab && c.title?.toLowerCase().includes(search.toLowerCase());
    
    if (c.date && match) {
      const dateParts = c.date.split('-');
      if (dateParts.length >= 2) {
         if (filterYear && dateParts[0] !== filterYear) match = false;
         if (filterMonth && parseInt(dateParts[1], 10).toString() !== filterMonth) match = false;
      }
    }
    return match;
  }).sort((a, b) => {
      const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`);
      if (activeTab === 'Terjadwal') {
         return dateA.getTime() - dateB.getTime();
      }
      return dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(fullyFilteredMeetings.length / ITEMS_PER_PAGE);
  const paginatedMeetings = fullyFilteredMeetings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportPDF = () => {
    const pdfDoc = new jsPDF();
    pdfDoc.text('Data Rapat', 14, 15);
    const tableData = fullyFilteredMeetings.map(t => [
      t.title, t.date || '-', t.time || '-', t.type || 'Virtual', t.status || 'Terjadwal'
    ]);
    autoTable(pdfDoc, {
      head: [['Judul Rapat', 'Tanggal', 'Waktu', 'Tipe', 'Status']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    pdfDoc.save('Data_Rapat.pdf');
  };

  const exportCSV = () => {
    const csvData = fullyFilteredMeetings.map(t => ({
      'Judul Rapat': t.title,
      'Tanggal': t.date || '-',
      'Waktu': t.time || '-',
      'Tipe': t.type || 'Virtual',
      'Status': t.status || 'Terjadwal',
      'Link/Lokasi': t.link || '-'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Data_Rapat.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
     setCurrentPage(1);
  }, [search, filterMonth, filterYear, activeTab]);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={isEn ? "Delete Meeting" : "Hapus Rapat"}
        message={isEn ? "Are you sure you want to delete this meeting schedule? This action cannot be undone." : "Apakah Anda yakin ingin menghapus jadwal rapat ini? Tindakan ini tidak dapat dibatalkan."}
        confirmText={isEn ? "Delete Meeting" : "Hapus Rapat"}
      />

      <NotificationGatewayModal
        isOpen={isGatewayOpen}
        onClose={() => setIsGatewayOpen(false)}
        status={gatewayStatus}
        event={gatewayEvent}
        recipientEmail={gatewayEmail}
        recipientPhone={gatewayPhone}
        subject={gatewaySubject}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl flex flex-col max-h-[90vh]"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? (isEn ? 'Edit Meeting' : 'Edit Rapat') : (isEn ? 'New Schedule' : 'Jadwal Baru')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Meeting Title" : "Judul Rapat"}</label>
                   <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Date" : "Tanggal"}</label>
                    <input required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Time" : "Jam"}</label>
                    <input required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} type="time" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Meeting Type" : "Tipe Rapat"}</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600">
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Meeting Link (Optional)" : "Link Rapat (Opsional)"}</label>
                    <input value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} type="url" placeholder="https://zoom.us/j/..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600" />
                  </div>
                </div>

                <div className="border-0 rounded-xl p-3.5 bg-slate-50/70 space-y-2 text-slate-500">
                  <div className="flex items-start gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">{isEn ? "Calendar Sync Active" : "Sinkronisasi Kalender Aktif"}</span>
                      <p className="text-[11px] leading-relaxed font-medium text-slate-500">
                        {isEn ? (
                          <>The system supports instant calendar synchronization without requiring a Google sign-in. Once a meeting is scheduled, you can add it directly to your calendar by clicking the <strong>"Google Cal"</strong> button on the meeting list.</>
                        ) : (
                          <>Sistem mendukung sinkronisasi agenda kalender instan tanpa memerlukan proses login akun Google. Setelah jadwal rapat dibuat, Anda dapat langsung menyalinnya ke kalender Anda dengan mengeklik tombol <strong>"Google Cal"</strong> pada daftar rapat.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-emerald-100 rounded-xl p-3.5 bg-emerald-50/45 space-y-2 text-slate-500 text-left">
                  <div className="flex items-start gap-2 text-slate-700">
                    <MessageSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-850 block">Sinkronisasi Notifikasi Aktif</span>
                      <p className="text-[11px] leading-relaxed font-semibold text-emerald-700">
                        Sistem terintegrasi secara real-time dengan WhatsApp Gateway (Fonnte) & Email SMTP Server. Rincian undangan rapat akan langsung dipancarkan kepada peserta terdaftar begitu jadwal baru tersimpan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Meeting Attendees" : "Peserta Rapat"}</label>
                    <button type="button" onClick={handleAddAttendee} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 uppercase tracking-widest bg-primary-50 px-2 py-1 rounded">
                       <Plus className="w-3 h-3" /> {isEn ? "Add" : "Tambah"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.attendeesList.map((attendee, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 p-2 sm:p-0 sm:bg-transparent rounded-lg border-0 sm:border-none">
                        <input 
                          type="text" 
                          placeholder={isEn ? "Attendee Name" : "Nama Peserta"} 
                          value={attendee.name}
                          onChange={(e) => handleAttendeeChange(index, 'name', e.target.value)}
                          className="w-full sm:flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600"
                          required
                        />
                        <input 
                          type="email" 
                          placeholder={isEn ? "Attendee Email" : "Email Peserta"} 
                          value={attendee.email}
                          onChange={(e) => handleAttendeeChange(index, 'email', e.target.value)}
                          className="w-full sm:flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-600"
                          required
                        />
                        <button type="button" onClick={() => handleRemoveAttendee(index)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold w-full sm:w-auto mt-1 sm:mt-0 bg-red-50/50 sm:bg-transparent">
                          <Trash2 className="w-4 h-4" /> <span className="sm:hidden uppercase tracking-wider">{isEn ? "Delete" : "Hapus"}</span>
                        </button>
                      </div>
                    ))}
                    {formData.attendeesList.length === 0 && (
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg">{isEn ? "No attendees listed yet" : "Belum ada peserta"}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white rounded-b-2xl">
                 <button type="button" disabled={syncingCalendar} onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 disabled:opacity-50">{isEn ? "Cancel" : "Batal"}</button>
                 <button type="submit" disabled={syncingCalendar} className="px-4 py-2 text-xs md:text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
                   {syncingCalendar && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                   {editingItem ? (isEn ? 'Save' : 'Simpan') : (isEn ? 'Create' : 'Buat')}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {viewNotulenItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{viewNotulenItem.title} - {isEn ? "Minutes" : "Notulen"}</h3>
              <button onClick={() => setViewNotulenItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 min-h-0">
               <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                   <Clock className="w-3.5 h-3.5 text-slate-400" /> {viewNotulenItem.date} {viewNotulenItem.time}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                   <Video className="w-3.5 h-3.5 text-slate-400" /> {translateMtgType(viewNotulenItem.type)}
                 </div>
               </div>
               <div className="bg-slate-50 rounded-xl p-4 border-0 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-mono">
                 {viewNotulenItem.notulen || (isEn ? "There are no minutes recorded for this meeting yet." : "Belum ada catatan notulen untuk rapat ini.")}
               </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end shrink-0 bg-white rounded-b-2xl gap-2">
              <button className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 flex items-center gap-2">
                <FileDown className="w-3.5 h-3.5" /> {isEn ? "Download" : "Unduh"}
              </button>
              <button onClick={() => handleOpenEditNotulen(viewNotulenItem)} className="px-4 py-2 text-xs md:text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
                 <Edit2 className="w-3.5 h-3.5" /> {isEn ? "Edit Minutes" : "Edit Notulen"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isNotulenModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <h3 className="text-lg font-bold text-slate-900">{isEn ? "Write Minutes:" : "Tulis Notulen:"} {editingItem?.title}</h3>
              <button onClick={() => setIsNotulenModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleNotulenSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{isEn ? "Minutes / Discussion Summary" : "Notulen / Catatan Hasil"}</label>
                  <textarea required value={notulenContent} onChange={e => setNotulenContent(e.target.value)} rows={12} placeholder={isEn ? "Write key points, decisions, and follow-ups of the meeting..." : "Tuliskan poin penting hasil rapat, keputusan, dan tindak lanjut..."} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-600 custom-scrollbar min-h-[250px] leading-relaxed resize-y"></textarea>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-between gap-2 shrink-0 bg-white rounded-b-2xl">
                 <div className="text-xs text-slate-400 font-medium flex items-center">
                    {isSavingDraft ? (isEn ? "Saving draft..." : 'Menyimpan draf...') : lastSavedMark ? (isEn ? `Draft saved ${lastSavedMark.toLocaleTimeString('en-US')}` : `Draf tersimpan ${lastSavedMark.toLocaleTimeString('id-ID')}`) : ''}
                 </div>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setIsNotulenModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">{isEn ? "Cancel" : "Batal"}</button>
                    <button type="submit" className="px-4 py-2 text-xs md:text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">{isEn ? "Save Minutes" : "Simpan Notulen"}</button>
                 </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}


      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{isEn ? "Meetings & Minutes" : "Rapat & Notulen"}</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{isEn ? "Cross-agency coordination schedule and archived meeting minutes." : "Jadwal koordinasi lintas instansi dan arsip notulen."}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-3 sm:mt-0">
          <button onClick={exportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all ">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={exportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all ">
            <FileDown className="w-3.5 h-3.5" /> CSV
          </button>
          {canEdit && (
            <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-[13px] font-semibold tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)]">
              <Plus className="w-4 h-4" /> {isEn ? "Schedule" : "Jadwalkan"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: isEn ? 'Total Meetings' : 'Total Rapat', value: meetings.length, color: 'text-slate-700', bg: 'bg-white', iconbg: 'bg-slate-50' },
          { label: isEn ? 'Scheduled' : 'Terjadwal', value: meetings.filter(m => m.status !== 'Completed').length, color: 'text-primary-500', bg: 'bg-white', iconbg: 'bg-primary-50' },
          { label: isEn ? 'Completed' : 'Selesai', value: meetings.filter(m => m.status === 'Completed').length, color: 'text-emerald-500', bg: 'bg-white', iconbg: 'bg-emerald-50' },
        ].map((stat, i) => (
           <div key={i} className={cn("p-4 sm:p-5 rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-0 flex flex-col justify-between", stat.bg)}>
             <div className="flex items-center gap-2 sm:gap-3 mb-2">
               <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0", stat.iconbg, stat.color)}>
                 <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
               </div>
               <p className="text-[11px] sm:text-[13px] font-bold tracking-wide uppercase text-slate-500">{stat.label}</p>
             </div>
             <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{stat.value}</h3>
           </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none mb-4 shrink-0">
          <div className="flex bg-slate-50 p-1 rounded-lg">
             <button onClick={() => setActiveTab('Terjadwal')} className={cn("px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all flex items-center gap-2", activeTab === 'Terjadwal' ? "bg-white text-primary-600 shadow-[0_2px_4px_rgba(105,108,255,0.1)]" : "text-slate-500 hover:text-slate-700")}>
               <Calendar className="w-4 h-4" /> {isEn ? "Scheduled" : "Terjadwal"}
             </button>
             <button onClick={() => setActiveTab('Selesai')} className={cn("px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all flex items-center gap-2", activeTab === 'Selesai' ? "bg-white text-emerald-500 shadow-[0_2px_4px_rgba(113,221,55,0.1)]" : "text-slate-500 hover:text-slate-700")}>
               <FileText className="w-4 h-4" /> {isEn ? "Minutes / Done" : "Notulen/Selesai"}
             </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex flex-1 md:flex-none items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-transparent focus-within:bg-white focus-within:border-primary-600 focus-within:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder={isEn ? "Search..." : "Cari..."} className="bg-transparent border-none outline-none text-[14px] text-slate-600 focus:ring-0 w-full" />
            </div>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:bg-white focus:border-primary-500">
               <option value="">{isEn ? "Month" : "Bulan"}</option>
               {Array.from({length: 12}, (_, i) => (<option key={i+1} value={String(i+1)}>{new Date(0, i).toLocaleString(isEn ? 'en-US' : 'id-ID', {month: 'long'})}</option>))}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 bg-slate-50 border border-transparent rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:bg-white focus:border-primary-500">
               <option value="">{isEn ? "Year" : "Tahun"}</option>
               <option value="2024">2024</option>
               <option value="2025">2025</option>
               <option value="2026">2026</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
          {loading ? (
             <div className="flex items-center justify-center h-32">
               <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : paginatedMeetings.length === 0 ? (
             <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs font-medium text-slate-400 uppercase tracking-widest mt-4">{isEn ? "No search results" : "Pencarian kosong"}</div>
          ) : (
            <div className="space-y-3">
              {paginatedMeetings.map((mtg, i) => (
            <motion.div
              key={mtg.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn("bg-white p-4 sm:p-5 rounded-xl shadow-[0_2px_4px_rgba(105,108,255,0.05)] border-none transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4", activeTab === 'Terjadwal' ? "hover:shadow-[0_2px_6px_0_rgba(105,108,255,0.12)]" : "hover:shadow-[0_2px_6px_0_rgba(113,221,55,0.12)]" )}
            >
              <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                <div className={cn("shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-lg flex flex-col items-center justify-center", activeTab === 'Terjadwal' ? "bg-primary-50 text-primary-600" : "bg-emerald-50 text-emerald-500")}>
                  {activeTab === 'Terjadwal' ? <Calendar className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5" /> : <FileText className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5" />}
                  <span className="text-[7px] sm:text-[9px] font-semibold uppercase tracking-wider">
                    {mtg.date ? new Date(mtg.date).toLocaleDateString(isEn ? 'en-US' : 'id-ID', { month: 'short' }) : '-'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("text-[14px] font-semibold transition-colors line-clamp-1", activeTab === 'Terjadwal' ? "text-slate-700 group-hover:text-primary-600" : "text-slate-700 group-hover:text-emerald-500")}>{mtg.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" /> {mtg.date} • {mtg.time}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                      <Video className="w-3.5 h-3.5" /> {mtg.type}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                      <Users className="w-3.5 h-3.5" /> {mtg.attendeesList?.length || 0} {isEn ? "Attendees" : "Peserta"}
                    </div>
                    {activeTab === 'Selesai' && (
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded", mtg.notulen ? "text-emerald-500 bg-emerald-50" : "text-amber-500 bg-amber-50")}>
                        {mtg.notulen ? (isEn ? 'Minutes Available' : 'Notulen Tersedia') : (isEn ? 'Not Written' : 'Belum Ditulis')}
                      </span>
                    )}
                  </div>
                  {activeTab === 'Terjadwal' && mtg.attendeesList && mtg.attendeesList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mtg.attendeesList.slice(0, 3).map((att: any, idx: number) => (
                        <span key={idx} className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider" title={att.email}>
                          {att.name}
                        </span>
                      ))}
                      {mtg.attendeesList.length > 3 && (
                        <span className="bg-slate-50 text-slate-400 border-0 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">
                          +{mtg.attendeesList.length - 3} {isEn ? "more" : "lagi"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto mt-2 md:mt-0">
                {activeTab === 'Terjadwal' ? (
                  <>
                    <button 
                      onClick={() => window.open(getGoogleCalendarUrl(mtg), '_blank')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 border border-transparent px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all shadow-sm cursor-pointer"
                      title={isEn ? "Sync meeting schedule to Google Calendar" : "Sinkronkan jadwal rapat ke Google Calendar"}
                    >
                      <Calendar className="w-3.5 h-3.5 text-primary-600 shrink-0" /> Google Cal
                    </button>
                    <button onClick={() => mtg.link && window.open(mtg.link, '_blank')} className={cn("flex-1 md:flex-none flex items-center justify-center gap-1.5 text-slate-600 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ", mtg.link ? "hover:text-primary-600 hover:border-primary-600" : "bg-slate-50 text-slate-400 cursor-not-allowed border-transparent")}>
                      <ExternalLink className="w-3.5 h-3.5" /> {isEn ? "Join" : "Gabung"}
                    </button>
                    {canEdit && (
                      <button onClick={() => handleMarkAsCompleted(mtg.id)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)]">
                        <CheckCircle className="w-3.5 h-3.5" /> {isEn ? "Done" : "Selesai"}
                      </button>
                    )}
                    <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity space-x-1 shrink-0 ml-2">
                       {canEdit && (
                         <button onClick={() => handleOpenModal(mtg)} className="px-2 py-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-[12px] font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-md transition-all flex items-center gap-1.5 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] border-0 active:scale-95"><Edit2 className="w-4 h-4" /></button>
                       )}
                       {canDelete && (
                         <button onClick={() => setItemToDelete(mtg.id)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-all"><Trash2 className="w-4 h-4" /></button>
                       )}
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={() => setViewNotulenItem(mtg)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white text-slate-600 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:text-primary-600 hover:border-primary-600 transition-all border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] ">
                      <FileText className="w-3.5 h-3.5" /> {isEn ? "View" : "Lihat"}
                    </button>
                    {canEdit && (
                       <button onClick={() => handleOpenEditNotulen(mtg)} className={cn("flex-1 sm:w-auto md:flex-none flex items-center justify-center gap-1.5 text-white px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all shadow-sm active:scale-95", mtg.notulen ? "bg-primary-600 hover:bg-primary-700" : "bg-emerald-500 hover:bg-[#66c732]")}>
                        <Edit2 className="w-3.5 h-3.5" /> {mtg.notulen ? (isEn ? 'Edit' : 'Edit') : (isEn ? 'Write' : 'Tulis')}
                      </button>
                    )}
                    <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity space-x-1 shrink-0 ml-2">
                       {canDelete && (
                         <button onClick={() => setItemToDelete(mtg.id)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-all"><Trash2 className="w-4 h-4" /></button>
                       )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
          </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
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


