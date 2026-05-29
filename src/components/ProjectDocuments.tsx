import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Download } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface ProjectDocumentsProps {
  projectId: string;
}

export const ProjectDocuments: React.FC<ProjectDocumentsProps> = ({ projectId }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, 'project_documents'), 
      where('projectId', '==', projectId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      // Default to descending order by createdAt locally
      docs.sort((a, b) => {
        const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dbTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dbTime - da;
      });
      setDocuments(docs);
    });
    return () => unsubscribe();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    
    setIsUploading(true);
    try {
      // Simulate slow file upload for a realistic feel
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newDocId = `doc-${Date.now()}`;
      await setDoc(doc(db, 'project_documents', newDocId), {
        projectId,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || 'application/octet-stream',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'project_documents', docId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none mt-4 sm:mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-slate-700">Dokumen Proyek</h3>
        
        <label className="cursor-pointer bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {isUploading ? 'Mengunggah...' : 'Unggah'}
          <input 
            type="file" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading || !projectId}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
        </label>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {documents.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
            <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-[12px] text-slate-500 font-medium tracking-wide">Belum ada dokumen proyek</p>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-lg group transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded bg-primary-100/50 text-primary-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-700 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{doc.size}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button 
                  className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                  title="Unduh (Simulasi)"
                  onClick={() => alert(`Simulasi unduh: ${doc.name}`)}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button 
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                  onClick={() => handleDelete(doc.id)}
                  title="Hapus Dokumen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
