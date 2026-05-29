import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

interface ProjectQRCodeProps {
  projectId: string;
  projectName: string;
}

export const ProjectQRCode: React.FC<ProjectQRCodeProps> = ({ projectId, projectName }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Construct the tracking URL. In production, this might point to a public public status page.
  const trackingUrl = `${window.location.origin}/verify?id=${encodeURIComponent(projectId)}`;

  const handlePrint = () => {
    // Open a new window and print the QR code
    const printWindow = window.open('', '_blank');
    if (printWindow && qrRef.current) {
      const qrHtml = qrRef.current.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${projectName}</title>
            <style>
              body {
                font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #ffffff;
                color: #0f172a;
              }
              .qr-container {
                padding: 3rem;
                border: 2px dashed #cbd5e1;
                border-radius: 1rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              h1 {
                font-size: 1.5rem;
                margin-top: 2rem;
                margin-bottom: 0.5rem;
              }
              p {
                color: #64748b;
                font-size: 0.875rem;
                margin: 0;
              }
              .url-text {
                margin-top: 1rem;
                font-size: 0.75rem;
                font-family: monospace;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              ${qrHtml}
              <h1>${projectName}</h1>
              <p>Scan untuk mengecek status proyek</p>
              <div class="url-text">${trackingUrl}</div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                // setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border-none">
      <div className="mb-4 text-center">
         <h3 className="text-sm font-semibold text-slate-800">QR Code Tracking</h3>
         <p className="text-xs text-slate-500 mt-1">Cetak dan tempel di area fisik proyek</p>
      </div>

      <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
        <QRCodeSVG 
          value={trackingUrl} 
          size={160}
          level="H"
          includeMargin={false}
        />
      </div>

      <button 
        onClick={handlePrint}
        className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Cetak Label QR
      </button>
    </div>
  );
};
