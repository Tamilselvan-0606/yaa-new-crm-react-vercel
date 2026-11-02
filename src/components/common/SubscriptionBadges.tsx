import React from 'react';

/** Pill colours for a subscription's lifecycle status. Anything unknown (Onboarding, ...) falls back to cyan. */
const SUBSCRIPTION_STATUS_CLASSES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-600',
  'Expiring Soon': 'bg-amber-50 text-amber-600',
  Expired: 'bg-rose-50 text-rose-600',
  Cancelled: 'bg-slate-100 text-slate-600',
};
const SUBSCRIPTION_STATUS_FALLBACK = 'bg-cyan-50 text-cyan-600';

/** Active / Expiring Soon / Expired / Cancelled pill used by every subscription table. */
export const SubscriptionStatusBadge: React.FC<{ status?: string | null; className?: string }> = ({ status, className = '' }) => (
  <span
    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
      SUBSCRIPTION_STATUS_CLASSES[status ?? ''] ?? SUBSCRIPTION_STATUS_FALLBACK
    } ${className}`}
  >
    {status}
  </span>
);

/** Active / Inactive pill for subscription plans (rose when inactive, green otherwise). */
export const PlanStatusBadge: React.FC<{ status?: string | null }> = ({ status }) => (
  <span
    className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
      status === 'Inactive' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
    }`}
  >
    {status || 'Active'}
  </span>
);

/** Dot colours handed out by name. The API has no colour field, so a name always maps to the same colour. */
const DOT_PALETTE = [
  'bg-indigo-600',
  'bg-cyan-500',
  'bg-purple-600',
  'bg-amber-500',
  'bg-emerald-600',
  'bg-rose-500',
  'bg-blue-600',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
];

/** Stable colour for any label (plan, product, ...) with no names hardcoded: same name, same colour. */
export const dotColorFor = (name?: string | null): string => {
  const key = (name || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return DOT_PALETTE[hash % DOT_PALETTE.length];
};

/** Coloured dot + plan name. The name comes from the API; the colour is derived from it. */
export const PlanBadge: React.FC<{ planName?: string | null }> = ({ planName }) => (
  <div className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full shrink-0 ${dotColorFor(planName)}`} />
    <span className="text-xs sm:text-[13px] font-bold text-slate-900">{planName}</span>
  </div>
);
