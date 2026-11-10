import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  findDocumentLineage,
  inferDocType,
  SalesDocumentLineage,
  SalesDocType,
} from '../../utils/salesDocumentWorkflow';
import { ExternalLink, ArrowRight, Link as LinkIcon } from 'lucide-react';

interface DocumentLineageBadgesProps {
  docRef?: string | null;
  currentType: SalesDocType;
  className?: string;
  sourceDocNo?: string;
  sourceDocType?: SalesDocType;
  /** The document this one was converted INTO, as the API reports it (shown as a "To" badge). */
  targetDocNo?: string | null;
  targetDocType?: SalesDocType;
  compact?: boolean;
}

export const DocumentLineageBadges: React.FC<DocumentLineageBadgesProps> = ({
  docRef,
  currentType,
  className = '',
  sourceDocNo,
  sourceDocType,
  targetDocNo,
  targetDocType,
  compact = false,
}) => {
  const navigate = useNavigate();

  const resolveLineage = useCallback((): SalesDocumentLineage | undefined => {
    return (
      findDocumentLineage(docRef, currentType) ||
      (sourceDocNo ? findDocumentLineage(sourceDocNo, sourceDocType) : undefined)
    );
  }, [docRef, currentType, sourceDocNo, sourceDocType]);

  const [lineage, setLineage] = useState<SalesDocumentLineage | undefined>(resolveLineage);

  useEffect(() => {
    const handleUpdate = () => {
      setLineage(resolveLineage());
    };
    window.addEventListener('yaa_crm_lineage_updated', handleUpdate);
    handleUpdate();
    return () => {
      window.removeEventListener('yaa_crm_lineage_updated', handleUpdate);
    };
  }, [resolveLineage]);

  // If no lineage and no explicit sourceDocNo, return null
  if (!lineage && !sourceDocNo && !targetDocNo) return null;

  // For Estimate, ensure the lineage actually belongs to this estimate
  if (currentType === 'Estimate' && lineage && docRef) {
    const cleanRef = docRef.trim().toLowerCase();
    const matchesEstimate = Boolean(
      (lineage.estimateNo && lineage.estimateNo.toLowerCase() === cleanRef) ||
      (lineage.estimateId && lineage.estimateId.toLowerCase() === cleanRef)
    );
    if (!matchesEstimate) {
      return null;
    }
  }

  // Estimate (0) -> Proforma (1) -> Order (2) -> Challan (3) -> Invoice (4)
  const orderRank: Record<SalesDocType, number> = { Estimate: 0, Proforma: 1, Order: 2, Challan: 3, Invoice: 4 };

  const resolvedSourceDocNo = sourceDocNo?.trim();
  const inferredSourceType = sourceDocType || inferDocType(resolvedSourceDocNo);
  // A "From" reference must be an EARLIER document. A reference that names a later (or the same) kind is not a source.
  const effectiveSourceType =
    inferredSourceType && orderRank[inferredSourceType] < orderRank[currentType] ? inferredSourceType : undefined;
  const effectiveSourceDocNo = effectiveSourceType ? resolvedSourceDocNo : undefined;

  // The destination, from the API. It must be a LATER document than this one.
  const resolvedTargetNo = targetDocNo?.toString().trim();
  const inferredTargetType = resolvedTargetNo ? targetDocType || inferDocType(resolvedTargetNo) : undefined;
  const effectiveTargetType = inferredTargetType && orderRank[inferredTargetType] > orderRank[currentType] ? inferredTargetType : undefined;
  const effectiveTargetNo = effectiveTargetType ? resolvedTargetNo : undefined;

  const est = lineage?.estimateNo || (effectiveSourceType === 'Estimate' ? effectiveSourceDocNo : undefined);
  const pi = lineage?.proformaNo || (effectiveSourceType === 'Proforma' ? effectiveSourceDocNo : undefined) || (effectiveTargetType === 'Proforma' ? effectiveTargetNo : undefined);
  const so = lineage?.orderNo || (effectiveSourceType === 'Order' ? effectiveSourceDocNo : undefined) || (effectiveTargetType === 'Order' ? effectiveTargetNo : undefined);
  const dc = lineage?.challanNo || (effectiveSourceType === 'Challan' ? effectiveSourceDocNo : undefined) || (effectiveTargetType === 'Challan' ? effectiveTargetNo : undefined);
  const inv = lineage?.invoiceNo || (effectiveSourceType === 'Invoice' ? effectiveSourceDocNo : undefined) || (effectiveTargetType === 'Invoice' ? effectiveTargetNo : undefined);

  const items: Array<{
    type: SalesDocType;
    label: string;
    docNo: string;
    path: string;
    isUpstream: boolean;
    isDownstream: boolean;
    color: string;
  }> = [];

  const currentRank = orderRank[currentType];

  if (est && currentType !== 'Estimate') {
    items.push({
      type: 'Estimate',
      label: 'EST',
      docNo: est,
      path: `/sale-management/sales/quotation?search=${encodeURIComponent(est)}`,
      isUpstream: currentRank > 0,
      isDownstream: currentRank < 0,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    });
  }

  if (pi && currentType !== 'Proforma') {
    items.push({
      type: 'Proforma',
      label: 'PI',
      docNo: pi,
      path: `/sale-management/sales/proforma?search=${encodeURIComponent(pi)}`,
      isUpstream: currentRank > 1,
      isDownstream: currentRank < 1,
      color: 'bg-purple-50 text-[#33077C] border-purple-200 hover:bg-purple-100',
    });
  }

  if (so && currentType !== 'Order') {
    items.push({
      type: 'Order',
      label: 'SO',
      docNo: so,
      path: `/sale-management/sales/sale-order?search=${encodeURIComponent(so)}`,
      isUpstream: currentRank > 2,
      isDownstream: currentRank < 2,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    });
  }

  if (dc && currentType !== 'Challan') {
    items.push({
      type: 'Challan',
      label: 'DC',
      docNo: dc,
      path: `/sale-management/sales/delivery-challan?search=${encodeURIComponent(dc)}`,
      isUpstream: currentRank > 3,
      isDownstream: currentRank < 3,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    });
  }

  if (inv && currentType !== 'Invoice') {
    items.push({
      type: 'Invoice',
      label: 'INV',
      docNo: inv,
      path: `/sale-management/sales/sale?search=${encodeURIComponent(inv)}`,
      isUpstream: false,
      isDownstream: true,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    });
  }

  if (items.length === 0) return null;

  const justifyClass = className.includes('justify-') ? '' : 'justify-center';

  return (
    <div
      className={`w-full flex items-center ${justifyClass} gap-1 flex-wrap text-center ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={`${item.type}_${item.docNo}`}
          type="button"
          onClick={() => navigate(item.path)}
          title={`${item.isUpstream ? 'Created from' : item.isDownstream ? 'Converted to' : 'Linked'} ${item.type}: ${item.docNo} (click to open)`}
          className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer shadow-2xs select-none ${item.color}`}
        >
          {item.isUpstream && <span className="text-[8.5px] opacity-70 font-semibold uppercase tracking-tight">From</span>}
          {item.isDownstream && <span className="text-[8.5px] opacity-70 font-semibold uppercase tracking-tight">To</span>}
          <span className="truncate max-w-[150px] sm:max-w-[190px]">
            {item.label}: {item.docNo}
          </span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
        </button>
      ))}
    </div>
  );
};
