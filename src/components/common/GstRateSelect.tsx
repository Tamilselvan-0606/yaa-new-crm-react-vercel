import React, { useMemo } from "react";
import { CustomSelect, type SelectOption } from "./CustomSelect";

export const STANDARD_GST_RATES = [0, 0.25, 3, 5, 18, 40] as const;

interface GstRateSelectProps {
  value: number | string | undefined;
  onChange: (rate: number) => void;
  disabled?: boolean;
  error?: boolean;
  triggerClassName?: string;
}

/** Standard GST percentage selector (`0%`, `0.25%`, `3%`, `5%`, `18%`, `40%`, plus legacy slab fallback). */
export const GstRateSelect: React.FC<GstRateSelectProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  triggerClassName = "",
}) => {
  const numericRate = Number(value ?? 0);
  const displayRate = Number.isFinite(numericRate) ? numericRate : 0;

  const options = useMemo<SelectOption[]>(() => {
    const base: SelectOption[] = STANDARD_GST_RATES.map((rate) => ({
      value: String(rate),
      label: `${rate}%`,
    }));
    const hasStandard = STANDARD_GST_RATES.some((r) => r === displayRate);
    if (!hasStandard) {
      base.push({
        value: String(displayRate),
        label: `${displayRate}% (old slab)`,
      });
    }
    return base;
  }, [displayRate]);

  return (
    <CustomSelect
      disabled={disabled}
      error={error}
      value={disabled ? "0" : String(displayRate)}
      onChange={(val) => onChange(Number(val))}
      options={options}
      placeholder="0%"
      size="sm"
      triggerClassName={
        triggerClassName ||
        "!h-10 !rounded-xl !border-slate-200 hover:!border-slate-300 font-semibold justify-center"
      }
    />
  );
};
