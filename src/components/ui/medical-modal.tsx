import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { MedicalButton } from './medical-button';

interface MedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function MedicalModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  variant = 'default',
  size = 'md'
}: MedicalModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  const variantStyles = {
    default: 'border-t-4 border-t-[var(--primary-color)]',
    danger: 'border-t-4 border-t-[var(--error-color)]',
    info: 'border-t-4 border-t-[var(--info-color)]'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 backdrop-blur-[1px]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
        onClick={onClose}
      />
      <div className={`
        relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg shadow-xl w-full mx-4 border border-gray-200 dark:border-gray-700
        ${sizeClasses[size]}
        ${variantStyles[variant]}
        max-h-[90vh] flex flex-col
      `}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className={variant === 'danger' ? 'text-[var(--error-color)] dark:text-red-400' : 'text-[var(--text-color)]'}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-[var(--bg-light)] dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border-color)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false
}: ConfirmModalProps) {
  return (
    <MedicalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      footer={
        <>
          <MedicalButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </MedicalButton>
          <MedicalButton 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </MedicalButton>
        </>
      }
    >
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
    </MedicalModal>
  );
}
