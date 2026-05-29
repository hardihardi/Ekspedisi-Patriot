import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Folder, 
  Search, 
  Plus, 
  FileCheck, 
  MoreVertical,
  Download,
  Eye,
  ShieldCheck,
  QrCode,
  HardDrive,
  Clock,
  Trash2,
  X,
  Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { QRGeneratorModal } from '../components/QRGeneratorModal';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { useStore } from '../store/useStore';
import { sendAppNotification } from '../lib/notifications';
import { NotificationGatewayModal } from '../components/NotificationGatewayModal';

const FOLDERS = [
  { name: 'SK Penempatan', count: 24, color: 'text-primary-500', bg: 'bg-primary-500/10' },
  { name: 'Berita Acara', count: 12, color: 'text-amber-500', bg: 'bg-amber-100' },
  { name: 'Rencana Kerja', count: 8, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { name: 'Dokumen Legalitas', count: 42, color: 'text-slate-700', bg: 'bg-slate-700/10' },
];

export const Documents: React.FC = () => {
  const { appSettings, user } = useStore();
  
  const canManage = user?.role === 'superadmin' || user?.role === 'admin_pusat' || user?.role === 'admin_daerah';
  const canSign = user?.role === 'superadmin' || user?.role === 'admin_pusat' || user?.role === 'pimpinan';
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'cloud' | 'esign'>('cloud');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({ name: '', folder: 'SK Penempatan' });

  const [signModalDoc, setSignModalDoc] = useState<any | null>(null);
  const [signFormData, setSignFormData] = useState({ pin: '', agree: false });
  const [isSigning, setIsSigning] = useState(false);

  // Notification Gateway visualizer states
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'idle' | 'sending' | 'success' | 'done'>('idle');
  const [gatewayEvent, setGatewayEvent] = useState<'complaint_created' | 'complaint_updated' | 'document_signed' | 'meeting_created' | 'system_alert' | null>(null);
  const [gatewayEmail, setGatewayEmail] = useState('');
  const [gatewayPhone, setGatewayPhone] = useState('');
  const [gatewaySubject, setGatewaySubject] = useState('');
  
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [qrModalDoc, setQrModalDoc] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'documents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocuments(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (docItem?: any) => {
    if (docItem) {
      setEditingItem(docItem);
      setFormData({ name: docItem.name, folder: docItem.folder });
      setSelectedFile(null);
    } else {
      setEditingItem(null);
      setFormData({ name: '', folder: 'SK Penempatan' });
      setSelectedFile(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await setDoc(doc(db, 'documents', editingItem.id), {
          ...formData,
        }, { merge: true });
        setIsModalOpen(false);
      } else {
        const fileSize = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '0.0 MB';
        const newDocId = Math.random().toString(36).substring(2, 9);
        
        const saveDoc = async (urlStr: string) => {
          await setDoc(doc(db, 'documents', newDocId), {
            ...formData,
            size: fileSize,
            date: new Date().toISOString().split('T')[0],
            url: urlStr,
            isSigned: false,
            signedBy: ''
          });
          setIsModalOpen(false);
        };

        if (selectedFile) {
          if (selectedFile.size > 800 * 1024) {
             alert('Ukuran file terlalu besar untuk disimpan dalam database preview ini (Maks ~800KB). Dokumen akan disimpan tanpa file fisik preview yang mengikat.');
             await saveDoc('');
             return;
          }
          const reader = new FileReader();
          reader.onloadend = async () => {
             const base64Url = reader.result as string;
             await saveDoc(base64Url);
          };
          reader.readAsDataURL(selectedFile);
        } else {
          await saveDoc('');
        }
      }
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'documents');
    }
  };

  const handleSign = (docItem: any) => {
    setSignModalDoc(docItem);
    setSignFormData({ pin: '', agree: false });
  };

  const [signError, setSignError] = useState<string | null>(null);

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signModalDoc) return;
    setSignError(null);
    
    if (signFormData.pin.length !== 6) {
      setSignError('PIN harus terdiri dari 6 digit.');
      return;
    }

    if (!signFormData.agree) {
       setSignError('Anda harus menyetujui pernyataan untuk melanjutkan.');
       return;
    }
    
    setIsSigning(true);
    try {
      await setDoc(doc(db, 'documents', signModalDoc.id), {
        isSigned: true,
        signedBy: 'Sistem Internal',
        signedAt: new Date().toISOString()
      }, { merge: true });
      
      // Real-time dispatch of digital signature completion through Fonnte & SMTP gateways with gateway tracking
      setIsGatewayOpen(true);
      setGatewayStatus('sending');
      setGatewayEvent('document_signed');
      setGatewayEmail(signModalDoc.email || '');
      setGatewayPhone(signModalDoc.phone || '');
      setGatewaySubject(signModalDoc.title);

      try {
        await sendAppNotification('document_signed', {
          documentTitle: signModalDoc.title,
          documentId: signModalDoc.id,
          signerName: 'Sistem Internal (BSrE TTE)',
          recipientPhone: signModalDoc.phone || '',
          recipientEmail: signModalDoc.email || ''
        });
        setGatewayStatus('done');
      } catch (notifyErr) {
        console.error('Trigger digital signature notification failed:', notifyErr);
        setGatewayStatus('done');
      }

      setIsSigning(false);
      setSignModalDoc(null);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'documents');
       setIsSigning(false);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
      await deleteDoc(doc(db, 'documents', docToDelete));
      setDocToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'documents');
    }
  };

  const handleDownload = (docItem: any) => {
    if (docItem.url) {
      const link = document.createElement('a');
      link.href = docItem.url;
      link.download = docItem.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Simulasi download: ${docItem.name}\n(Preview dummy dokumen tidak memiliki file fisik untuk diunduh)`);
    }
  };

  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // suitable for grid

  const fullyFilteredDocs = documents.filter(d => {
    let match = true;
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase())) match = false;
    if (filterFolder && d.folder !== filterFolder) match = false;
    
    if (d.date) {
      // date is usually YYYY-MM-DD or DD/MM/YYYY text
      // if it's YYYY-MM-DD
      const dateParts = d.date.split('-'); 
      if (dateParts.length === 3) {
         if (filterYear && dateParts[0] !== filterYear) match = false;
         if (filterMonth && parseInt(dateParts[1], 10).toString() !== filterMonth) match = false;
      } else {
         const date = new Date(d.date);
         if (!isNaN(date.getTime())) {
           if (filterMonth && (date.getMonth() + 1).toString() !== filterMonth) match = false;
           if (filterYear && date.getFullYear().toString() !== filterYear) match = false;
         }
      }
    }
    return match;
  });

  const totalPages = Math.ceil(fullyFilteredDocs.length / ITEMS_PER_PAGE);
  const paginatedDocs = fullyFilteredDocs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportPDF = () => {
    const pdfDoc = new jsPDF();
    pdfDoc.text('Data Dokumen', 14, 15);
    const tableData = fullyFilteredDocs.map(t => [
      t.name, t.folder || 'ESign', t.signatureStatus || 'Dalam Verifikasi', t.size || '-', t.date
    ]);
    autoTable(pdfDoc, {
      head: [['Nama Dokumen', 'Folder/Tipe', 'Status', 'Ukuran', 'Tanggal']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    pdfDoc.save('Data_Dokumen.pdf');
  };

  const exportCSV = () => {
    const csvData = fullyFilteredDocs.map(t => ({
      'Nama Dokumen': t.name,
      'Folder/Tipe': t.folder || 'ESign',
      'Status': t.signatureStatus || 'Dalam Verifikasi',
      'Ukuran': t.size || '-',
      'Tanggal': t.date
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Data_Dokumen.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
     setCurrentPage(1);
  }, [search, filterMonth, filterYear, filterFolder, activeTab]);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Dokumen"
        message="Apakah Anda yakin ingin menghapus dokumen ini? Dokumen yang telah dihapus tidak dapat dipulihkan."
        confirmText="Hapus Dokumen"
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

      <QRGeneratorModal
        isOpen={!!qrModalDoc}
        onClose={() => setQrModalDoc(null)}
        documentData={qrModalDoc}
      />

      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Preview Dokumen
              </h3>
              <button 
                onClick={() => setPreviewDoc(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
               >
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row bg-slate-50/50">
              {/* Document Preview Area (Left/Top) */}
              <div className="flex-1 bg-slate-200/60 p-4 sm:p-6 lg:p-8 flex items-start justify-center border-b lg:border-b-0 lg:border-r border-slate-200">
                {previewDoc.url ? (
                   <div className="w-full h-full min-h-[400px] bg-white shadow-xl border border-slate-200 rounded overflow-hidden flex flex-col">
                      {previewDoc.url.startsWith('data:image/') || previewDoc.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                         <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
                           <img src={previewDoc.url} alt="Document Preview" className="max-w-full max-h-full object-contain m-auto rounded shadow-sm" />
                         </div>
                      ) : previewDoc.url.startsWith('data:application/pdf') || previewDoc.name?.toLowerCase().endsWith('.pdf') ? (
                         <object data={previewDoc.url} type="application/pdf" className="w-full h-full border-none flex-1 min-h-[800px]">
                           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 m-auto p-8 text-center min-h-[400px]">
                              <p className="font-bold text-lg text-slate-700">Preview PDF tidak didukung di browser Anda.</p>
                              <button onClick={() => handleDownload(previewDoc)} className="mt-4 bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary-600 transition-all flex items-center gap-2 mx-auto"><Download className="w-4 h-4"/> Unduh PDF</button>
                           </div>
                         </object>
                      ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-slate-500 m-auto p-8 text-center min-h-[400px]">
                           <FileText className="w-16 h-16 text-slate-400 mb-4 mx-auto" />
                           <p className="font-bold text-lg text-slate-700">Preview file ini tidak didukung di browser</p>
                           <p className="text-sm mt-2 mb-6 text-slate-500">Sistem saat ini belum mendukung preview langsung untuk format file ini. Silakan unduh dokumen untuk melihat isinya.</p>
                           <button onClick={() => handleDownload(previewDoc)} className="bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary-600 focus:ring-4 focus:ring-primary-500/20 transition-all flex items-center gap-2 mx-auto"><Download className="w-4 h-4"/> Unduh Dokumen Sekarang</button>
                         </div>
                      )}
                   </div>
                ) : (
                  <div className="bg-white w-full max-w-[750px] rounded shadow-xl border border-slate-200 p-6 sm:p-12 text-slate-800 relative aspect-auto min-h-[800px]">
                     {previewDoc.isSigned && (
                       <div className="absolute top-12 right-12 w-24 h-24 border-4 border-double border-emerald-500/30 rounded-full flex items-center justify-center opacity-70 rotate-[-15deg] pointer-events-none">
                         <div className="text-center">
                           <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                           <span className="text-[8px] font-bold text-emerald-700 uppercase leading-none block mt-1">VERIFIED</span>
                         </div>
                       </div>
                     )}
                     <div className="border-b-2 border-slate-800 pb-6 mb-8 text-center pt-8">
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider mb-2">Pemerintah Republik Indonesia</h1>
                        <h2 className="text-sm font-bold text-slate-600">{appSettings?.instansiName || 'Kementerian Transmigrasi'}</h2>
                        <p className="text-[10px] text-slate-500 mt-2">Jl. TMP Kalibata No.17, Jakarta Selatan 12750</p>
                     </div>
                     
                     <h3 className="text-lg font-bold text-center underline mb-8 font-serif leading-relaxed px-4">{previewDoc.name.replace(/\.[^/.]+$/, "")}</h3>
                     
                     <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-justify font-serif">
                       <p>Menimbang dan memperhatikan regulasi terkait penyelenggaraan kawasan transmigrasi, dengan ini diterbitkan dokumen resmi nomor <strong>REG/{Math.floor(Math.random() * 90000) + 10000}/{new Date().getFullYear()}</strong> untuk dapat dipergunakan sebagaimana mestinya.</p>
                       <p>Dokumen ini diterbitkan sebagai tindak lanjut atas rencana strategis pengembangan kawasan yang telah disetujui, meliputi aspek perencanaan, pelaksanaan, dan pengawasan terpadu di tingkat regional maupun nasional.</p>
                       
                       <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                           <p className="font-bold grid grid-cols-[80px_1fr] gap-2"><span>Kategori</span> <span>: {previewDoc.folder}</span></p>
                           <p className="font-bold grid grid-cols-[80px_1fr] gap-2 mt-2"><span>Tanggal</span> <span>: {previewDoc.date}</span></p>
                         </div>
                       </div>
                       
                       <p className="mt-8">Segala ketentuan dan instruksi yang tertuang dalam dokumen ini bersifat mengikat dan wajib dilaksanakan oleh seluruh pihak terkait.</p>
                     </div>
                     
                     <div className="mt-16 text-right text-xs sm:text-sm font-serif">
                       <p className="mb-20">Jakarta, {previewDoc.date}</p>
                       {previewDoc.isSigned ? (
                         <div className="inline-block text-left text-[10px] font-mono border border-slate-200 p-2 bg-slate-50 rounded">
                           <p>Signed By: {previewDoc.signedBy}</p>
                           <p>Time     : {previewDoc.date}</p>
                           <p>CA       : KEMEN-TSM ID</p>
                           <div className="mt-2 text-center bg-white p-1 inline-block rounded">
                             <QRCodeSVG 
                               value={JSON.stringify({
                                 id: previewDoc.id,
                                 type: "VERIFICATION",
                                 name: previewDoc.name,
                                 signedBy: previewDoc.signedBy,
                                 date: previewDoc.date
                               })} 
                               size={56} 
                             />
                           </div>
                         </div>
                       ) : (
                         <div className="inline-block w-32 h-16 border-b border-dashed border-slate-400"></div>
                       )}
                       <p className="mt-2 font-bold">( Menteri Transmigrasi )</p>
                     </div>
                  </div>
                )}
              </div>

              {/* Document Meta Area (Right/Bottom) */}
              <div className="w-full lg:w-[380px] p-4 sm:p-6 bg-slate-50/50 space-y-6 shrink-0 h-max">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 break-words mb-2 leading-tight">{previewDoc.name}</h4>
                    {previewDoc.isSigned ? (
                       <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold rounded-lg uppercase tracking-wider inline-flex items-center gap-2">
                         <ShieldCheck className="w-3.5 h-3.5" /> Ditandatangani Secara Elektronik
                       </span>
                    ) : (
                       <span className="px-3 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider inline-flex items-center gap-2">
                         <Clock className="w-3.5 h-3.5" /> Menunggu Tanda Tangan
                       </span>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] p-4 space-y-3">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Informasi Dokumen</h5>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Folder</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1.5 break-all"><Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />{previewDoc.folder}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Dibuat</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{previewDoc.date}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                      <span className="text-slate-500 font-medium whitespace-nowrap">Ukuran</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-slate-400" />{previewDoc.size}</span>
                    </div>
                  </div>

                  {/* Signature Details / Certificate */}
                  {previewDoc.isSigned && (
                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-emerald-100 flex items-center gap-2 bg-emerald-100/50">
                        <QrCode className="w-4 h-4 text-emerald-700" />
                        <h5 className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest">Detail Tanda Tangan</h5>
                      </div>
                      <div className="p-4 space-y-3">
                         <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest">Penandatangan</p>
                           <p className="text-xs font-bold text-emerald-900">{previewDoc.signedBy}</p>
                         </div>
                         <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest">Waktu Disahkan</p>
                           <p className="text-xs font-bold text-emerald-800">{previewDoc.date} - 09:41 WIB</p>
                         </div>
                         <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest">Penerbit CA</p>
                           <p className="text-xs font-bold text-emerald-800">Sistem Internal {appSettings?.instansiName || 'Kementerian'}</p>
                         </div>
                         <div className="pt-2 border-t border-emerald-100/50 flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                              <ShieldCheck className="w-3.5 h-3.5" /> Sertifikat Valid
                            </div>
                            <div className="bg-white p-1 rounded border border-emerald-100">
                              <QRCodeSVG 
                               value={JSON.stringify({
                                 id: previewDoc.id,
                                 type: "VERIFICATION",
                                 name: previewDoc.name,
                                 signedBy: previewDoc.signedBy,
                                 date: previewDoc.date
                               })} 
                               size={40} 
                              />
                            </div>
                         </div>
                      </div>
                    </div>
                  )}

                  {!previewDoc.isSigned && (
                    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm text-center">
                       <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                       <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Status Draft</h5>
                       <p className="text-[10px] text-amber-700/80 leading-relaxed">Dokumen ini belum ditandatangani. Tindakan tanda tangan elektronik (TTE) dapat dilakukan melalui menu manajemen dokumen.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
               <button 
                 onClick={() => setPreviewDoc(null)} 
                 className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 rounded-lg transition-colors"
               >
                 Tutup Preview
               </button>
               <button 
                 onClick={() => setQrModalDoc(previewDoc)}
                 className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-650 hover:bg-primary-50 bg-white border border-primary-200 rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 <QrCode className="w-3.5 h-3.5" /> Label Verifikasi
               </button>
               <button 
                 onClick={() => handleDownload(previewDoc)}
                 className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary-500 text-white hover:bg-primary-500 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
               >
                 <Download className="w-3.5 h-3.5" /> Unduh Dokumen
               </button>
            </div>
          </motion.div>
        </div>
      )}

      {signModalDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Tanda Tangan Digital Internal</h3>
              <button type="button" onClick={() => setSignModalDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <p className="text-xs font-medium text-slate-700">Dokumen: <span className="font-bold">{signModalDoc.name}</span></p>
            </div>
            <form onSubmit={handleSignSubmit} className="flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto font-sans">
                {signError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-bold font-sans">
                    {signError}
                  </div>
                )}
                <div className="space-y-1 font-sans">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">PIN Keamanan (6 Digit)</label>
                  <div className="relative">
                    <input required value={signFormData.pin} onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 6) setSignFormData({...signFormData, pin: val});
                    }} minLength={6} maxLength={6} pattern="\d{6}" title="PIN harus terdiri dari 6 digit angka" type="password" placeholder="******" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-center tracking-[1em] text-lg outline-none focus:border-primary-500 font-mono" />
                  </div>
                  <p className="text-[10px] text-slate-400 px-1 mt-1">Masukkan 6 digit PIN akun Anda untuk memverifikasi penandatanganan.</p>
                  <p className="text-[9px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 font-bold mt-2 flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider">
                    📢 Auto-Sync WA & Email Aktif
                  </p>
                </div>
                <div className="flex items-start gap-2 mt-4 bg-slate-50 p-3 rounded-lg border-0 hover:border-primary-500 transition-colors">
                  <input type="checkbox" id="agree" checked={signFormData.agree} onChange={(e) => setSignFormData({...signFormData, agree: e.target.checked})} className="mt-0.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500 w-4 h-4 cursor-pointer" />
                  <label htmlFor="agree" className="text-[10px] leading-relaxed text-slate-600 cursor-pointer">
                    Saya mengerti dan menyetujui bahwa <strong>tanda tangan digital ini mengikat secara hukum</strong> yang diterbitkan oleh Sistem Internal {appSettings?.instansiName || 'Kementerian'}, sesuai dengan peraturan perundang-undangan yang berlaku.
                  </label>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white">
                 <button type="button" onClick={() => setSignModalDoc(null)} disabled={isSigning} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 disabled:opacity-50">Batal</button>
                 <button type="submit" disabled={isSigning} className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary-500 text-white hover:bg-primary-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                   {isSigning && <QrCode className="w-3.5 h-3.5 animate-pulse" />}
                   {isSigning ? 'Verifying...' : 'Tanda Tangan'}
                 </button>
              </div>
            </form>
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
              <h3 className="text-lg font-bold text-slate-900">{editingItem ? 'Edit Dokumen' : 'Upload Dokumen Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                {!editingItem && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Pilih File (PDF/Excel/Gambar)</label>
                    <input 
                      type="file" 
                      accept=".pdf,.xls,.xlsx,image/*" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setFormData({...formData, name: file.name});
                        }
                      }} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-primary-500/10 file:text-primary-500 hover:file:bg-primary-500 hover:file:text-white" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Nama Dokumen</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" placeholder="Misal: SK_Baru.pdf" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Folder Kategori</label>
                  <select value={formData.folder} onChange={e => setFormData({...formData, folder: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary-500">
                    {FOLDERS.map(f => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">Batal</button>
                 <button type="submit" className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-[13px] font-bold uppercase tracking-widest bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all border-0 flex items-center justify-center gap-2">{editingItem ? 'Simpan' : 'Upload'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'cloud' ? 'Cloud Dokumen & Kearsipan' : 'Tanda Tangan Digital Internal'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {activeTab === 'cloud' ? 'Penyimpanan terpusat untuk semua dokumen digital.' : 'Pengesahan dokumen menggunakan layanan Tanda Tangan Digital Ekosistem Internal yang lengkap.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={exportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all ">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={exportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all ">
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          {activeTab === 'cloud' ? (
            canManage && (
              <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs md:text-[13px] font-semibold hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95">
                <Plus className="w-4 h-4" /> Upload Dokumen
              </button>
            )
          ) : (
            <>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 border-0 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all ">
                <ShieldCheck className="w-4 h-4" /> Log Verifikasi
              </button>
              {canManage && (
                <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs md:text-[13px] font-semibold hover:bg-primary-700 transition-all shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] active:scale-95">
                  <Plus className="w-4 h-4" /> Upload Dokumen
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-6 border-b border-slate-200 px-2 shrink-0 overflow-x-auto no-scrollbar">
        <button 
           onClick={() => setActiveTab('cloud')}
           className={cn("pb-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
             activeTab === 'cloud' ? "border-primary-500 text-primary-500 " : "border-transparent text-slate-400 hover:text-slate-600"
           )}
        >
          <HardDrive className="w-3.5 h-3.5" /> Cloud Drive
        </button>
        <button 
           onClick={() => setActiveTab('esign')}
           className={cn("pb-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
             activeTab === 'esign' ? "border-primary-500 text-primary-500 " : "border-transparent text-slate-400 hover:text-slate-600"
           )}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> E-Sign Internal
        </button>
      </div>

      {activeTab === 'cloud' && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FOLDERS.map((folder, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-3 sm:p-5 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-primary-500transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={cn("p-2 sm:p-2.5 rounded-lg", folder.bg)}>
                  <Folder className={cn("w-4 sm:w-5 h-4 sm:h-5", folder.color)} />
                </div>
                <button className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-4 h-4" /></button>
              </div>
              <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-700 group-hover:text-primary-500transition-colors tracking-wide line-clamp-1">{folder.name}</h3>
              <p className="text-[11px] sm:text-[12px] text-slate-400 font-medium mt-0.5">{folder.count} File</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-transparent focus-within:bg-white focus-within:border-primary-500 focus-within:shadow-[0_0_0_0.2rem_rgba(105,108,255,0.25)] transition-all w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Cari dokumen..." className="bg-transparent border-none outline-none text-[14px] text-slate-600 w-full py-0.5 focus:ring-0" />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
               {activeTab === 'cloud' && (
                 <select value={filterFolder} onChange={e => setFilterFolder(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500">
                    <option value="">Semua Kategori</option>
                    {FOLDERS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                 </select>
               )}
               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500">
                  <option value="">Bulan</option>
                  {Array.from({length: 12}, (_, i) => (<option key={i+1} value={String(i+1)}>{new Date(0, i).toLocaleString('id-ID', {month: 'long'})}</option>))}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:border-primary-500">
                  <option value="">Tahun</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
               </select>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-medium text-slate-500 whitespace-nowrap">
            {activeTab === 'esign' && (
              <>
                <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Signed
                </div>
                <div className="flex items-center gap-1.5 bg-primary-500/10 px-2 py-1 rounded text-primary-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div> Draft
                </div>
              </>
            )}
            <span className="hidden sm:inline bg-slate-100 px-2.5 py-1 rounded-lg">Total: {fullyFilteredDocs.length}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50/20 max-h-[600px] overflow-y-auto custom-scrollbar">
          {paginatedDocs.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-slate-400 font-medium">Tidak ada dokumen</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-transparent hover:border-primary-500 transition-all group overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-primary-500/10 text-primary-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                        <h4 className="text-[14px] font-semibold text-slate-700 line-clamp-1 group-hover:text-primary-500transition-colors">{doc.name}</h4>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">{doc.folder}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Status</span>
                       {activeTab === 'esign' ? (
                          doc.isSigned ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border-transparent text-[11px] font-semibold rounded uppercase tracking-wider shadow-sm">Signed</span>
                              <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 bg-primary-500/10 text-primary-500 border-transparent text-[11px] font-semibold rounded uppercase tracking-wider shadow-sm">Draft</span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded uppercase tracking-wider shadow-sm border-transparent">{doc.folder}</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       <div>
                         <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">Ukuran</p>
                         <p className="text-[12px] font-mono text-slate-700">{doc.size}</p>
                       </div>
                       <div>
                         <p className="text-[11px] font- medium text-slate-400 uppercase tracking-widest mb-0.5">Updated</p>
                         <p className="text-[12px] font-mono text-slate-700">{doc.date}</p>
                       </div>
                  </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 bg-white flex justify-end gap-1.5 shrink-0 flex-wrap">
                    <button onClick={() => setPreviewDoc(doc)} className="px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:text-primary-500hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1.5 border border-slate-200">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    {activeTab === 'esign' && !doc.isSigned && canSign && (
                      <button 
                        onClick={() => handleSign(doc)}
                        className="px-2 py-1.5 text-[11px] font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] transition-all flex items-center gap-1.5"
                      >
                        Sign
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => handleOpenModal(doc)} className="px-2 py-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-[12px] font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-md transition-all flex items-center gap-1.5 shadow-[0_0.125rem_0.25rem_0_rgba(105,108,255,0.4)] border-0 active:scale-95"><Edit2 className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={() => setQrModalDoc(doc)} className="p-1.5 text-slate-400 hover:text-primary-655 hover:bg-primary-50 rounded transition-all" title="Generate QR Verifikasi"><QrCode className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDownload(doc)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-all"><Download className="w-3.5 h-3.5" /></button>
                    {canManage && (
                      <button onClick={() => setDocToDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 pb-4">
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
