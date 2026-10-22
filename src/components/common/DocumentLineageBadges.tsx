import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  findDocumentLineage,
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
  compact?: boolean;
}

export const DocumentLineageBadges: React.FC<DocumentLineageBadgesProps> = ({
  docRef,
  currentType,
  className = '',
  sourceDocNo,
  sourceDocType,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [lineage, setLineage] = useState<SalesDocumentLineage | undefined>(() =>
    findDocumentLineage(docRef || sourceDocNo)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setLineage(findDocumentLineage(docRef || sourceDocNo));
    };
    window.addEventListener('yaa_crm_lineage_updated', handleUpdate);
    handleUpdate();
    return () => {
      window.removeEventListener('yaa_crm_lineage_updated', handleUpdate);
    };
  }, [docRef, sourceDocNo]);

  // If no lineage and no explicit sourceDocNo, return null
  if (!lineage && !sourceDocNo) return null;

  const est = lineage?.estimateNo || (sourceDocType === 'Estimate' ? sourceDocNo : undefined);
  const pi = lineage?.proformaNo || (sourceDocType === 'Proforma' ? sourceDocNo : undefined);
  const so = lineage?.orderNo || (sourceDocType === 'Order' ? sourceDocNo : undefined);
  const dc = lineage?.challanNo || (sourceDocType === 'Challan' ? sourceDocNo : undefined);
  const inv = lineage?.invoiceNo || (sourceDocType === 'Invoice' ? sourceDocNo : undefined);

  const items: Array<{
    type: SalesDocType;
    label: string;
    docNo: string;
    path: string;
    isUpstream: boolean;
    isDownstream: boolean;
    color: string;
  }> = [];

  // Determine hierarchy order: Estimate (0) -> Proforma (1) -> Order (2) -> Challan (3) -> Invoice (4)
  const orderRank: Record<SalesDocType, number> = {
    Estimate: 0,
    Proforma: 1,
    Order: 2,
    Challan: 3,
    Invoice: 4,
  };

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
          title={`Click to view linked ${item.type}: ${item.docNo}`}
          className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer shadow-2xs select-none ${item.color}`}
        >
          {item.isUpstream && <span className="text-[8.5px] opacity-70 font-semibold uppercase tracking-tight">From</span>}
          {item.isDownstream && <span className="text-[8.5px] opacity-70 font-semibold uppercase tracking-tight">To</span>}
          <span>
            {item.label}: {item.docNo}
          </span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
        </button>
      ))}
    </div>
  );
};
