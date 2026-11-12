import React from 'react';
import { User, Phone } from 'lucide-react';

interface CustomerCellProps {
  name?: string | null;
  code?: string | null;
  phone?: string | null;
  company?: string | null;
  /** Optional extra line under the phone (e.g. an invoice number). */
  children?: React.ReactNode;
  onNameClick?: () => void;
}

/**
 * Standard customer cell for the sale-management tables: avatar, bold name, customer-code chip and phone chip
 * stacked in that order (same look as the Sales Invoice / Estimate customer column).
 */
export const CustomerCell: React.FC<CustomerCellProps> = ({ name, code, phone, company, children, onNameClick }) => {
  const showPhone = phone && phone !== 'N/A';
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-[#33077C]" />
      </div>
      <div className="flex flex-col items-start min-w-0">
        {onNameClick ? (
          <button
            type="button"
            onClick={onNameClick}
            className="font-bold text-slate-900 text-xs sm:text-[13px] text-left hover:text-[#33077C] hover:underline cursor-pointer"
          >
            {name || '—'}
          </button>
        ) : (
          <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{name || '—'}</span>
        )}
        {company && <span className="text-[10px] text-slate-400 font-medium">{company}</span>}
        {code && (
          <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200/80">
            {code}
          </span>
        )}
        {showPhone && (
          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold font-mono tracking-tight">
            <Phone className="w-3 h-3 text-[#33077C] shrink-0" />
            {phone}
          </span>
        )}
        {children}
      </div>
    </div>
  );
};

export default CustomerCell;
