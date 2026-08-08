import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = (type: ToastType, message: string, duration: number = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  useEffect(() => {
    const handleStorageWarning = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showToast(
        'warning',
        detail?.message || 'Browser storage is getting full. Reports and login data were preserved.',
        8000,
      );
    };

    window.addEventListener('cardiodetect-storage-warning', handleStorageWarning);
    return () => window.removeEventListener('cardiodetect-storage-warning', handleStorageWarning);
  }, []);
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isLeaving, setIsLeaving] = useState(false);
  
  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };
  
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-[var(--success-color)]',
      textColor: 'text-white'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-[var(--error-color)]',
      textColor: 'text-white'
    },
    info: {
      icon: Info,
      bgColor: 'bg-[var(--info-color)]',
      textColor: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-[var(--warning-color)]',
      textColor: 'text-white'
    }
  };
  
  const { icon: Icon, bgColor, textColor } = config[toast.type];
  
  return (
    <div 
      className={`
        ${bgColor} ${textColor}
        px-4 py-3 rounded-lg shadow-lg
        flex items-center gap-3
        min-w-[320px]
        transition-all duration-300
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
