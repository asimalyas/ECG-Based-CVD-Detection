import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface MedicalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  success?: boolean;
}

export function MedicalInput({ 
  label, 
  error, 
  helperText, 
  required, 
  success = false,
  className = '',
  id,
  ...props 
}: MedicalInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[var(--text-color)]">
          {label}
          {required && <span className="text-[var(--error-color)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          className={`
            px-3 py-2 
            bg-[var(--input-background)] 
            text-[var(--text-color)]
            border-2 
            ${error ? 'border-[var(--error-color)]' : success ? 'border-[#388E3C]' : 'border-[var(--border-color)]'}
            rounded-lg 
            transition-colors
            focus:outline-none 
            focus:border-[var(--primary-color)] 
            focus:ring-2 
            focus:ring-[var(--primary-color)] 
            focus:ring-opacity-20
            disabled:opacity-50 
            disabled:cursor-not-allowed
            w-full
            ${className}
          `}
          {...props}
        />
        {success && !error && (
          <CheckCircle className="w-4 h-4 text-[#388E3C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-[var(--error-color)]" role="alert">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {helperText && !error && (
        <span className="text-sm text-[var(--text-secondary)]">{helperText}</span>
      )}
    </div>
  );
}

interface MedicalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  success?: boolean;
}

export function MedicalTextarea({ 
  label, 
  error, 
  helperText, 
  required, 
  success = false,
  className = '',
  id,
  ...props 
}: MedicalTextareaProps) {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[var(--text-color)]">
          {label}
          {required && <span className="text-[var(--error-color)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          className={`
            px-3 py-2 
            bg-[var(--input-background)] 
            text-[var(--text-color)]
            border-2 
            ${error ? 'border-[var(--error-color)]' : success ? 'border-[#388E3C]' : 'border-[var(--border-color)]'}
            rounded-lg 
            transition-colors
            focus:outline-none 
            focus:border-[var(--primary-color)] 
            focus:ring-2 
            focus:ring-[var(--primary-color)] 
            focus:ring-opacity-20
            disabled:opacity-50 
            disabled:cursor-not-allowed
            resize-vertical
            w-full
            ${className}
          `}
          {...props}
        />
        {success && !error && (
          <CheckCircle className="w-4 h-4 text-[#388E3C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-[var(--error-color)]" role="alert">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {helperText && !error && (
        <span className="text-sm text-[var(--text-secondary)]">{helperText}</span>
      )}
    </div>
  );
}

interface MedicalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  success?: boolean;
  options: { value: string; label: string }[];
}

export function MedicalSelect({ 
  label, 
  error, 
  helperText, 
  required, 
  success = false,
  options,
  className = '',
  id,
  ...props 
}: MedicalSelectProps) {
  const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[var(--text-color)]">
          {label}
          {required && <span className="text-[var(--error-color)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          className={`
            px-3 py-2 
            bg-[var(--input-background)] 
            text-[var(--text-color)]
            border-2 
            ${error ? 'border-[var(--error-color)]' : success ? 'border-[#388E3C]' : 'border-[var(--border-color)]'}
            rounded-lg 
            transition-colors
            focus:outline-none 
            focus:border-[var(--primary-color)] 
            focus:ring-2 
            focus:ring-[var(--primary-color)] 
            focus:ring-opacity-20
            disabled:opacity-50 
            disabled:cursor-not-allowed
            w-full
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {success && !error && (
          <CheckCircle className="w-4 h-4 text-[#388E3C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-[var(--error-color)]" role="alert">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {helperText && !error && (
        <span className="text-sm text-[var(--text-secondary)]">{helperText}</span>
      )}
    </div>
  );
}
