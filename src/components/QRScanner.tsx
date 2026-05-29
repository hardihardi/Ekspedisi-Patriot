import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
        onScan(decodedText);
      },
      (error) => {
        // quiet fail on scan error (it calls this every frame it doesn't find a code)
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm relative font-sans">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors z-10"
        >
          <span className="sr-only">Close</span>
          &times;
        </button>
        <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Scan QR Code Dokumen</h3>
        <div id="reader" className="w-full text-slate-800 rounded-xl overflow-hidden"></div>
      </div>
    </div>
  );
};
