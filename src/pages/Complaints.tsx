import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, AlertCircle, CheckCircle2, Search, Filter, Plus, MapPin, Trash2, Edit2, X, Send, Clock, UserRound, FileText, Phone, MessageCircle, Image as ImageIcon, UploadCloud, Locate, CornerUpLeft, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useStore } from '../store/useStore';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { sendAppNotification } from '../lib/notifications';
import { NotificationGatewayModal } from '../components/NotificationGatewayModal';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

export const Complaints: React.FC = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const geographies = projects.length > 0 ? projects : MASTER_LOKASI_FALLBACK;
  const [search, setSearch] = useState('');
  
  const currentUser = useStore(state => state.user);
  const canEdit = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat' || currentUser?.role === 'admin_daerah';
  const canDelete = currentUser?.role === 'superadmin' || currentUser?.role === 'admin_pusat' || currentUser?.role === 'admin_daerah';

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [replyToDeleteIndex, setReplyToDeleteIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Notification Gateway visualizer states
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'idle' | 'sending' | 'success' | 'done'>('idle');
  const [gatewayEvent, setGatewayEvent] = useState<'complaint_created' | 'complaint_updated' | 'document_signed' | 'meeting_created' | 'system_alert' | null>(null);
  const [gatewayEmail, setGatewayEmail] = useState('');
  const [gatewayPhone, setGatewayPhone] = useState('');
  const [gatewaySubject, setGatewaySubject] = useState('');

  // New States and Refs for Evidence Photos and Geolocation
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialFormState = { 
    subject: '', 
    description: '',
    category: 'Infrastruktur', 
    status: 'Open', 
    priority: 'Medium', 
    user: currentUser?.displayName || 'Admin Daerah',
    phone: '',
    email: '',
    location: 'Kawasan Merauke',
    lat: '',
    lng: '',
    evidenceUrl: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Auto-save untuk laporan baru
  useEffect(() => {
    if (isModalOpen && !editingItem) {
      localStorage.setItem('draft_new_complaint', JSON.stringify(formData));
    }
  }, [formData, isModalOpen, editingItem]);

  useEffect(() => {
    const q = query(collection(db, 'complaints'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setComplaints(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
      setLoading(false);
    });

    const pq = query(collection(db, 'projects'));
    const unsubProjects = onSnapshot(pq, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(items);
    });

    return () => {
      unsubscribe();
      unsubProjects();
    };
  }, []);

  const handleOpenModal = (item?: any) => {
    setEvidenceFile(null);
    setEvidencePreview(null);
    setGeoError(null);
    if (item) {
      setEditingItem(item);
      setFormData({ 
        subject: item.subject || '', 
        description: item.description || '',
        category: item.category || 'Infrastruktur', 
        status: item.status || 'Open', 
        priority: item.priority || 'Medium', 
        user: item.user || currentUser?.displayName || 'Admin Daerah',
        phone: item.phone || '',
        email: item.email || '',
        location: item.location || '',
        lat: item.lat || '',
        lng: item.lng || '',
        evidenceUrl: item.evidenceUrl || ''
      });
      if (item.evidenceUrl) {
        setEvidencePreview(item.evidenceUrl);
      }
      const matchingGeog = geographies.find(g => g.name === item.location);
      setSelectedRegion(matchingGeog ? matchingGeog.region : '');
    } else {
      setEditingItem(null);
      const savedDraft = localStorage.getItem('draft_new_complaint');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed);
          if (parsed.evidenceUrl) {
            setEvidencePreview(parsed.evidenceUrl);
          }
          const matchingGeog = geographies.find(g => g.name === parsed.location);
          setSelectedRegion(matchingGeog ? matchingGeog.region : '');
        } catch (e) {
          setFormData(initialFormState);
          setSelectedRegion('');
        }
      } else {
        setFormData(initialFormState);
        setSelectedRegion('');
      }
    }
    setIsModalOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolokasi tidak didukung oleh browser Anda.");
      return;
    }
    setGeolocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: String(position.coords.latitude.toFixed(6)),
          lng: String(position.coords.longitude.toFixed(6))
        }));
        setGeolocating(false);
      },
      (err) => {
        console.error("Geolocation Error:", err);
        setGeoError("Gagal mengambil lokasi fisik. Berikan izin lokasi browser Anda.");
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      // Server-side location validation
      if (formData.lat && formData.lng) {
        const valRes = await fetch('/api/validate-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: formData.lat, lng: formData.lng, kawasan: formData.location })
        });
        const valData = await valRes.json();
        if (!valData.valid) {
          alert('Validasi Koordinat Gagal: ' + valData.error);
          setUploading(false);
          return;
        }
      }

      const ticketId = editingItem ? editingItem.id : `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      let finalEvidenceUrl = formData.evidenceUrl || '';

      if (evidenceFile) {
        try {
          const fileExt = evidenceFile.name.split('.').pop() || 'jpg';
          const storageRef = ref(storage, `complaints/${ticketId}/evidence.${fileExt}`);
          await uploadBytes(storageRef, evidenceFile);
          finalEvidenceUrl = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.warn("Storage upload failed, attempting Base64 fallback:", uploadErr);
          // Fallback to Base64 representation to ensure it always works
          finalEvidenceUrl = evidencePreview || '';
        }
      }

      const updatedFormData = {
        ...formData,
        evidenceUrl: finalEvidenceUrl
      };

      if (editingItem) {
        await setDoc(doc(db, 'complaints', ticketId), updatedFormData, { merge: true });
        
        // Notify edit changes with live gateway tracking
        setIsGatewayOpen(true);
        setGatewayStatus('sending');
        setGatewayEvent('complaint_updated');
        setGatewayEmail(updatedFormData.email || '');
        setGatewayPhone(updatedFormData.phone || '');
        setGatewaySubject(updatedFormData.subject);

        try {
          await sendAppNotification('complaint_updated', {
            ticketId,
            user: updatedFormData.user,
            phone: updatedFormData.phone,
            recipientEmail: updatedFormData.email || '',
            subject: updatedFormData.subject,
            status: updatedFormData.status,
            replyMessage: 'Data laporan Anda diperbarui oleh Admin Pengaduan Terpadu.'
          });
          setGatewayStatus('done');
        } catch (nErr) {
          console.error('Trigger update modification notification failed:', nErr);
          setGatewayStatus('done');
        }

        // Update local preview if it's currently open
        if (previewItem && previewItem.id === editingItem.id) {
           setPreviewItem({ ...previewItem, ...updatedFormData });
        }
      } else {
        await setDoc(doc(db, 'complaints', ticketId), {
          ...updatedFormData,
          createdAt: new Date().toISOString(),
          date: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          userId: currentUser?.uid || 'unknown'
        });

        // Notify new creation from admin with live gateway tracking
        setIsGatewayOpen(true);
        setGatewayStatus('sending');
        setGatewayEvent('complaint_created');
        setGatewayEmail(updatedFormData.email || '');
        setGatewayPhone(updatedFormData.phone || '');
        setGatewaySubject(updatedFormData.subject);

        try {
          await sendAppNotification('complaint_created', {
            ticketId,
            user: updatedFormData.user,
            phone: updatedFormData.phone,
            recipientEmail: updatedFormData.email || '',
            category: updatedFormData.category,
            priority: updatedFormData.priority,
            location: updatedFormData.location,
            subject: updatedFormData.subject,
            description: updatedFormData.description
          });
          setGatewayStatus('done');
        } catch (nErr) {
          console.error('Trigger manual creation notification failed:', nErr);
          setGatewayStatus('done');
        }

        localStorage.removeItem('draft_new_complaint');
      }
      setIsModalOpen(false);
      setEvidenceFile(null);
      setEvidencePreview(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'complaints');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'complaints', itemToDelete));
      if (previewItem?.id === itemToDelete) {
        setPreviewItem(null);
      }
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'complaints');
    }
  };

  const filteredComplaints = complaints.filter(c => 
    c.subject?.toLowerCase().includes(search.toLowerCase()) || 
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const activePreview = previewItem ? complaints.find(c => c.id === previewItem.id) || previewItem : null;
  const mappedProject = activePreview ? projects.find(p => p.name?.toLowerCase() === activePreview.location?.toLowerCase() || p.name?.toLowerCase().includes(activePreview.location?.toLowerCase()) || activePreview.location?.toLowerCase().includes(p.name?.toLowerCase())) : null;

  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const fullyFilteredComplaints = filteredComplaints.filter(c => {
     let match = true;
     if (filterCategory && c.category !== filterCategory) match = false;
     if (filterStatus && c.status !== filterStatus) match = false;
     
     if (c.createdAt) {
       const date = new Date(c.createdAt);
       const month = (date.getMonth() + 1).toString();
       const year = date.getFullYear().toString();
       
       if (filterMonth && month !== filterMonth) match = false;
       if (filterYear && year !== filterYear) match = false;
     }
     
     return match;
  });

  const totalPages = Math.ceil(fullyFilteredComplaints.length / ITEMS_PER_PAGE);
  const paginatedComplaints = fullyFilteredComplaints.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Data Pengaduan', 14, 15);
    const tableData = fullyFilteredComplaints.map(t => [
      t.subject, t.category, t.status, t.priority, t.user, t.location
    ]);
    autoTable(doc, {
      head: [['Subjek', 'Kategori', 'Status', 'Prioritas', 'Pelapor', 'Lokasi']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    doc.save('Data_Pengaduan.pdf');
  };

  const exportCSV = () => {
    const csvData = fullyFilteredComplaints.map(t => ({
      'Subjek': t.subject,
      'Kategori': t.category,
      'Status': t.status,
      'Prioritas': t.priority,
      'Pelapor': t.user,
      'Lokasi': t.location,
      'Deskripsi': t.description
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Data_Pengaduan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterStatus, filterMonth, filterYear]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activePreview) return;

    const messageToSend = replyMessage;

    try {
      const newReply = {
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.displayName || 'Admin Daerah',
        message: messageToSend,
        date: new Date().toISOString()
      };

      const newStatus = activePreview.status === 'Open' ? 'In Review' : activePreview.status;

      await setDoc(doc(db, 'complaints', activePreview.id), {
        replies: [...(activePreview.replies || []), newReply],
        status: newStatus
      }, { merge: true });

      // Live notification dispatch to Fonnte and SMTP channels with gateway tracking
      setIsGatewayOpen(true);
      setGatewayStatus('sending');
      setGatewayEvent('complaint_updated');
      setGatewayEmail(activePreview.email || '');
      setGatewayPhone(activePreview.phone || '');
      setGatewaySubject(activePreview.subject || '');

      try {
        await sendAppNotification('complaint_updated', {
          ticketId: activePreview.id,
          user: activePreview.user,
          phone: activePreview.phone,
          recipientEmail: activePreview.email || '',
          subject: activePreview.subject,
          status: newStatus,
          replyMessage: messageToSend
        });
        setGatewayStatus('done');
      } catch (notifyErr) {
        console.error('Trigger reply notification failed:', notifyErr);
        setGatewayStatus('done');
      }

      setReplyMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    }
  };

  const handleDeleteReply = async (replyIndex: number) => {
    if (!activePreview) return;
    try {
      const updatedReplies = [...(activePreview.replies || [])];
      updatedReplies.splice(replyIndex, 1);
      
      // Update local state directly so the user gets immediate visual update
      setPreviewItem({
        ...activePreview,
        replies: updatedReplies
      });

      await setDoc(doc(db, 'complaints', activePreview.id), {
        replies: updatedReplies
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    }
  };
  
  const generateGoogleMessageLink = (phone: string, subject: string) => {
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const text = encodeURIComponent(`Halo, ini balasan terkait tiket pengaduan: "${subject}".`);
    // 'sms:' scheme usually opens Google Messages natively on Android.
    // For rich RCS or web-based workflows, we can fallback to whatsapp or native intent
    return `sms:${formattedPhone}?body=${text}`;
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Laporan"
        message="Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Laporan"
      />

      <ConfirmDialog
        isOpen={replyToDeleteIndex !== null}
        onClose={() => setReplyToDeleteIndex(null)}
        onConfirm={() => {
          if (replyToDeleteIndex !== null) {
            handleDeleteReply(replyToDeleteIndex);
          }
        }}
        title="Hapus Balasan"
        message="Apakah Anda yakin ingin menghapus balasan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Balasan"
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

      <AnimatePresence>
      {activePreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col md:flex-row h-[95vh] md:h-[85vh] overflow-hidden"
          >
            {/* Left Sidebar: Complaint Info - Scrollable on mobile, fixed width on desktop */}
            <div className="w-full md:w-[350px] bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 max-h-[35vh] md:max-h-none h-auto md:h-full">
               <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white z-10 sticky top-0 shrink-0">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-500" /> Detail Laporan
                  </h3>
                  <button onClick={() => setPreviewItem(null)} className="md:hidden text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="p-4 sm:p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-4 md:pb-5">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3 leading-snug">{activePreview.subject}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                        activePreview.status === 'Open' ? "bg-red-50 text-red-600 border-red-100" :
                        activePreview.status === 'Resolved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>{activePreview.status}</span>
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                        activePreview.priority === 'High' ? "bg-red-50 text-red-600 border-red-100" : 
                        activePreview.priority === 'Low' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>{activePreview.priority} Priority</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full pt-1">
                    {canEdit && (
                       <button 
                         onClick={() => handleOpenModal(activePreview)} 
                         className="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs sm:text-[13px] shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] uppercase tracking-widest transition-all active:scale-95 border-0"
                       >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Laporan
                       </button>
                    )}
                    {canDelete && (
                       <button 
                         onClick={() => setItemToDelete(activePreview.id)} 
                         className="flex-1 px-4 py-2.5 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-650 text-white rounded-xl font-bold text-xs sm:text-[13px] shadow-md uppercase tracking-widest transition-all active:scale-95 border-0"
                       >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus Laporan
                       </button>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-4  space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5"/> Pelapor</p>
                      <p className="text-[13px] font-semibold text-slate-800">{activePreview.user}</p>
                      {activePreview.phone && (
                        <div className="mt-2 text-[12px] flex items-center justify-between bg-slate-50 rounded-lg p-2 border-0">
                          <span className="font-medium text-slate-600">{activePreview.phone}</span>
                          <a href={generateGoogleMessageLink(activePreview.phone, activePreview.subject)} className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider text-primary-500 bg-primary-50 border border-primary-500/20 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors shadow-sm">
                            <MessageCircle className="w-3.5 h-3.5" /> SMS / Message
                          </a>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Kategori</p>
                      <p className="text-[13px] font-semibold text-slate-800">{activePreview.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Lokasi Kejadian</p>
                      <p className="text-[13px] font-semibold text-slate-800 mb-0.5">{activePreview.location || 'Merauke, Papua'}</p>
                      {activePreview.lat && activePreview.lng && (
                        <p className="text-[11px] font-medium text-slate-500 font-mono mb-2">GPS: {activePreview.lat}, {activePreview.lng}</p>
                      )}
                      {activePreview.lat && activePreview.lng ? (
                        <div className="h-32 w-full rounded-lg overflow-hidden border border-slate-200 z-0 relative">
                          <MapContainer 
                            center={[Number(activePreview.lat), Number(activePreview.lng)]} 
                            zoom={12} 
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            doubleClickZoom={false}
                            touchZoom={false}
                          >
                            <TileLayer
                              attribution="&copy; Google Maps"
                              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            />
                            <Marker position={[Number(activePreview.lat), Number(activePreview.lng)]} />
                          </MapContainer>
                        </div>
                      ) : mappedProject && mappedProject.lat && mappedProject.lng ? (
                        <div className="h-32 w-full rounded-lg overflow-hidden border border-slate-200 z-0 relative">
                          <MapContainer 
                            center={[mappedProject.lat, mappedProject.lng]} 
                            zoom={10} 
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            doubleClickZoom={false}
                            touchZoom={false}
                          >
                            <TileLayer
                              attribution="&copy; Google Maps"
                              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            />
                            <Marker position={[mappedProject.lat, mappedProject.lng]} />
                          </MapContainer>
                        </div>
                      ) : (
                         <div className="h-20 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> Peta tidak tersedia</p>
                         </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Waktu Lapor</p>
                      <p className="text-[13px] font-semibold text-slate-800">{activePreview.date}</p>
                    </div>
                    
                    {/* ENHANCED EVIDENCE ATTACHMENT SECTION */}
                    {activePreview.evidenceUrl && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mt-2">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-primary-500"/> Lampiran Bukti
                          </p>
                          <a 
                            href={activePreview.evidenceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-600 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 "
                          >
                            Lihat Full
                          </a>
                        </div>
                        <div className="relative group overflow-hidden rounded-lg bg-slate-200 cursor-pointer">
                          <a href={activePreview.evidenceUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                            <div className="aspect-[4/3] w-full overflow-hidden">
                              <img 
                                src={activePreview.evidenceUrl} 
                                alt="Bukti Lampiran Pelapor" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                loading="lazy"
                              />
                            </div>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors duration-300"></div>
                            <div className="absolute bottom-2 right-2 bg-slate-900/70 backdrop-blur text-white text-[10px] px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Search className="w-3 h-3" /> Zoom
                            </div>
                          </a>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Berkas ini diunggah oleh pelapor.
                        </p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Right Area: Replies/Chat */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative min-h-[50vh] md:min-h-0">
               <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 h-16 bg-white/95 backdrop-blur z-10">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 ring-2 ring-primary-500/50 20">
                     <MessageSquare className="w-4 h-4" />
                   </div>
                   <div>
                     <h3 className="text-[13px] md:text-sm font-bold text-slate-800">Ruang Diskusi & Tindak Lanjut</h3>
                     <p className="text-[10px] md:text-[11px] text-slate-500 font-medium">Tim Pusat & Admin Daerah</p>
                   </div>
                 </div>
                 <button onClick={() => setPreviewItem(null)} className="hidden md:flex text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/50">
                  {/* Initial message bubble */}
                  <div className="flex items-start gap-3 md:gap-4">
                     <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-500/10 border-2 border-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                       <UserRound className="w-4 h-4 text-primary-500" />
                     </div>
                     <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[13px] font-bold text-slate-800">{activePreview.user}</span>
                           <span className="text-[10px] text-slate-500 font-medium">{activePreview.date}</span>
                        </div>
                        <div className="bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] rounded-2xl rounded-tl-none p-4 md:p-5  inline-block w-full max-w-[95%] text-left">
                           <p className="text-[13px] md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {activePreview.description || `Terdapat kendala terkait: ${activePreview.subject}. Mohon dapat segera ditindaklanjuti untuk mendukung operasional optimal.`}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Replies mapping */}
                  {activePreview.replies?.map((reply: any, i: number) => {
                     const isMe = reply.userId === currentUser?.uid;
                     return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={i} 
                        className={cn("flex items-start gap-3 md:gap-4", isMe ? "justify-end" : "justify-start")}
                      >
                          {!isMe && (
                             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                               <UserRound className="w-4 h-4 text-slate-500" />
                             </div>
                          )}
                          <div className={cn("flex flex-col space-y-1 max-w-[90%] md:max-w-[80%]", isMe ? "items-end" : "items-start")}>
                             <div className="flex items-center gap-2">
                               {isMe ? (
                                  <>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {new Date(reply.date).toLocaleString('id-ID', { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                                    </span>
                                    <span className="text-[13px] font-bold text-slate-800">Anda</span>
                                  </>
                               ) : (
                                  <>
                                    <span className="text-[13px] font-bold text-slate-800">{reply.userName}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {new Date(reply.date).toLocaleString('id-ID', { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                                    </span>
                                  </>
                               )}
                             </div>
                             <div className={cn(
                               "rounded-2xl p-4 md:p-5 pb-7 shadow-sm inline-block text-left relative group/reply",
                               isMe ? "bg-primary-500 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                             )}>
                                <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                                 {(isMe || canDelete) && (
                                   <button 
                                     onClick={() => setReplyToDeleteIndex(i)}
                                     type="button"
                                     className={cn(
                                       "absolute bottom-1.5 right-2 p-1.5 rounded-md opacity-100 lg:opacity-0 lg:group-hover/reply:opacity-100 transition-all hover:scale-105 active:scale-95 cursor-pointer border-0 bg-transparent flex items-center justify-center",
                                       isMe ? "text-primary-100 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-red-500 hover:bg-slate-100"
                                     )}
                                     title="Hapus Balasan"
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

               {/* Reply input form */}
               <div className="p-3 sm:p-5 border-t border-slate-200 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10 sticky bottom-0">
                 <form onSubmit={handleReply} className="flex gap-2 sm:gap-3 items-end">
                   <textarea
                     value={replyMessage}
                     onChange={(e) => setReplyMessage(e.target.value)}
                     placeholder={activePreview.status === 'Resolved' ? "Kirim catatan tambahan..." : "Ketik balasan Anda..."}
                     className="flex-1 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3 text-[13px] sm:text-sm outline-none focus:bg-white focus:border-primary-500focus:ring-4 focus:ring-primary-500 transition-all placeholder:text-slate-400 resize-none min-h-[50px] max-h-[120px]"
                     rows={1}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleReply(e);
                       }
                     }}
                   />
                   <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="bg-primary-600 hover:bg-primary-700 text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 w-12 h-12 md:w-auto md:px-5 md:h-12 rounded-xl flex items-center justify-center gap-2 shrink-0 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95 disabled:scale-100 font-bold text-xs sm:text-[13px] uppercase tracking-wider mb-0.5 border-0"
                    >
                      <CornerUpLeft className="w-4 h-4" />
                      <span className="hidden md:inline">Kirim Balasan</span>
                    </button>
                 </form>
                 <p className="text-[10px] text-slate-400 mt-2 text-center flex items-center justify-center gap-2 flex-wrap font-sans">
                    <span>Gunakan Shift + Enter untuk garis baru, Enter untuk mengirim.</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-650 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-150 text-[9px] uppercase tracking-wider font-mono">📢 WA & Email Gateway Terkoneksi</span>
                  </p>
               </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                    <Edit2 className="w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-900">{editingItem ? 'Edit Kelengkapan Laporan' : 'Buat Laporan Baru'}</h3>
                   <p className="text-[11px] text-slate-500 font-medium">Isi detail pengaduan dengan lengkap untuk memudahkan verifikasi</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Subjek Masalah</label>
                  <input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} type="text" placeholder="Singkat, padat, jelas (Contoh: Jalan Poros Distrik Muting Rusak)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500focus:ring-4 focus:ring-primary-500 transition-all font-medium text-slate-800" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Deskripsi Detail</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Jelaskan secara detail kendala yang dialami, kronologi, dsb..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500focus:ring-4 focus:ring-primary-500 transition-all min-h-[120px] resize-y custom-scrollbar text-slate-700 leading-relaxed"></textarea>
                </div>
                
                {/* Geografis & Pemetaan Kawasan Dropdowns */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-2 text-left">
                  {/* Wilayah Dropdown */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">WILAYAH (GEOGRAFIS) <span className="text-red-500">*</span></label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => {
                        const reg = e.target.value;
                        setSelectedRegion(reg);
                        // reset location inside state
                        setFormData(prev => ({
                          ...prev,
                          location: reg ? `, ${reg}` : '',
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
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">KAWASAN (PEMETAAN) <span className="text-red-500">*</span></label>
                    <select
                      value={geographies.find(g => g.name === formData.location || `${g.name}, ${g.region}` === formData.location)?.name || ''}
                      onChange={(e) => {
                        const kaw = e.target.value;
                        const matchingObj = geographies.find(g => g.name === kaw);
                        if (matchingObj) {
                          setFormData(prev => ({
                            ...prev,
                            location: `${matchingObj.name}, ${matchingObj.region}`,
                            lat: String(matchingObj.lat),
                            lng: String(matchingObj.lng)
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, location: kaw }));
                        }
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left col-span-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nama Pelapor / Pihak</label>
                    <div className="relative">
                      <UserRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} type="text" placeholder="Nama Pelapor" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500 transition-all text-slate-700 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Nomor Telepon Pihak (WhatsApp)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="text" placeholder="0812xxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500 transition-all text-slate-700 font-medium font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Email Pelapor (Optional)</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" placeholder="budi@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500 transition-all text-slate-700 font-medium" />
                    </div>
                  </div>
                </div>

                {/* Geolocation Section */}
                <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Locate className="w-4 h-4 text-primary-500" /> Data Geolokasi (Koordinat Fisik)
                    </span>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={geolocating}
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm border border-transparent cursor-pointer"
                    >
                      <Locate className={cn("w-3.5 h-3.5", geolocating && "animate-spin")} />
                      {geolocating ? 'Mengambil GPS...' : 'Ambil Koordinat GPS'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">Latitude</label>
                      <input
                        type="text"
                        placeholder="Contoh: -8.123456"
                        value={formData.lat}
                        onChange={e => setFormData({ ...formData, lat: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary-500 font-mono text-slate-700"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">Longitude</label>
                      <input
                        type="text"
                        placeholder="Contoh: 140.123456"
                        value={formData.lng}
                        onChange={e => setFormData({ ...formData, lng: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary-500 font-mono text-slate-700"
                      />
                    </div>
                  </div>
                  {geoError && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider px-1">{geoError}</p>
                  )}
                </div>

                {/* Evidence Attachment Section */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Lampiran Foto Bukti Kendala</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 flex flex-col items-center justify-center space-y-2 group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            alert("Silakan unggah berkas gambar.");
                            return;
                          }
                          setEvidenceFile(file);
                          const reader = new FileReader();
                          reader.onload = (completed) => {
                            setEvidencePreview(completed.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />

                    {evidencePreview ? (
                      <div className="relative group/preview w-full max-w-[200px] h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
                        <img src={evidencePreview} alt="Bukti Foto" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setEvidenceFile(null);
                            setEvidencePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            setFormData(prev => ({ ...prev, evidenceUrl: '' }));
                          }}
                          className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover/preview:opacity-100 flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider transition-opacity duration-200"
                        >
                          <Trash2 className="w-5 h-5" /> Hapus Foto
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary-500 group-hover:bg-primary-50 transition-colors shadow-sm">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Tarik berkas foto atau klik di sini</p>
                          <p className="text-[10px] text-slate-450 text-slate-400 mt-0.5 font-medium">Mendukung format gambar JPEG, PNG, WEBP (Maksimal 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-100 pt-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Kategori</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500focus:ring-4 focus:ring-primary-500 font-medium text-slate-700">
                      <option value="Infrastruktur">Infrastruktur</option>
                      <option value="Logistik Dan Pangan">Logistik Dan Pangan</option>
                      <option value="Aksesibilitas dan Transportasi">Aksesibilitas</option>
                      <option value="Hak dan Keamanan Sosial">Sosial</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500focus:ring-4 focus:ring-primary-500 font-medium text-slate-700">
                      <option value="Open">🔴 Open / Terbuka</option>
                      <option value="In Review">🟡 In Review / Proses</option>
                      <option value="Resolved">🟢 Resolved / Selesai</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Prioritas</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary-500focus:ring-4 focus:ring-primary-500 font-medium text-slate-700">
                      <option value="High">Tinggi (High)</option>
                      <option value="Medium">Sedang (Medium)</option>
                      <option value="Low">Rendah (Low)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border-2 border-slate-200 text-[12px] font-bold rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">BATAL</button>
                 <button type="submit" disabled={uploading} className="px-6 py-3 sm:px-8 sm:py-3 text-[12px] sm:text-[13px] w-full sm:w-auto font-bold bg-primary-600 text-white hover:bg-primary-700 rounded-xl shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] transition-all tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed">
                   {uploading ? (
                      <><span className="animate-spin mr-1">⌛</span> SEDANG MENYIMPAN...</>
                    ) : editingItem ? (
                      <><CheckCircle2 className="w-4 h-4"/> SIMPAN PERUBAHAN</>
                    ) : (
                      <><Plus className="w-4 h-4" /> BUAT LAPORAN</>
                    )}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Pusat Pengaduan <span className="px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded text-[11px] tracking-widest uppercase">Live</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Layanan pelaporan kendala, kerusakan, atau isu operasional transmigrasi.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-3 sm:mt-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={exportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all ">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button onClick={exportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all ">
              <FileText className="w-4 h-4" /> CSV
            </button>
          </div>
          <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] tracking-wide hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95 w-full sm:w-auto">
             <Plus className="w-4 h-4" /> Laporan Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Laporan', value: complaints.length, color: 'text-slate-700', bg: 'bg-white', iconbg: 'bg-slate-50' },
          { label: 'Open', value: complaints.filter(c => c.status === 'Open').length, color: 'text-red-500', bg: 'bg-white', iconbg: 'bg-red-50' },
          { label: 'In Review', value: complaints.filter(c => c.status === 'In Review').length, color: 'text-amber-500', bg: 'bg-white', iconbg: 'bg-amber-50' },
          { label: 'Resolved', value: complaints.filter(c => c.status === 'Resolved').length, color: 'text-emerald-500', bg: 'bg-white', iconbg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className={cn("p-4 sm:p-5 rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-0 flex flex-col justify-between", stat.bg)}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0", stat.iconbg, stat.color)}>
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-[11px] sm:text-[13px] font-bold tracking-wide uppercase text-slate-500">{stat.label}</p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-0 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
           <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
             <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-primary-500 focus-within:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all w-full md:w-96">
               <Search className="w-4 h-4 text-slate-400" />
               <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Cari berdasarkan subjek atau deskripsi..." className="bg-transparent border-none outline-none text-[13px] font-medium text-slate-700 focus:ring-0 w-full py-0.5 placeholder:font-normal" />
             </div>
           </div>
           <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500 flex-1 md:flex-none">
                <option value="">Semua Kategori</option>
                <option value="Infrastruktur">Infrastruktur</option>
                <option value="Logistik Dan Pangan">Logistik</option>
                <option value="Aksesibilitas dan Transportasi">Aksesibilitas</option>
                <option value="Hak dan Keamanan Sosial">Sosial</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500 flex-1 md:flex-none">
                <option value="">Semua Status</option>
                <option value="Open">Open</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
              </select>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500 flex-1 md:flex-none">
                <option value="">Bulan</option>
                {Array.from({length: 12}, (_, i) => (<option key={i+1} value={String(i+1)}>{new Date(0, i).toLocaleString('id-ID', {month: 'long'})}</option>))}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500 flex-1 md:flex-none">
                <option value="">Tahun</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
           </div>
        </div>
        
        <div className="p-4 bg-slate-50/30">
          {paginatedComplaints.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-700">Tidak Ada Laporan</h3>
                 <p className="text-sm text-slate-500 mt-1 max-w-sm">Mungkin kata kunci atau filter Anda tidak cocok dengan laporan manapun.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedComplaints.map((c, i) => (
                <motion.div 
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setPreviewItem(c)}
                  className="bg-white rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-primary-500 transition-all cursor-pointer group flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-start gap-3 bg-slate-50/50">
                    <div className={cn(
                      "p-3 rounded-xl shrink-0 mt-0.5 shadow-sm",
                      c.priority === 'High' ? "bg-red-50 text-red-500" : 
                      c.priority === 'Low' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500")}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-bold text-slate-800 group-hover:text-primary-500transition-colors line-clamp-2 leading-snug">{c.subject}</h4>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border shadow-sm",
                          c.status === 'Open' ? "bg-red-50 text-red-500 border-red-500/20" :
                          c.status === 'Resolved' ? "bg-emerald-50 text-emerald-500 border-emerald-500/20" : "bg-amber-50 text-amber-500 border-amber-500/20"
                        )}>{c.status}</span>
                         <span className={cn(
                           "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border shadow-sm",
                           c.priority === 'High' ? "bg-red-50 text-red-500 border-red-500/20" :
                           c.priority === 'Low' ? "bg-emerald-50 text-emerald-500 border-emerald-500/20" : "bg-amber-50 text-amber-500 border-amber-500/20"
                         )}>{c.priority}</span>
                         <span className={cn(
                           "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border shadow-sm text-slate-600 bg-slate-100 border-slate-200"
                         )}>{c.category}</span>
                         {c.evidenceUrl && (
                           <span className={cn(
                             "px-2 py-0.5 rounded flex items-center justify-center text-[10px] shadow-sm text-primary-600 bg-primary-100 border border-primary-200"
                           )} title="Terdapat lampiran bukti foto">
                              <ImageIcon className="w-3.5 h-3.5" />
                           </span>
                         )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4 flex-1">
                    <p className="text-[13px] text-slate-600 line-clamp-3 leading-relaxed">
                       {c.description || "Tidak ada deskripsi detail tambahan yang disediakan."}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                           <UserRound className="w-3 h-3 text-slate-400" />
                         </div>
                         <div className="flex flex-col">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Pelapor</p>
                           <p className="text-[11px] font-bold text-slate-700 max-w-[100px] truncate leading-none mt-1">{c.user}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-end leading-none"><Clock className="w-3 h-3" /> Dilaporkan</p>
                         <p className="text-[11px] text-slate-600 font-bold tracking-wide leading-none">{c.date?.split(',')[0] || c.date}</p>
                       </div>
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPreviewItem(c); }} 
                      type="button"
                      className="px-3 py-1.5 text-[12px] sm:text-[13px] font-bold text-primary-600 hover:text-white bg-primary-100/50 hover:bg-primary-600 rounded-lg transition-all flex items-center gap-1.5 border border-primary-200/50 active:scale-95 cursor-pointer"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" /> Balas {c.replies?.length ? `(${c.replies.length})` : ''}
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(c); }} 
                          type="button"
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95 border-0 bg-transparent flex items-center justify-center cursor-pointer"
                          title="Edit Laporan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setItemToDelete(c.id); }} 
                          type="button"
                          className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all active:scale-95 border-0 bg-transparent flex items-center justify-center cursor-pointer"
                          title="Hapus Laporan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
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
                 Prev
               </button>
               <span className="text-sm font-medium text-slate-600 px-2">
                 Hal {currentPage} dari {totalPages}
               </span>
               <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Next
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

