import React from "react";
import {
  FileText,
  User,
  Users,
  Calendar,
  Clock,
  Package,
  IndianRupee,
  CreditCard,
  Activity,
  SlidersHorizontal,
  Hash,
  Building2,
  Layers,
  Phone,
  Mail,
  Tag,
  Boxes,
  MapPin,
  AlertCircle,
  LucideIcon,
} from "lucide-react";

export interface CommonTableColumn {
  key?: string;
  label: string;
  icon?: LucideIcon;
  align?: "left" | "center" | "right";
  className?: string;
  width?: string;
  minWidth?: string;
  colSpan?: number;
  rowSpan?: number;
  hideIcon?: boolean;
}

export interface CommonTableHeadProps {
  columns: (CommonTableColumn | string)[];
  className?: string;
  rowClassName?: string;
}

/**
 * Returns the appropriate semantic icon based on any column heading variation
 */
export const getHeadingIcon = (label: string): LucideIcon | null => {
  if (!label || typeof label !== "string") return null;
  const l = label.toLowerCase().trim();

  // Serial Number / Index
  if (
    l === "#" ||
    l === "sl" ||
    l === "s.no" ||
    l === "sr.no" ||
    l === "serial no" ||
    l === "no."
  ) {
    return Hash;
  }

  // Document numbers, codes, vouchers, references, IDs
  if (
    l.includes("no") ||
    l.includes("#") ||
    l.includes("code") ||
    l.includes("ref") ||
    l.includes("invoice") ||
    l.includes("challan") ||
    l.includes("proforma") ||
    l.includes("order") ||
    l.includes("estimate") ||
    l.includes("return") ||
    l.includes("request") ||
    l.includes("receipt") ||
    l.includes("voucher") ||
    l.includes("utr") ||
    l.includes("bill") ||
    l.includes("batch") ||
    l.includes("lot") ||
    l.includes("sku")
  ) {
    // If it's a date field containing 'no' like 'return no & date' or 'purchase no & date'
    if (l.includes("date") && !l.includes("&")) return Calendar;
    return FileText;
  }

  // Contacts / Phone / Email
  if (l.includes("phone") || l.includes("mobile") || l === "contact info") {
    return Phone;
  }
  if (l.includes("email") || l.includes("mail")) {
    return Mail;
  }

  // Customers, Representatives, Suppliers, Users, People
  if (
    l === "customers" ||
    l.includes("assigned customers") ||
    l.includes("members")
  ) {
    return Users;
  }
  if (
    l.includes("customer") ||
    l.includes("client") ||
    l.includes("supplier") ||
    l.includes("vendor") ||
    l.includes("rep") ||
    l.includes("user") ||
    l.includes("party") ||
    l.includes("person") ||
    l.includes("assigned to") ||
    l.includes("payee") ||
    l.includes("lead") ||
    l.includes("requested by")
  ) {
    return User;
  }

  // Location / Branches / Organization
  if (
    l.includes("location") ||
    l.includes("city") ||
    l.includes("state") ||
    l.includes("address")
  ) {
    return MapPin;
  }
  if (
    l.includes("branch") ||
    l.includes("warehouse") ||
    l.includes("company") ||
    l.includes("organization") ||
    l.includes("sub-organization")
  ) {
    return Building2;
  }

  // Dates
  if (
    l.includes("created") ||
    l.includes("issue") ||
    l.includes("joined") ||
    l.includes("start date") ||
    l.includes("date")
  ) {
    return Calendar;
  }

  // Time, Due Dates, Converted Time, Expiry, Renewal
  if (
    l.includes("converted") ||
    l.includes("time") ||
    l.includes("due") ||
    l.includes("valid") ||
    l.includes("delivery") ||
    l.includes("overdue") ||
    l.includes("clock") ||
    l.includes("expiry") ||
    l.includes("expiration") ||
    l.includes("renewal") ||
    l.includes("required by") ||
    l.includes("follow-up")
  ) {
    return Clock;
  }

  // Items, Products, Descriptions
  if (
    l.includes("item") ||
    l.includes("product") ||
    l.includes("goods") ||
    l.includes("desc") ||
    l.includes("requirements") ||
    l.includes("offering")
  ) {
    return Package;
  }

  // Stock, Quantities, Units, Counts
  if (
    l.includes("stock") ||
    l.includes("qty") ||
    l.includes("quantity") ||
    l.includes("reorder") ||
    l.includes("count") ||
    l.includes("unit")
  ) {
    return Boxes;
  }

  // Category, Subcategory, Plan, Department, Hierarchy
  if (
    l.includes("category") ||
    l.includes("department") ||
    l.includes("plan") ||
    l.includes("type") ||
    l.includes("mode") ||
    l.includes("method") ||
    l.includes("role")
  ) {
    return Layers;
  }

  // Financial Amounts, Totals, Pricing
  if (
    l.includes("total") ||
    l.includes("amount") ||
    l.includes("price") ||
    l.includes("rate") ||
    l.includes("cost") ||
    l.includes("billed") ||
    l.includes("mrr") ||
    l.includes("refund") ||
    l.includes("collected") ||
    l.includes("value") ||
    l.includes("tax") ||
    l.includes("est.")
  ) {
    return IndianRupee;
  }

  // Settlements, Payments, Balances, Outstandings
  if (
    l.includes("paid") ||
    l.includes("balance") ||
    l.includes("payment") ||
    l.includes("dues") ||
    l.includes("outstanding") ||
    l.includes("settled") ||
    l.includes("credit limit") ||
    l.includes("payable") ||
    l.includes("renew") ||
    l.includes("cycle")
  ) {
    return CreditCard;
  }

  // Priority
  if (l.includes("priority")) {
    return AlertCircle;
  }

  // Status, Lifecycle
  if (l.includes("status") || l.includes("state") || l.includes("stage")) {
    return Activity;
  }

  // Actions
  if (l.includes("action") || l.includes("manage") || l.includes("option")) {
    return SlidersHorizontal;
  }

  return Tag;
};

/**
 * Standard Single Table Header Cell
 */
export const CommonTableTh: React.FC<{
  label: string;
  icon?: LucideIcon;
  align?: "left" | "center" | "right";
  className?: string;
  width?: string;
  minWidth?: string;
  colSpan?: number;
  rowSpan?: number;
  hideIcon?: boolean;
  children?: React.ReactNode;
}> = ({
  label,
  icon,
  align,
  className = "",
  width,
  minWidth,
  colSpan,
  rowSpan,
  hideIcon = false,
  children,
}) => {
  const IconComponent = icon !== undefined ? icon : getHeadingIcon(label);

  // Auto-detect alignment if not provided
  let determinedAlign: "left" | "center" | "right" = align || "left";
  if (!align) {
    const l = label.toLowerCase();
    if (
      l.includes("amount") ||
      l.includes("price") ||
      l.includes("total") ||
      l.includes("balance") ||
      l.includes("rate") ||
      l.includes("cost") ||
      l.includes("paid") ||
      l.includes("outstanding") ||
      l.includes("value")
    ) {
      determinedAlign = "right";
    } else if (
      l.includes("status") ||
      l.includes("action") ||
      l.includes("no") ||
      l.includes("#") ||
      l === "+" ||
      l.includes("priority")
    ) {
      determinedAlign = "center";
    }
  }

  let alignContainerClass = "flex items-center gap-1.5";
  if (determinedAlign === "center") {
    alignContainerClass = "flex items-center justify-center gap-1.5";
  } else if (determinedAlign === "right") {
    alignContainerClass = "flex items-center justify-end gap-1.5";
  }

  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{ width, minWidth }}
      className={`py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/70 whitespace-nowrap text-white font-bold uppercase text-[11px] sm:text-[12px] tracking-wider select-none ${
        determinedAlign === "right"
          ? "text-right"
          : determinedAlign === "center"
            ? "text-center"
            : "text-left"
      } ${className}`}
    >
      {children ? (
        children
      ) : (
        <div className={alignContainerClass}>
          <span>{label}</span>
          {!hideIcon && IconComponent && (
            <IconComponent className="w-3.5 h-3.5 text-purple-200 opacity-85 shrink-0" />
          )}
        </div>
      )}
    </th>
  );
};

/**
 * Standard Table Head (<thead>) Component for all application tables
 */
export const CommonTableHead: React.FC<CommonTableHeadProps> = ({
  columns,
  className = "",
  rowClassName = "",
}) => {
  return (
    <thead className={`bg-[#33077C] text-white ${className}`}>
      <tr
        className={`bg-[#33077C] text-white font-bold uppercase text-[11px] sm:text-[12px] border-b border-[#4309A2] tracking-wider select-none ${rowClassName}`}
      >
        {columns.map((col, index) => {
          const colObj: CommonTableColumn =
            typeof col === "string" ? { label: col } : col;
          return (
            <CommonTableTh
              key={colObj.key || `${colObj.label}-${index}`}
              label={colObj.label}
              icon={colObj.icon}
              align={colObj.align}
              className={colObj.className}
              width={colObj.width}
              minWidth={colObj.minWidth}
              colSpan={colObj.colSpan}
              rowSpan={colObj.rowSpan}
              hideIcon={colObj.hideIcon}
            />
          );
        })}
      </tr>
    </thead>
  );
};

export default CommonTableHead;
