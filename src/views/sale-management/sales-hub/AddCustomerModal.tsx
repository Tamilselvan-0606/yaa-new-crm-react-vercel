import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  User,
  MapPin,
  FileText,
  CreditCard,
  AlertCircle,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Modal } from "../../../components/common/Modal";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_INPUT_ERROR_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
} from "../utils/formUtils";
import { SalesRepSearchableSelect } from "./SalesRepSearchableSelect";
import { normalizeIndianPhoneTo10Digits } from "../../../utils/validation";
import {
  customerApi,
  CreateCustomerPayload,
  mapApiCustomerToSalesCustomer,
} from "../../../api/commerce/customerApi";
import {
  salesRepresentativeApi,
  ApiSalesRepresentative,
} from "../../../api/commerce/salesRepresentativeApi";
import { collectionApi } from "../../../api/commerce/collectionApi";
import {
  useSalesManagementStore,
  SalesCustomer,
  CustomerType,
  CustomerStatus,
  SalesRepresentative,
} from "../../../store/useSalesManagementStore";
import { toast } from "../../../utils/toast";
import { store } from "../../../store/store";
import { baseApi } from "../../../api/baseApi";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: SalesCustomer) => void;
}

interface CustomerFormData {
  customerCode?: string;
  name: string;
  company?: string;
  customerType: CustomerType;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  status: CustomerStatus;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  billingAddress?: string;
  shippingAddress?: string;
  sameAsBilling?: boolean;
  gstNumber?: string;
  panNumber?: string;
  creditLimit?: number | string;
  paymentTerms?: string;
  openingBalance?: number | string;
  preferredPaymentMethod?: string;
  notes?: string;
  salesRepresentativeId?: string;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const {
    saveCustomer,
    assignCustomerSalesRep,
    salesRepresentatives,
    setSalesRepresentativesList,
  } = useSalesManagementStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveSalesReps, setLiveSalesReps] = useState<
    ApiSalesRepresentative[]
  >([]);
  const [isSalesRepsLoading, setIsSalesRepsLoading] = useState(false);

  // Available sales representatives (active API list prioritized, fallback to central store)
  const availableSalesReps = useMemo(() => {
    if (liveSalesReps && liveSalesReps.length > 0) {
      return liveSalesReps;
    }
    return salesRepresentatives || [];
  }, [liveSalesReps, salesRepresentatives]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormData>({
    defaultValues: {
      customerType: "Business",
      status: "Active",
      country: "India",
      state: "Tamil Nadu",
      sameAsBilling: true,
      creditLimit: 0,
      openingBalance: 0,
    },
  });

  const watchSameAsBilling = watch("sameAsBilling");

  const loadSalesReps = async () => {
    setIsSalesRepsLoading(true);
    try {
      const res = await salesRepresentativeApi.getList({
        limit: 200,
      });
      if (res && res.success && Array.isArray(res.data)) {
        setLiveSalesReps(res.data);
        const mappedReps: SalesRepresentative[] = res.data.map((r) => ({
          id: r.id,
          name: r.name,
          mobile: r.mobile,
          email: r.email,
          designation: r.designation,
          status: r.status,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }));
        setSalesRepresentativesList(mappedReps);
      } else if (res && Array.isArray((res as any).data)) {
        setLiveSalesReps((res as any).data);
      }
    } catch (err) {
      console.warn("Failed to load sales reps:", err);
    } finally {
      setIsSalesRepsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reset({
        customerType: "Business",
        status: "Active",
        country: "India",
        state: "Tamil Nadu",
        sameAsBilling: true,
        creditLimit: 0,
        openingBalance: 0,
      });
      loadSalesReps();
    }
  }, [isOpen, reset]);

  const handleNumberOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizeIndianPhoneTo10Digits(data.phone || "");
      const normalizedAltPhone = data.alternatePhone
        ? normalizeIndianPhoneTo10Digits(data.alternatePhone)
        : undefined;

      const cleanBilling = (
        data.billingAddress ||
        data.address ||
        ""
      ).trim();
      const cleanShipping = (
        data.sameAsBilling
          ? cleanBilling
          : data.shippingAddress || data.address || ""
      ).trim();

      const apiPayload: CreateCustomerPayload = {
        name: data.name.trim(),
        phone: normalizedPhone,
        alternatePhone: normalizedAltPhone,
        email: data.email?.trim() || undefined,
        company: data.company?.trim() || undefined,
        customerType: data.customerType || "Business",
        gender: data.gender?.trim() || undefined,
        status: data.status || "Active",
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        state: data.state?.trim() || undefined,
        country: data.country?.trim() || "India",
        pincode: data.pincode?.trim() || undefined,
        billingAddress: cleanBilling || undefined,
        shippingAddress: cleanShipping || undefined,
        gstNumber: data.gstNumber?.trim().toUpperCase() || undefined,
        panNumber: data.panNumber?.trim().toUpperCase() || undefined,
        creditLimit:
          data.creditLimit !== "" && data.creditLimit !== undefined
            ? Number(data.creditLimit)
            : undefined,
        paymentTerms: data.paymentTerms?.trim() || undefined,
        openingBalance:
          data.openingBalance !== "" && data.openingBalance !== undefined
            ? Number(data.openingBalance)
            : undefined,
        preferredPaymentMethod:
          data.preferredPaymentMethod?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      const res = await customerApi.createCustomer(apiPayload);
      const rawData = res?.data || (res as any)?.customer || res;

      if (rawData && (rawData.id || res?.success)) {
        const created = mapApiCustomerToSalesCustomer(
          rawData.id ? rawData : res.data || rawData,
        );

        if (data.salesRepresentativeId) {
          created.salesRepresentativeId = data.salesRepresentativeId;
          const matchedRep = availableSalesReps.find(
            (r) => r.id === data.salesRepresentativeId,
          );
          if (matchedRep) {
            created.salesRepresentativeName = matchedRep.name;
          }
          try {
            await collectionApi.assignCustomer({
              customerId: created.id,
              salesRepresentativeId: data.salesRepresentativeId,
              assignmentType: "Primary",
            });
          } catch (assignErr) {
            console.warn("Assign sales rep error:", assignErr);
          }
          assignCustomerSalesRep(
            created.id,
            data.salesRepresentativeId,
            "Primary",
            undefined,
            undefined,
            created.salesRepresentativeName,
          );
        }

        saveCustomer(created);
        store.dispatch(
          baseApi.util.invalidateTags([
            { type: "Customer", id: "LIST" },
            { type: "Customer", id: created.id },
            "SalesRepresentative",
            "Dashboard",
          ]),
        );
        toast.success(`Customer ${created.name} registered successfully.`);
        try {
          onCustomerCreated(created);
        } catch (cbErr) {
          console.error("onCustomerCreated callback error:", cbErr);
        }
        onClose();
      } else {
        throw new Error(res?.message || "Failed to create customer");
      }
    } catch (apiErr: any) {
      const errorCode =
        apiErr?.response?.data?.error?.code || apiErr?.response?.data?.code;
      const errorMsg =
        apiErr?.response?.data?.error?.message ||
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        "";

      if (
        errorCode === "DUPLICATE_CUSTOMER_CODE" ||
        errorMsg.toLowerCase().includes("customer code already exists")
      ) {
        setError("customerCode", {
          type: "manual",
          message:
            "This Customer Code already exists. Please enter a different code or leave blank to auto-generate.",
        });
        toast.error("Customer Code already exists.");
        return;
      }

      const errMsg =
        apiErr?.response?.data?.error?.fields?.[0]?.message ||
        errorMsg ||
        "Failed to register customer.";
      toast.error(`Customer creation failed: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      subtitle="Register client profile, address, tax identification, and credit terms"
      maxWidth="4xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5 sm:space-y-6 p-0.5 sm:p-2 text-xs animate-in fade-in duration-150">
          {/* Section 1: Basic Details */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <User className="w-3.5 h-3.5 text-[#4309A2]" />
                1. Basic Information
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <FormLabel required>Full Name / Contact Person</FormLabel>
                <input
                  type="text"
                  {...register("name", {
                    required: "Customer name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                  })}
                  placeholder="e.g. Marcus Vance or Acme Corp"
                  className={
                    errors.name ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.name && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.name.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Company Name (Optional)</FormLabel>
                <input
                  type="text"
                  {...register("company")}
                  placeholder="e.g. Apex Global Logistics"
                  className={FORM_INPUT_CLS}
                />
              </div>

              <div>
                <FormLabel>Customer Type</FormLabel>
                <select
                  {...register("customerType")}
                  className={FORM_SELECT_CLS}
                >
                  <option value="Business">Business (B2B)</option>
                  <option value="Individual">Individual (B2C)</option>
                </select>
              </div>

              <div>
                <FormLabel>Sales Representative</FormLabel>
                <SalesRepSearchableSelect
                  value={watch("salesRepresentativeId")}
                  onChange={(repId) => {
                    setValue("salesRepresentativeId", repId, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  availableReps={availableSalesReps}
                  isLoading={isSalesRepsLoading}
                  onRefreshReps={loadSalesReps}
                  placeholder="Select Sales Representative"
                />
              </div>

              <div>
                <FormLabel required>Primary Phone</FormLabel>
                <input
                  type="tel"
                  maxLength={10}
                  {...register("phone", {
                    required: "Primary phone is required",
                    validate: (val) =>
                      /^[6-9]\d{9}$/.test((val || "").trim()) ||
                      "Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)",
                  })}
                  onKeyDown={handleNumberOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = normalizeIndianPhoneTo10Digits(
                      e.currentTarget.value,
                    );
                  }}
                  placeholder="e.g. 9876543210"
                  className={
                    errors.phone ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.phone && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.phone.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Alternate Phone</FormLabel>
                <input
                  type="tel"
                  maxLength={10}
                  {...register("alternatePhone", {
                    validate: (val) =>
                      !val ||
                      !val.trim() ||
                      /^[6-9]\d{9}$/.test(val.trim()) ||
                      "Alternate phone must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)",
                  })}
                  onKeyDown={handleNumberOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = normalizeIndianPhoneTo10Digits(
                      e.currentTarget.value,
                    );
                  }}
                  placeholder="e.g. 9876543211"
                  className={
                    errors.alternatePhone
                      ? FORM_INPUT_ERROR_CLS
                      : FORM_INPUT_CLS
                  }
                />
                {errors.alternatePhone && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.alternatePhone.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Email Address (Optional)</FormLabel>
                <input
                  type="email"
                  {...register("email", {
                    validate: (val) =>
                      !val ||
                      !val.trim() ||
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) ||
                      "Please enter a valid email address (e.g. client@company.com)",
                  })}
                  placeholder="e.g. client@company.com"
                  className={
                    errors.email ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.email && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.email.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Gender</FormLabel>
                <select {...register("gender")} className={FORM_SELECT_CLS}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <FormLabel>Account Status</FormLabel>
                <select {...register("status")} className={FORM_SELECT_CLS}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <MapPin className="w-3.5 h-3.5 text-[#4309A2]" />
                2. Address & Location
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              <div className="sm:col-span-4">
                <FormLabel>Street Address</FormLabel>
                <input
                  type="text"
                  {...register("address")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue("address", val);
                    if (watchSameAsBilling) {
                      setValue("billingAddress", val);
                      setValue("shippingAddress", val);
                    }
                  }}
                  placeholder="e.g. 452 Ocean Avenue, Suite 400"
                  className={FORM_INPUT_CLS}
                />
              </div>

              <div>
                <FormLabel>City</FormLabel>
                <input
                  type="text"
                  {...register("city")}
                  placeholder="e.g. Chennai"
                  className={
                    errors.city ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.city && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.city.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>State</FormLabel>
                <input
                  type="text"
                  {...register("state")}
                  placeholder="e.g. Tamil Nadu"
                  className={
                    errors.state ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.state && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.state.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Country</FormLabel>
                <input
                  type="text"
                  {...register("country")}
                  placeholder="e.g. India"
                  className={
                    errors.country ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.country && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.country.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Pincode / ZIP</FormLabel>
                <input
                  type="text"
                  maxLength={6}
                  {...register("pincode", {
                    validate: (val) =>
                      !val ||
                      !val.trim() ||
                      /^[1-9][0-9]{5}$/.test(val.trim()) ||
                      "Pincode must be a valid 6-digit Indian postal code",
                  })}
                  onKeyDown={handleNumberOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 6);
                  }}
                  placeholder="e.g. 600001"
                  className={
                    errors.pincode ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.pincode && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.pincode.message}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Billing & Tax Info */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <FileText className="w-3.5 h-3.5 text-[#4309A2]" />
                3. Tax & Invoicing Addresses
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <FormLabel>GSTIN (GST Number)</FormLabel>
                <input
                  type="text"
                  maxLength={15}
                  {...register("gstNumber", {
                    validate: (val) =>
                      !val ||
                      !val.trim() ||
                      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                        val.trim().toUpperCase(),
                      ) ||
                      "Invalid GSTIN format (e.g. 33AABCZ9876K1Z2)",
                  })}
                  onInput={(e) => {
                    e.currentTarget.value =
                      e.currentTarget.value.toUpperCase();
                  }}
                  placeholder="e.g. 33AABCZ9876K1Z2"
                  className={`${errors.gstNumber ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS} font-mono uppercase`}
                />
                {errors.gstNumber && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.gstNumber.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>PAN Number</FormLabel>
                <input
                  type="text"
                  maxLength={10}
                  {...register("panNumber", {
                    validate: (val) =>
                      !val ||
                      !val.trim() ||
                      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(
                        val.trim().toUpperCase(),
                      ) ||
                      "Invalid PAN format (e.g. ABCDE1234F)",
                  })}
                  onInput={(e) => {
                    e.currentTarget.value =
                      e.currentTarget.value.toUpperCase();
                  }}
                  placeholder="e.g. ABCDE1234F"
                  className={`${errors.panNumber ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS} font-mono uppercase`}
                />
                {errors.panNumber && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.panNumber.message}</span>
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <FormLabel>Billing Address</FormLabel>
                <textarea
                  rows={2}
                  {...register("billingAddress")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue("billingAddress", val);
                    if (watchSameAsBilling) {
                      setValue("shippingAddress", val);
                    }
                  }}
                  placeholder="Complete billing address for GST invoices..."
                  className={FORM_TEXTAREA_CLS}
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="addCustModalSameAsBilling"
                  {...register("sameAsBilling")}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setValue("sameAsBilling", isChecked);
                    if (isChecked) {
                      setValue(
                        "shippingAddress",
                        watch("billingAddress") || watch("address") || "",
                      );
                    }
                  }}
                  className="w-4 h-4 rounded text-[#33077C] focus:ring-[#4309A2] border-slate-300 cursor-pointer"
                />
                <label
                  htmlFor="addCustModalSameAsBilling"
                  className="text-xs sm:text-[13px] font-semibold text-slate-700 cursor-pointer"
                >
                  Shipping address is identical to Billing address
                </label>
              </div>

              {!watchSameAsBilling && (
                <div className="sm:col-span-2">
                  <FormLabel>Shipping / Delivery Address</FormLabel>
                  <textarea
                    rows={2}
                    {...register("shippingAddress")}
                    placeholder="Delivery warehouse or location address..."
                    className={FORM_TEXTAREA_CLS}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Credit & Payment Due Period */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <CreditCard className="w-3.5 h-3.5 text-[#4309A2]" />
                4. Credit Limit & Payment Due Period
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <FormLabel>Credit Limit (₹)</FormLabel>
                <input
                  type="text"
                  {...register("creditLimit", {
                    validate: (val) =>
                      val === "" ||
                      Number(val) >= 0 ||
                      "Credit limit cannot be negative",
                  })}
                  onKeyDown={handleNumberOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^0-9]/g,
                      "",
                    );
                  }}
                  placeholder="e.g. 50000"
                  className={
                    errors.creditLimit ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.creditLimit && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.creditLimit.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Payment Due Period</FormLabel>
                <select
                  {...register("paymentTerms")}
                  className={FORM_SELECT_CLS}
                >
                  <option value="">Select Payment Due Period</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="45 Days">45 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="75 Days">75 Days</option>
                  <option value="90 Days">90 Days</option>
                  <option value="105 Days">105 Days</option>
                  <option value="120 Days">120 Days</option>
                </select>
              </div>

              <div>
                <FormLabel>Existing Outstanding (₹)</FormLabel>
                <input
                  type="text"
                  {...register("openingBalance", {
                    validate: (val) =>
                      val === "" ||
                      Number(val) >= 0 ||
                      "Opening balance cannot be negative",
                  })}
                  onKeyDown={handleNumberOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^0-9]/g,
                      "",
                    );
                  }}
                  placeholder="e.g. 0"
                  className={
                    errors.openingBalance
                      ? FORM_INPUT_ERROR_CLS
                      : FORM_INPUT_CLS
                  }
                />
                {errors.openingBalance && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.openingBalance.message}</span>
                  </p>
                )}
              </div>

              <div>
                <FormLabel>Preferred Payment</FormLabel>
                <select
                  {...register("preferredPaymentMethod")}
                  className={FORM_SELECT_CLS}
                >
                  <option value="">Select Preferred Payment</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Store Credit</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <FormLabel>Notes / Internal Comments</FormLabel>
                <input
                  type="text"
                  {...register("notes")}
                  placeholder="Special instructions or account manager notes..."
                  className={FORM_INPUT_CLS}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-60 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Check className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isSubmitting ? "Saving..." : "Save Customer"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
