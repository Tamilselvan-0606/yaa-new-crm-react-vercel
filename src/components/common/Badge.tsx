import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'primary'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral'
    | 'purple';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  onClick,
}) => {
  const variantStyles: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-[#33077C]/10 text-[#33077C] border-[#33077C]/20 font-semibold',
    purple: 'bg-purple-50 text-purple-800 border-purple-200 font-semibold',
    accent: 'bg-[#4309A2]/10 text-[#c76e00] border-[#4309A2]/30 font-semibold',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    info: 'bg-sky-50 text-sky-700 border-sky-200 font-semibold',
    neutral: 'bg-zinc-100 text-zinc-600 border-zinc-200 font-semibold',
  };

  const dotColors: Record<string, string> = {
    default: 'bg-slate-400',
    primary: 'bg-[#33077C]',
    purple: 'bg-purple-600',
    accent: 'bg-[#4309A2]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-zinc-400',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2.5 py-0.5 rounded-full',
    md: 'text-[11px] px-3 py-0.5 rounded-full',
    lg: 'text-xs px-3.5 py-1 rounded-full',
  };

  return (
    <span
      id={`badge-${Math.random().toString(36).substr(2, 6)}`}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border whitespace-nowrap transition-colors uppercase tracking-wider font-semibold ${
        variantStyles[variant] || variantStyles.default
      } ${sizeStyles[size]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotColors[variant] || dotColors.default
          }`}
        />
      )}
      {children}
    </span>
  );
};

export const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'converted':
    case 'paid':
    case 'completed':
    case 'published':
      return <Badge variant="success" dot>{status}</Badge>;
    case 'in progress':
    case 'contacted':
    case 'editing':
    case 'designing':
    case 'partially paid':
    case 'expiring soon':
      return <Badge variant="accent" dot>{status}</Badge>;
    case 'interested':
    case 'onboarding':
    case 'review':
    case 'scheduled':
      return <Badge variant="purple" dot>{status}</Badge>;
    case 'new':
    case 'idea':
    case 'client approval':
    case 'pending':
      return <Badge variant="info" dot>{status}</Badge>;
    case 'follow-up':
      return <Badge variant="primary" dot>{status}</Badge>;
    case 'overdue':
    case 'expired':
    case 'lost':
    case 'not interested':
      return <Badge variant="danger" dot>{status}</Badge>;
    default:
      return <Badge variant="default">{status || 'Unknown'}</Badge>;
  }
};

