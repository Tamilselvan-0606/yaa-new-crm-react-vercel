import React from 'react';

export interface StatusTone {
  wrap: string;
  dot: string;
  pulse?: boolean;
}

const INACTIVE_SLATE: StatusTone = { wrap: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' };
const SUSPENDED_AMBER: StatusTone = { wrap: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
const ACTIVE_GREEN: StatusTone = { wrap: 'bg-emerald-50/90 text-emerald-700 border-emerald-300/80', dot: 'bg-emerald-500' };

/** Default colours: Active green, Suspended / Suspend amber, everything else slate. */
export const DEFAULT_STATUS_TONES: Record<string, StatusTone> = {
  Active: ACTIVE_GREEN,
  Suspended: SUSPENDED_AMBER,
  Suspend: SUSPENDED_AMBER,
  Inactive: INACTIVE_SLATE,
  Pending: INACTIVE_SLATE,
};

/** Organization screens use a pulsing green dot and rose for Inactive. */
export const ORGANIZATION_STATUS_TONES: Record<string, StatusTone> = {
  ...DEFAULT_STATUS_TONES,
  Active: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', pulse: true },
  Suspend: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Inactive: { wrap: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  Pending: { wrap: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
};

interface StatusBadgeProps {
  status?: string | null;
  tones?: Record<string, StatusTone>;
  className?: string;
}

/** Status pill with a coloured dot. Unknown or empty statuses are shown as "Active". */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, tones = DEFAULT_STATUS_TONES, className = '' }) => {
  const key = status && tones[status] ? status : 'Active';
  const tone = tones[key];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-2xs ${tone.wrap} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot} ${tone.pulse ? 'animate-pulse' : ''}`} />
      <span>{key}</span>
    </span>
  );
};
