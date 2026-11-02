import React from 'react';

interface TooltipProps {
  title: React.ReactNode;
  children: React.ReactNode;
  /** Where the bubble appears relative to the wrapped element. Default: below. */
  placement?: 'bottom' | 'top';
}

/**
 * Small dark tooltip shown on hover / keyboard focus. Wrap any element (disabled buttons too, since the
 * wrapper receives the hover): `<Tooltip title="Delete"><button>...</button></Tooltip>`.
 */
export const Tooltip: React.FC<TooltipProps> = ({ title, children, placement = 'bottom' }) => {
  if (title === undefined || title === null || title === '') return <>{children}</>;
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-[1500] max-w-[300px] w-max px-2.5 py-1.5 rounded bg-[#1E293B] text-white text-xs font-medium leading-snug text-center opacity-0 transition-opacity duration-150 group-hover/tt:opacity-100 group-hover/tt:delay-100 group-focus-within/tt:opacity-100 ${
          placement === 'bottom' ? 'top-full mt-3.5' : 'bottom-full mb-3.5'
        }`}
      >
        {title}
      </span>
    </span>
  );
};
