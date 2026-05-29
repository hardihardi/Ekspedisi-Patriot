import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDestructive = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-full shrink-0",
                  isDestructive ? "bg-red-50 text-red-600" : "bg-primary- text-primary-"
                )}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-500 mt-2">{message}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors rounded-lg shadow-sm",
                  isDestructive 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-primary- hover:bg-primary-"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
