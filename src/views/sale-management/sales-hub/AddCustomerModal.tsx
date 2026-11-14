import { PhoneField } from "../../../components/common/PhoneField";
import {
  LocationFields,
  LocationMeta,
} from "../../../components/common/LocationFields";
import React, { useState, useEffect, useMemo, useRef } from "react";
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
import {
  normalizeIndianPhoneTo10Digits,
  isValidIndianPhone,
  normalizePhoneForSave,
  isValidIntlPhone,
  checkIntlPhone,
} from "../../../utils/validation";
import {
  checkRequiredText,
  checkPhone,
  checkEmail,
  checkPincode,
  checkGstin,
  checkPan,
  checkMoney,
  useSubmitGuard,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";
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
  SalesCustomer,
  CustomerType,
  CustomerStatus,
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
  const { isSubmitting, runOnce } = useSubmitGuard();
  const [liveSalesReps, setLiveSalesReps] = useState<ApiSalesRepresentative[]>(
    [],
  );
  const [isSalesRepsLoading, setIsSalesRepsLoading] = useState(false);

  // Available sales representatives (API list only)
  const availableSalesReps = liveSalesReps;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<CustomerFormData>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      customerType: "Business",
      status: "Active",
      country: "",
      state: "",
      sameAsBilling: true,
      creditLimit: 0,
      openingBalance: 0,
    },
  });

  const watchSameAsBilling = watch("sameAsBilling");
  const [locationDistrict, setLocationDistrict] = useState("");
  const [locationIds, setLocationIds] = useState<{ countryId?: string; stateId?: string; districtId?: string; cityId?: string }>({});
  const [districtError, setDistrictError] = useState<string | undefined>();
  const [locationMeta, setLocationMeta] = useState<LocationMeta>({
    stateRequired: true,
    districtRequired: true,
    cityRequired: true,
  });
  useEffect(() => {
    register("country");
    register("phone");
    register("alternatePhone");
    register("state");
    register("city");
  }, [register]);

  // Guards: never run two rep loads at once, and do not re-fetch on every open once loaded.
  const isFetchingRepsRef = useRef(false);
  const hasLoadedRepsRef = useRef(false);
  // A refresh requested while a load is running (e.g. right after adding a rep) runs once more when that load ends.
  const reloadAfterFetchRef = useRef(false);

  const loadSalesReps = async (forceRefresh = false) => {
    if (isFetchingRepsRef.current) {
      if (forceRefresh) reloadAfterFetchRef.current = true;
      return;
    }
    if (!forceRefresh && hasLoadedRepsRef.current) return;
    isFetchingRepsRef.current = true;
    setIsSalesRepsLoading(true);
    try {
      const res = await salesRepresentativeApi.getList({ limit: 200 }, { fresh: true });
      if (res && res.success && Array.isArray(res.data)) {
        hasLoadedRepsRef.current = true;
        setLiveSalesReps(res.data);
      } else if (res && Array.isArray((res as any).data)) {
        setLiveSalesReps((res as any).data);
      }
    } catch (err) {
      console.warn("Failed to load sales reps:", err);
    } finally {
      isFetchingRepsRef.current = false;
      setIsSalesRepsLoading(false);
      if (reloadAfterFetchRef.current) {
        reloadAfterFetchRef.current = false;
        loadSalesReps(true);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      reset({
        customerType: "Business",
        status: "Active",
        country: "",
        state: "",
        sameAsBilling: true,
        creditLimit: 0,
        openingBalance: 0,
      });
      // Every time the form opens, read the live list so a representative added elsewhere is included.
      loadSalesReps(true);
    } else {
      clearErrors();
    }
  }, [isOpen, reset, clearErrors]);

  const handleNumberOnlyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
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

  // Submit attempted with field-rule failures: also surface the out-of-rule rep error in the same pass.
  const onInvalid = () => {
    const repId = watch("salesRepresentativeId");
    if (
      repId &&
      availableSalesReps.length > 0 &&
      !availableSalesReps.some((r) => r.id === repId)
    ) {
      setError("salesRepresentativeId", {
        type: "manual",
        message: "Please choose the sales representative from the list.",
      });
    }
  };

  const onSubmit = (data: CustomerFormData) =>
    runOnce(async () => {
      // Re-check every rule here (not only through field rules) so nothing invalid reaches the API.
      const submitErrors: Array<[keyof CustomerFormData, string | null]> = [
        ["name", checkRequiredText(data.name, "customer name", 2)],
        ["phone", checkIntlPhone(data.phone, true, "phone number")],
        [
          "alternatePhone",
          checkIntlPhone(data.alternatePhone, true, "WhatsApp number"),
        ],
        ["email", checkEmail(data.email, true)],
        ["pincode", checkPincode(data.pincode, true)],
        [
          "gstNumber",
          String(data.gstNumber ?? "").trim()
            ? checkGstin(data.gstNumber)
            : "Please enter the GST number.",
        ],
        [
          "panNumber",
          String(data.panNumber ?? "").trim()
            ? checkPan(data.panNumber)
            : "Please enter the PAN number.",
        ],
        [
          "creditLimit",
          checkMoney(data.creditLimit, "credit limit", {
            allowZero: true,
            optional: true,
          }),
        ],
        [
          "openingBalance",
          checkMoney(data.openingBalance, "existing outstanding amount", {
            allowZero: true,
            optional: true,
          }),
        ],
      ];
      if (
        data.salesRepresentativeId &&
        availableSalesReps.length > 0 &&
        !availableSalesReps.some((r) => r.id === data.salesRepresentativeId)
      ) {
        submitErrors.push([
          "salesRepresentativeId",
          "Please choose the sales representative from the list.",
        ]);
      }
      submitErrors.push(
        ["country", data.country?.trim() ? null : "Please select a country"],
        [
          "state",
          locationMeta.stateRequired && !data.state?.trim()
            ? "Please select a state"
            : null,
        ],
        [
          "city",
          locationMeta.cityRequired && !data.city?.trim()
            ? "Please select a city"
            : null,
        ],
      );
      const districtMissing =
        locationMeta.districtRequired && !locationDistrict.trim();
      setDistrictError(
        districtMissing ? "Please select a district" : undefined,
      );
      const failed = submitErrors.filter(([, m]) => !!m);
      if (failed.length > 0 || districtMissing) {
        failed.forEach(([f, m]) =>
          setError(f, { type: "manual", message: m as string }),
        );
        return;
      }
      try {
        const normalizedPhone = normalizePhoneForSave(
          data.phone || "",
        );
        const normalizedAltPhone = data.alternatePhone
          ? normalizePhoneForSave(data.alternatePhone)
          : undefined;

        const cleanBilling = (data.billingAddress || data.address || "").trim();
        const cleanShipping = (
          data.sameAsBilling
            ? cleanBilling
            : data.shippingAddress || data.address || ""
        ).trim();

        const apiPayload: CreateCustomerPayload = {
          name: data.name.trim(),
          phone: normalizedPhone,
          whatsapp: normalizedAltPhone,
          email: data.email?.trim() || undefined,
          company: data.company?.trim() || undefined,
          customerType: data.customerType || "Business",
          gender: data.gender?.trim() || undefined,
          status: data.status || "Active",
          address: data.address?.trim() || undefined,
          city: data.city?.trim() || undefined,
          state: data.state?.trim() || undefined,
          country: data.country?.trim() || "India",
          countryId: locationIds.countryId || undefined,
          stateId: locationIds.stateId || undefined,
          districtId: locationIds.districtId || undefined,
          cityId: locationIds.cityId || undefined,
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
          }

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
              "Could not generate a unique customer code. Please try again.",
          });
          toast.error(
            "Could not generate a unique customer code. Please try again.",
          );
          return;
        }

        const fieldErrors = extractApiFieldErrors(apiErr);
        const knownFields = [
          "name",
          "phone",
          "alternatePhone",
          "email",
          "pincode",
          "gstNumber",
          "panNumber",
          "creditLimit",
          "openingBalance",
          "city",
          "state",
          "country",
          "company",
        ] as const;
        let mapped = false;
        for (const f of knownFields) {
          if (fieldErrors[f]) {
            setError(f as keyof CustomerFormData, {
              type: "server",
              message: fieldErrors[f],
            });
            mapped = true;
          }
        }
        if (mapped) return;
        toast.error(
          getApiErrorMessage(
            apiErr,
            "We could not register the customer. Please try again.",
          ),
        );
      }
    });

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
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        <div className="space-y-5 sm:space-y-6 p-0.5 sm:p-2 text-xs animate-in fade-in duration-150">
          {/* Section 1: Basic Details */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <User className="w-3.5 h-3.5 text-[#4309A2]" />
                1. Basic Information
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              <div>
                <FormLabel required>Full Name / Contact Person</FormLabel>
                <input
                  type="text"
                  {...register("name", {
                    validate: (val) =>
                      checkRequiredText(val, "customer name", 2) || true,
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
                <FormLabel>Gender</FormLabel>
                <select {...register("gender")} className={FORM_SELECT_CLS}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
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
                <FormLabel>Account Status</FormLabel>
                <select {...register("status")} className={FORM_SELECT_CLS}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div>
                <FormLabel>Sales Representative</FormLabel>
                <SalesRepSearchableSelect
                  value={watch("salesRepresentativeId")}
                  onChange={(repId) => {
                    setValue("salesRepresentativeId", repId, {
                      shouldValidate: isSubmitted,
                      shouldDirty: true,
                    });
                  }}
                  availableReps={availableSalesReps}
                  isLoading={isSalesRepsLoading}
                  onRefreshReps={() => loadSalesReps(true)}
                  onRepCreated={(rep) =>
                    setLiveSalesReps((prev) =>
                      prev.some((r) => r.id === rep.id) ? prev : [rep as ApiSalesRepresentative, ...prev],
                    )
                  }
                  placeholder="Select Sales Representative"
                />
                {errors.salesRepresentativeId && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.salesRepresentativeId.message}</span>
                  </p>
                )}
              </div>

              <PhoneField
                label="Primary Phone"
                required
                value={watch("phone") || ""}
                error={errors.phone?.message as string | undefined}
                placeholder="e.g. 9876543210"
                onChange={(v) => setValue("phone" as any, v as any, { shouldDirty: true, shouldValidate: true })}
              />

              <PhoneField
                label="WhatsApp Number"
                required
                value={watch("alternatePhone") || ""}
                error={errors.alternatePhone?.message as string | undefined}
                placeholder="e.g. 9876543211"
                onChange={(v) => setValue("alternatePhone" as any, v as any, { shouldDirty: true, shouldValidate: true })}
              />

              <div>
                <FormLabel required>Email Address</FormLabel>
                <input
                  type="email"
                  {...register("email", {
                    validate: (val) => checkEmail(val) || true,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="sm:col-span-2 lg:col-span-4">
                <FormLabel>Address</FormLabel>
                <textarea
                  rows={3}
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
                  autoComplete="off"
                  className={FORM_TEXTAREA_CLS}
                />
              </div>

              <LocationFields
                country={watch("country") || ""}
                state={watch("state") || ""}
                district={locationDistrict}
                city={watch("city") || ""}
                onMeta={setLocationMeta}
                errors={{
                  country: errors.country?.message as string | undefined,
                  state: errors.state?.message as string | undefined,
                  district: districtError,
                  city: errors.city?.message as string | undefined,
                }}
                onChange={(patch) => {
                  setLocationIds((prev) => ({
                    countryId: patch.countryId !== undefined ? patch.countryId : prev.countryId,
                    stateId: patch.stateId !== undefined ? patch.stateId : prev.stateId,
                    districtId: patch.districtId !== undefined ? patch.districtId : prev.districtId,
                    cityId: patch.cityId !== undefined ? patch.cityId : prev.cityId,
                  }));
                  if (patch.country !== undefined)
                    setValue("country", patch.country, {
                      shouldDirty: true,
                      shouldValidate: isSubmitted,
                    });
                  if (patch.state !== undefined)
                    setValue("state", patch.state, {
                      shouldDirty: true,
                      shouldValidate: isSubmitted,
                    });
                  if (patch.district !== undefined) {
                    setLocationDistrict(patch.district);
                    setDistrictError(undefined);
                  }
                  if (patch.city !== undefined)
                    setValue("city", patch.city, {
                      shouldDirty: true,
                      shouldValidate: isSubmitted,
                    });
                }}
              />

              <div>
                <FormLabel required>Pincode / ZIP</FormLabel>
                <input
                  type="text"
                  maxLength={6}
                  {...register("pincode", {
                    validate: (val) => checkPincode(val, true) || true,
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
                <FormLabel required>GSTIN (GST Number)</FormLabel>
                <input
                  type="text"
                  maxLength={15}
                  {...register("gstNumber", {
                    validate: (val) => checkGstin(val) || true,
                  })}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.toUpperCase();
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
                <FormLabel required>PAN Number</FormLabel>
                <input
                  type="text"
                  maxLength={10}
                  {...register("panNumber", {
                    validate: (val) => checkPan(val) || true,
                  })}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.toUpperCase();
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
                  autoComplete="off"
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
                    autoComplete="off"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <FormLabel>Credit Limit (₹)</FormLabel>
                <input
                  type="text"
                  {...register("creditLimit", {
                    validate: (val) =>
                      checkMoney(val, "credit limit", {
                        allowZero: true,
                        optional: true,
                      }) || true,
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
                      checkMoney(val, "existing outstanding amount", {
                        allowZero: true,
                        optional: true,
                      }) || true,
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
