import React from 'react';

interface MedicalBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export function MedicalBadge({ children, variant = 'default', size = 'md' }: MedicalBadgeProps) {
  const variantStyles = {
    default: 'bg-[var(--bg-gray)] text-[var(--text-color)]',
    primary: 'bg-[var(--primary-color)] text-white',
    success: 'bg-[var(--success-color)] text-white',
    warning: 'bg-[var(--warning-color)] text-white',
    error: 'bg-[var(--error-color)] text-white',
    info: 'bg-[var(--info-color)] text-white'
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  return (
    <span className={`
      inline-flex items-center rounded-full
      ${variantStyles[variant]}
      ${sizeStyles[size]}
    `}>
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'processing' | 'reviewed';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    pending: { variant: 'warning' as const, text: 'Pending' },
    approved: { variant: 'success' as const, text: 'Approved' },
    rejected: { variant: 'error' as const, text: 'Rejected' },
    active: { variant: 'success' as const, text: 'Active' },
    inactive: { variant: 'default' as const, text: 'Inactive' },
    processing: { variant: 'info' as const, text: 'Processing' },
    reviewed: { variant: 'success' as const, text: 'Reviewed' }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <MedicalBadge variant={config.variant} size={size}>
      {config.text}
    </MedicalBadge>
  );
}