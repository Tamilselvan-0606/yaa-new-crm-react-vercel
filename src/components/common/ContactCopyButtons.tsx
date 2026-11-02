import React from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';

interface ContactCopyButtonsProps {
  /** Row id, used to build the "copied" key (`${id}-phone`, `${id}-wa`, `${id}-email`). */
  id: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  copiedKey: string | null;
  onCopy: (e: React.MouseEvent, text: string, key: string, label: string) => void;
  /** `soft`: rounded squares (default). `circle`: round buttons that fill with colour on hover. */
  variant?: 'soft' | 'circle';
  align?: 'center' | 'start';
}

type Channel = 'phone' | 'wa' | 'email';

const CHANNELS: {
  key: Channel;
  label: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'phone', label: 'Phone Number', title: 'Click to copy phone number', Icon: Phone },
  { key: 'wa', label: 'WhatsApp Number', title: 'Click to copy WhatsApp number', Icon: MessageCircle },
  { key: 'email', label: 'Email Address', title: 'Click to copy email address', Icon: Mail },
];

const VARIANTS = {
  soft: {
    gap: 'gap-2',
    base: 'w-8 h-8 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer',
    empty: 'w-8 h-8 rounded-lg',
    tones: {
      phone: 'bg-[#EBF3FF] hover:bg-[#dbeafe] text-[#2563EB]',
      wa: 'bg-[#ECFDF5] hover:bg-[#d1fae5] text-[#059669]',
      email: 'bg-[#FEEFEE] hover:bg-[#fee2e2] text-[#EF4444]',
    } as Record<Channel, string>,
  },
  circle: {
    gap: 'gap-1.5',
    base: 'w-8.5 h-8.5 rounded-full hover:text-white transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer',
    empty: 'w-8.5 h-8.5 rounded-full',
    tones: {
      phone: 'bg-blue-50 hover:bg-blue-600 text-blue-600',
      wa: 'bg-emerald-50 hover:bg-emerald-600 text-emerald-600',
      email: 'bg-purple-50 hover:bg-[#33077C] text-[#33077C]',
    } as Record<Channel, string>,
  },
};

/** Phone / WhatsApp / Email icon buttons that copy the value on click and show it on hover. */
export const ContactCopyButtons: React.FC<ContactCopyButtonsProps> = ({
  id,
  phone,
  whatsapp,
  email,
  copiedKey,
  onCopy,
  variant = 'soft',
  align = 'center',
}) => {
  const style = VARIANTS[variant];
  const values: Record<Channel, string | null | undefined> = { phone, wa: whatsapp, email };

  return (
    <div className={`flex items-center ${align === 'center' ? 'justify-center' : ''} ${style.gap}`}>
      {CHANNELS.map(({ key, label, title, Icon }) => {
        const value = values[key];
        if (!value) {
          return (
            <div key={key} className={`${style.empty} bg-slate-100 flex items-center justify-center text-slate-400 opacity-40`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          );
        }
        const copyKey = `${id}-${key}`;
        const copied = copiedKey === copyKey;
        return (
          <div key={key} className="relative group">
            <button
              type="button"
              onClick={(e) => onCopy(e, value, copyKey, label)}
              title={title}
              className={`flex items-center justify-center ${style.base} ${style.tones[key]}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
            <div
              className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                copied ? 'opacity-100 bg-emerald-600 scale-100' : 'opacity-0 group-hover:opacity-100 bg-slate-900'
              }`}
            >
              {copied ? 'Copied!' : value}
            </div>
          </div>
        );
      })}
    </div>
  );
};
