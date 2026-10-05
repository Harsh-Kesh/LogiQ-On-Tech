import React from 'react';

export type BadgeVariant = 'purple' | 'indigo' | 'teal' | 'amber' | 'sky' | 'rose' | 'slate' | 'success' | 'danger' | 'warning' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'indigo', size = 'sm', className = '' }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-[#eff6ff] text-[#1e3a8a] border-[#bfdbfe]',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    success: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
    amber: 'bg-[#fefce8] text-[#854d0e] border-[#fde68a]',
    warning: 'bg-[#fefce8] text-[#854d0e] border-[#fde68a]',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    rose: 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]',
    danger: 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-[#fafafa] text-[#71717a] border-[#e4e4e7]',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
    md: 'px-3 py-1 text-xs font-bold uppercase tracking-wider',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
