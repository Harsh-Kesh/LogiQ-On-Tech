'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  return (
    <div
      className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 ${
        type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : type === 'error'
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : type === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-sky-50 border-sky-200 text-sky-900'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        {type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
        {type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
        {type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
        <span className="text-xs font-bold">{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-900'
                : t.type === 'error'
                ? 'bg-white border-rose-200 text-slate-900'
                : t.type === 'warning'
                ? 'bg-white border-amber-200 text-slate-900'
                : 'bg-white border-sky-200 text-slate-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
              {t.message && <p className="text-[11px] text-slate-500 leading-normal">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-900 p-1 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
