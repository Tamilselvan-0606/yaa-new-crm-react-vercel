import React, { useState, useRef, useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import {
  MoreVertical,
  Pencil,
  Eye,
  Trash2,
  Ban,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Copy,
  Truck,
  FileText,
  ShoppingBag,
  UserCheck,
  UserPlus,
  SlidersHorizontal,
  ArrowRightLeft,
  Boxes,
  IndianRupee,
  CreditCard,
  Download,
  RotateCcw,
  XCircle,
  Send,
  Printer,
  Share2,
} from 'lucide-react';

export type ActionVariant =
  | 'view'
  | 'edit'
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'suspend'
  | 'resume'
  | 'convert'
  | 'challan'
  | 'invoice'
  | 'sale'
  | 'order'
  | 'assign'
  | 'duplicate'
  | 'copy'
  | 'movement'
  | 'adjust'
  | 'batches'
  | 'payment'
  | 'download'
  | 'preview'
  | 'return'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'send'
  | 'print'
  | 'share'
  | 'custom';

export interface SaleActionItem {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: ActionVariant;
  icon?: ReactNode;
  badgeBg?: string; // Optional custom hex or Tailwind color
  iconColor?: string; // defaults to 'text-white'
  textColor?: string;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  dividerBefore?: boolean;
}

export interface SaleActionDropdownProps {
  items: (SaleActionItem | null | undefined | false)[];
  title?: string;
  dropdownWidth?: string; // e.g. "w-52" (default: "w-52")
  className?: string; // custom class for the trigger button
}

// Global reference to ensure only ONE dropdown menu is open at any time
let activeDropdownCloser: (() => void) | null = null;

// Resolve default variant from label text if variant wasn't specified
function resolveVariant(item: SaleActionItem): ActionVariant {
  if (item.variant) return item.variant;
  const l = item.label.toLowerCase();
  if (l.includes('delete') || l.includes('remove')) return 'delete';
  if (l.includes('edit')) return 'edit';
  if (l.includes('view') || l.includes('detail') || l.includes('preview')) return 'view';
  if (l.includes('deactivat') || l.includes('set as inactive') || l.includes('inactive')) return 'deactivate';
  if (l.includes('activat') || l.includes('set active') || l.includes('set as active')) return 'activate';
  if (l.includes('suspend')) return 'suspend';
  if (l.includes('resume')) return 'resume';
  if (l.includes('challan') || l.includes('delivery')) return 'challan';
  if (l.includes('invoice')) return 'invoice';
  if (l.includes('create sale') || l.includes('sale')) return 'sale';
  if (l.includes('order')) return 'order';
  if (l.includes('convert')) return 'convert';
  if (l.includes('duplicate') || l.includes('copy')) return 'duplicate';
  if (l.includes('assign') || l.includes('rep')) return 'assign';
  if (l.includes('movement')) return 'movement';
  if (l.includes('adjust')) return 'adjust';
  if (l.includes('batch')) return 'batches';
  if (l.includes('payment') || l.includes('collect') || l.includes('pay')) return 'payment';
  if (l.includes('return')) return 'return';
  if (l.includes('download') || l.includes('pdf')) return 'download';
  if (l.includes('cancel') || l.includes('reject')) return 'cancel';
  if (l.includes('approve')) return 'approve';
  if (l.includes('send')) return 'send';
  if (l.includes('print')) return 'print';
  if (l.includes('share')) return 'share';
  return 'view';
}

function getVariantConfig(variant: ActionVariant, customIcon?: ReactNode) {
  const iconProps = {
    style: { width: '13px', height: '13px' },
    className: 'text-white stroke-[2.2]',
  };

  switch (variant) {
    case 'edit':
      return {
        bg: 'bg-[#3B82F6]',
        icon: customIcon || <Pencil {...iconProps} />,
        isDanger: false,
      };
    case 'view':
    case 'preview':
      return {
        bg: 'bg-[#33077C]',
        icon: customIcon || <Eye {...iconProps} />,
        isDanger: false,
      };
    case 'activate':
    case 'resume':
    case 'approve':
      return {
        bg: 'bg-[#10B981]',
        icon: customIcon || <CheckCircle2 {...iconProps} />,
        isDanger: false,
      };
    case 'deactivate':
      return {
        bg: 'bg-[#64748B]',
        icon: customIcon || <Ban {...iconProps} />,
        isDanger: false,
      };
    case 'suspend':
      return {
        bg: 'bg-[#F59E0B]',
        icon: customIcon || <PauseCircle {...iconProps} />,
        isDanger: false,
      };
    case 'delete':
      return {
        bg: 'bg-[#E11D48]',
        icon: customIcon || <Trash2 {...iconProps} />,
        isDanger: true,
      };
    case 'cancel':
    case 'reject':
      return {
        bg: 'bg-[#EF4444]',
        icon: customIcon || <XCircle {...iconProps} />,
        isDanger: true,
      };
    case 'challan':
      return {
        bg: 'bg-[#6366F1]',
        icon: customIcon || <Truck {...iconProps} />,
        isDanger: false,
      };
    case 'invoice':
      return {
        bg: 'bg-[#8B5CF6]',
        icon: customIcon || <FileText {...iconProps} />,
        isDanger: false,
      };
    case 'sale':
    case 'order':
      return {
        bg: 'bg-[#0EA5E9]',
        icon: customIcon || <ShoppingBag {...iconProps} />,
        isDanger: false,
      };
    case 'convert':
      return {
        bg: 'bg-[#7C3AED]',
        icon: customIcon || <ArrowRightLeft {...iconProps} />,
        isDanger: false,
      };
    case 'duplicate':
    case 'copy':
      return {
        bg: 'bg-[#0284C7]',
        icon: customIcon || <Copy {...iconProps} />,
        isDanger: false,
      };
    case 'assign':
      return {
        bg: 'bg-[#0D9488]',
        icon: customIcon || <UserCheck {...iconProps} />,
        isDanger: false,
      };
    case 'movement':
      return {
        bg: 'bg-[#0891B2]',
        icon: customIcon || <ArrowRightLeft {...iconProps} />,
        isDanger: false,
      };
    case 'adjust':
      return {
        bg: 'bg-[#D97706]',
        icon: customIcon || <SlidersHorizontal {...iconProps} />,
        isDanger: false,
      };
    case 'batches':
      return {
        bg: 'bg-[#A855F7]',
        icon: customIcon || <Boxes {...iconProps} />,
        isDanger: false,
      };
    case 'payment':
      return {
        bg: 'bg-[#059669]',
        icon: customIcon || <IndianRupee {...iconProps} />,
        isDanger: false,
      };
    case 'download':
      return {
        bg: 'bg-[#EA580C]',
        icon: customIcon || <Download {...iconProps} />,
        isDanger: false,
      };
    case 'return':
      return {
        bg: 'bg-[#F97316]',
        icon: customIcon || <RotateCcw {...iconProps} />,
        isDanger: false,
      };
    case 'send':
      return {
        bg: 'bg-[#2563EB]',
        icon: customIcon || <Send {...iconProps} />,
        isDanger: false,
      };
    case 'print':
      return {
        bg: 'bg-[#475569]',
        icon: customIcon || <Printer {...iconProps} />,
        isDanger: false,
      };
    case 'share':
      return {
        bg: 'bg-[#0284C7]',
        icon: customIcon || <Share2 {...iconProps} />,
        isDanger: false,
      };
    case 'custom':
    default:
      return {
        bg: 'bg-[#6366F1]',
        icon: customIcon || <Eye {...iconProps} />,
        isDanger: false,
      };
  }
}

export const SaleActionDropdown: React.FC<SaleActionDropdownProps> = ({
  items,
  title = 'Actions',
  dropdownWidth = 'w-52',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const validItems = items.filter((item): item is SaleActionItem => Boolean(item && !item.hidden));

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPos(null);
    if (activeDropdownCloser === closeDropdown) {
      activeDropdownCloser = null;
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isOpen) {
      closeDropdown();
      return;
    }

    // Close any other open dropdown first
    if (activeDropdownCloser && activeDropdownCloser !== closeDropdown) {
      activeDropdownCloser();
    }

    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(validItems.length * 44 + 24, 380);
    const rightPos = Math.max(8, window.innerWidth - rect.right);

    if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
      setDropdownPos({
        bottom: window.innerHeight - rect.top + 6,
        right: rightPos,
      });
    } else {
      setDropdownPos({
        top: rect.bottom + 6,
        right: rightPos,
      });
    }

    activeDropdownCloser = closeDropdown;
    setIsOpen(true);
  };

  // Close when clicking outside or scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      closeDropdown();
    };

    const handleScrollOrResize = () => {
      closeDropdown();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (activeDropdownCloser === closeDropdown) {
        activeDropdownCloser = null;
      }
    };
  }, []);

  if (validItems.length === 0) return null;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Trigger Button - Matches 3rd Ref Image: Solid Purple #33077C */}
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onClick={handleToggle}
        className={`w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer focus:outline-hidden ${className}`}
      >
        <MoreVertical className="w-4 h-4 fill-white text-white" />
      </button>

      {/* Floating Menu Portal - Matches 2nd Ref Image: Badges with Icons */}
      {isOpen &&
        dropdownPos &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            className={`sale-action-dropdown-menu fixed z-[9999] ${dropdownWidth} bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 px-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left`}
            style={{
              top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : undefined,
              bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : undefined,
              right: `${dropdownPos.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {validItems.map((item, idx) => {
              const variant = resolveVariant(item);
              const config = getVariantConfig(variant, item.icon);
              const isDanger = item.danger ?? config.isDanger;
              const badgeClass = item.badgeBg?.startsWith('bg-') ? item.badgeBg : config.bg;
              const inlineBadgeStyle =
                item.badgeBg && !item.badgeBg.startsWith('bg-')
                  ? { backgroundColor: item.badgeBg }
                  : undefined;

              const shouldShowDivider =
                item.dividerBefore ||
                (isDanger && idx > 0 && !validItems[idx - 1]?.dividerBefore && !validItems[idx - 1]?.danger);

              return (
                <React.Fragment key={idx}>
                  {shouldShowDivider && <div className="my-1 mx-2 border-t border-slate-100" />}

                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDropdown();
                      item.onClick(e);
                    }}
                    className={`w-full px-3 py-2 text-left text-[13px] font-bold rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                      isDanger
                        ? 'text-[#E11D48] hover:bg-rose-50/70'
                        : 'text-slate-800 hover:bg-slate-50'
                    } ${item.textColor ? item.textColor : ''} ${
                      item.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    }`}
                  >
                    <span
                      style={{ width: '26px', height: '26px', ...inlineBadgeStyle }}
                      className={`rounded-full flex items-center justify-center shrink-0 shadow-2xs ${badgeClass}`}
                    >
                      {config.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SaleActionDropdown;
