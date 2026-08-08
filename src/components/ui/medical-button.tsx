import React from 'react';
import { Loader2 } from 'lucide-react';

interface MedicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  loading?: boolean;
  children: React.ReactNode;
}

export function MedicalButton({ 
  variant = 'primary', 
  loading = false, 
  children, 
  className = '',
  disabled,
  ...props 
}: MedicalButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-dark)] active:bg-[var(--primary-dark)] shadow-sm hover:shadow-md',
    secondary: 'bg-white dark:bg-gray-800 text-[var(--text-color)] dark:text-white border-2 border-[var(--border-color)] dark:border-gray-700 hover:bg-[var(--bg-light)] dark:hover:bg-gray-700 active:bg-[var(--bg-gray)] shadow-sm',
    danger: 'bg-[var(--error-color)] text-white hover:bg-[var(--error-dark)] active:bg-[var(--error-dark)] shadow-sm hover:shadow-md',
    success: 'bg-[var(--success-color)] text-white hover:bg-[var(--success-dark)] active:bg-[var(--success-dark)] shadow-sm hover:shadow-md',
    outline: 'bg-transparent text-[var(--text-color)] border-2 border-[var(--border-color)] hover:bg-[var(--bg-light)] active:bg-[var(--bg-gray)]',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
