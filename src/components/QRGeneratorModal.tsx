import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { QrCode, Download, X, ShieldCheck, Calendar, Folder, CheckCircle, Info } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: {
    id: string;
    name: string;
    folder: string;
    size: string;
    date: string;
    isSigned: boolean;
    signedBy?: string;
  } | null;
}

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({ isOpen, onClose, documentData }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen || !documentData) return null;

  const verificationUrl = `${window.location.origin}/verify?id=${documentData.id}`;

  const handleDownloadPNG = () => {
    // Create offscreen canvas for higher-quality rendering
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw dual-tone elegant borders
    // Outer border (slate-200)
    ctx.strokeStyle = '#e2e8f0'; 
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

    // Inner brand border (primary-600 / index 818cf8)
    ctx.strokeStyle = '#6366f1'; 
    ctx.lineWidth = 2.5;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // 3. Draw Header Title
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText('PORTAL VERIFIKASI DOKUMEN FISIK', 36, 48);

    ctx.fillStyle = '#475569'; // slate-600
    ctx.font = 'semibold 10px Inter, system-ui, sans-serif';
    ctx.fillText('KEMENTERIAN TRANSMIGRASI REPUBLIK INDONESIA', 36, 65);

    // Draw division line
    ctx.beginPath();
    ctx.moveTo(36, 76);
    ctx.lineTo(canvas.width - 36, 76);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Draw Metadata (labels and values)
    const labelX = 230;
    const startY = 110;
    const verticalGap = 26;

    // Help draw label columns
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = 'bold 8.5px Inter, system-ui, sans-serif';
    ctx.fillText('NAMA DOKUMEN', labelX, startY);
    ctx.fillText('DOKUMEN ID', labelX, startY + verticalGap);
    ctx.fillText('KATEGORI FOLDER', labelX, startY + verticalGap * 2);
    ctx.fillText('STATUS VERIFIKASI TTE', labelX, startY + verticalGap * 3);
    ctx.fillText('TANGGAL UPDATE', labelX, startY + verticalGap * 4);

    // Help draw values
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    
    // Truncate name if necessary
    let docName = documentData.name || '';
    if (docName.length > 36) {
      docName = docName.substring(0, 33) + '...';
    }
    ctx.fillText(docName, labelX, startY + 14);

    // ID
    ctx.font = 'bold 12px monospace';
    ctx.fillText(documentData.id || '-', labelX, startY + verticalGap + 14);

    // Folder
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.fillText(documentData.folder || '-', labelX, startY + verticalGap * 2 + 14);

    // Verification / Signature Status
    if (documentData.isSigned) {
      ctx.fillStyle = '#059669'; // Emerald-600
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText('SIGNED / TTE ELEKTRONIK SAH', labelX, startY + verticalGap * 3 + 14);

      ctx.font = '8px monospace';
      ctx.fillText(`BY: ${documentData.signedBy || 'Sistem Internal'}`, labelX, startY + verticalGap * 3 + 24);
    } else {
      ctx.fillStyle = '#d97706'; // Amber-600
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText('DRAFT / BELUM DITANDATANGANI', labelX, startY + verticalGap * 3 + 14);
    }

    // Date
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(documentData.date || '-', labelX, startY + verticalGap * 4 + 14);

    // 5. Embed the rendered QR Code
    const qrCanvasElement = document.getElementById(`qr-canvas-${documentData.id}`) as HTMLCanvasElement;
    if (qrCanvasElement) {
      ctx.drawImage(qrCanvasElement, 40, 100, 150, 150);
    }

    // 6. Draw Footer Guidelines
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'italic 8.5px Inter, system-ui, sans-serif';
    ctx.fillText('* Tempelkan label ini pada salinan fisik / berkas arsip kertas.', 36, 298);
    ctx.fillText('* Pindai QR di atas menggunakan Portal Validasi untuk mencocokan keaslian dokumen.', 36, 312);

    // 7. Draw Visual security stamp
    ctx.strokeStyle = documentData.isSigned ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(540, 275, 34, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = documentData.isSigned ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)';
    ctx.fill();

    ctx.fillStyle = documentData.isSigned ? '#059669' : '#d97706';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(documentData.isSigned ? 'VALID' : 'DRAFT', 540, 272);
    ctx.font = 'bold 7px Inter, system-ui, sans-serif';
    ctx.fillText('KEMEN-TSM', 540, 282);
    ctx.textAlign = 'left'; // reset text alignment for next drawing operations

    // 8. Initiate download
    const imgUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imgUrl;
    downloadLink.download = `VERIFIKASI_QR_${documentData.name.replace(/\.[^/.]+$/, "")}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 animate-pulse-slow" />
            Generate QR Code Verifikasi Fisik
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable on shorter devices */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
            Hasilkan label verifikasi fisik resmi yang terintegrasi dengan portal validasi. 
            Anda dapat mengunduh label ini sebagai gambar PNG beresolusi tinggi, mencetaknya, dan menempelkannya pada salinan dokumen cetak/fisik.
          </p>

          {/* Label Card Visual Representative Preview */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-gradient-to-tr from-slate-50 to-white shadow-inner flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden">
            {/* Embedded QR Canvas Source for Capture - responsive styled screen preview */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-center shrink-0">
              <QRCodeCanvas
                id={`qr-canvas-${documentData.id}`}
                value={verificationUrl}
                size={256}
                level="H"
                includeMargin={false}
                className="w-28 h-28 sm:w-32 sm:h-32"
              />
            </div>

            {/* Content Preview */}
            <div className="flex-1 space-y-2.5 w-full">
              <div className="border-b border-slate-100 pb-1.5 text-center sm:text-left">
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 tracking-wider block uppercase">Kementerian Transmigrasi RI</span>
                <span className="text-xs font-black text-slate-800 tracking-tight uppercase">Portal Verifikasi Dokumen Cetak</span>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-2.5 text-xs">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Nama Dokumen</span>
                  <span className="font-bold text-slate-700 block truncate" title={documentData.name}>{documentData.name}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Dokumen ID</span>
                  <span className="font-mono text-slate-700 block truncate select-all">{documentData.id}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Folder / Kategori</span>
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <Folder className="w-3 h-3 text-slate-400 shrink-0" /> <span className="truncate">{documentData.folder}</span>
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Diperbarui</span>
                  <span className="font-mono text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" /> <span className="truncate">{documentData.date}</span>
                  </span>
                </div>
              </div>

              <div className="pt-1.5 flex flex-col items-center sm:items-start">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Keaslian TTE</span>
                {documentData.isSigned ? (
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-max">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> SIGNED & VALID
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 w-max">
                    <Info className="w-3.5 h-3.5 text-amber-600" /> DRAFT / BELUM TTE
                  </div>
                )}
              </div>
            </div>

            {/* Decorative validation stamp in background - Hidden on tiny layouts to save room */}
            <div className="absolute right-4 bottom-4 w-12 h-12 border-2 border-dashed border-indigo-500/10 rounded-full hidden min-[420px]:flex items-center justify-center text-[8px] font-black text-indigo-500/15 uppercase rotate-12 pointer-events-none">
              VERIFIED
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-3 sm:p-4 border border-indigo-100 flex gap-2.5 sm:gap-3 text-indigo-800">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs space-y-1 min-w-0">
              <span className="font-bold">Informasi Penyematan Link:</span>
              <p className="leading-relaxed text-indigo-900/80">
                Gambar QR Code di atas berisi detail tautan verifikasi digital mandiri:
                <br />
                <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px] break-all border border-indigo-100 block mt-1 select-all">
                  {verificationUrl}
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions - Responsive stacking structure */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
          <button 
            onClick={handleDownloadPNG}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 border-0 active:scale-95"
          >
            <Download className="w-4 h-4" /> Unduh PNG Verifikasi
          </button>
        </div>
      </motion.div>
    </div>
  );
};
