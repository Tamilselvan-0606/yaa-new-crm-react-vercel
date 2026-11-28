import React, { useEffect, useState } from 'react';
import { customerApi } from '../../api/commerce/customerApi';
import { supplierApi } from '../../api/commerce/supplierApi';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const formatPartyBalance = (amount: number): string =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const extractCustomerOutstanding = (cust: any): number | null => {
  if (!cust) return null;
  const raw = cust.outstandingBalance ?? cust.outstandingAmount ?? cust.openingBalance;
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const extractSupplierOutstanding = (sup: any): number | null => {
  if (!sup) return null;
  const raw =
    sup.purchaseSummary?.balance ??
    sup.payable ??
    sup.outstandingBalance ??
    sup.outstandingAmount;
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

interface PartyBalanceBadgeProps {
  balance?: number | null;
  /** Optional prefix label (defaults to "Party Balance", e.g. "Customer Balance"). */
  label?: string;
  /** Optional fallback lookup when a read-only view only has the customer id. */
  customerId?: string;
  /** Optional fallback lookup when a read-only view only has the supplier id. */
  supplierId?: string;
}

/** Displays "<Label>: ₹0.00" aligned to the right of the Customer/Supplier label, matching mobile UI. */
export const PartyBalanceBadge: React.FC<PartyBalanceBadgeProps> = ({
  balance,
  label = 'Party Balance',
  customerId,
  supplierId,
}) => {
  const [fetched, setFetched] = useState<{ key: string; value: number } | null>(null);
  const directValid =
    balance !== null && balance !== undefined && Number.isFinite(Number(balance));
  const lookupKey = customerId ? `c:${customerId}` : supplierId ? `s:${supplierId}` : '';

  useEffect(() => {
    if (directValid) return;
    if (customerId && UUID_RE.test(customerId)) {
      let alive = true;
      customerApi
        .getCustomerById(customerId)
        .then((res) => {
          if (!alive || !res?.data) return;
          const bal = extractCustomerOutstanding(res.data);
          if (bal !== null) setFetched({ key: `c:${customerId}`, value: bal });
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }
    if (supplierId && UUID_RE.test(supplierId)) {
      let alive = true;
      supplierApi
        .getSupplierById(supplierId)
        .then((res) => {
          if (!alive || !res?.data) return;
          const bal = extractSupplierOutstanding(res.data);
          if (bal !== null) setFetched({ key: `s:${supplierId}`, value: bal });
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }
  }, [directValid, customerId, supplierId]);

  const resolved = directValid
    ? Number(balance)
    : fetched && fetched.key === lookupKey
      ? fetched.value
      : null;

  if (resolved === null || !Number.isFinite(resolved)) {
    return null;
  }

  return (
    <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
      {label}:{' '}
      <span className="font-semibold text-emerald-600 font-mono">
        {formatPartyBalance(resolved)}
      </span>
    </span>
  );
};
