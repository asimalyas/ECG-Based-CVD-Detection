import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MedicalCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MedicalCard({ children, className = '', onClick }: MedicalCardProps) {
  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 text-[var(--text-color)] rounded-lg shadow-sm border border-[var(--border-color)] dark:border-gray-700
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-gray-800 text-[var(--text-color)] border-[var(--border-color)] dark:border-gray-700',
    primary: 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-dark)] text-white border-transparent',
    success: 'bg-gradient-to-br from-[var(--success-color)] to-[var(--success-dark)] text-white border-transparent',
    warning: 'bg-gradient-to-br from-[var(--warning-color)] to-[var(--warning-dark)] text-white border-transparent',
    error: 'bg-gradient-to-br from-[var(--error-color)] to-[var(--error-dark)] text-white border-transparent'
  };
  
  const isColored = variant !== 'default';
  
  return (
    <div className={`
      rounded-lg shadow-sm border p-6
      ${variantStyles[variant]}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm ${isColored ? 'text-white text-opacity-90' : 'text-[var(--text-secondary)]'}`}>
            {title}
          </p>
          <h3 className={`mt-2 ${isColored ? 'text-white' : 'text-[var(--text-color)]'}`}>
            {value}
          </h3>
          {trend && (
            <p className={`text-sm mt-2 ${isColored ? 'text-white text-opacity-90' : 'text-[var(--text-secondary)]'}`}>
              <span className={trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
              </span>
            </p>
          )}
        </div>
        {Icon && (
          <div className={`
            p-3 rounded-lg
            ${isColored ? 'bg-white bg-opacity-20' : 'bg-[var(--bg-light)]'}
          `}>
            <Icon className={`w-6 h-6 ${isColored ? 'text-white' : 'text-[var(--primary-color)]'}`} />
          </div>
        )}
      </div>
    </div>
  );
}

interface ReportCardProps {
  title: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  patientName?: string;
  onClick?: () => void;
}

export function ReportCard({ title, date, status, patientName, onClick }: ReportCardProps) {
  const statusConfig = {
    pending: { color: 'bg-[var(--warning-color)]', text: 'Pending' },
    approved: { color: 'bg-[var(--success-color)]', text: 'Approved' },
    rejected: { color: 'bg-[var(--error-color)]', text: 'Rejected' }
  };
  
  const { color, text } = statusConfig[status];
  
  return (
    <MedicalCard onClick={onClick}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4>{title}</h4>
            {patientName && (
              <p className="text-[var(--text-secondary)] mt-1">{patientName}</p>
            )}
            <p className="text-sm text-[var(--text-secondary)] mt-2">{date}</p>
          </div>
          <div className={`px-3 py-1 rounded-full ${color} text-white text-sm`}>
            {text}
          </div>
        </div>
      </div>
    </MedicalCard>
  );
}
