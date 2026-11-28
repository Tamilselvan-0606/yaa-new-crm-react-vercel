export interface GeneralSettingsData {
  systemName?: string;
  maintenanceMode?: boolean;
  leadFollowUpDays?: number;
  paymentDueReminderDays?: number;
  subscriptionExpiryNoticeDays?: number;
  companyLogo?: string | null;
  companyName: string;
  companyEmail: string;
  contactNumber: string;
  companyAddress?: string;
  websiteUrl?: string;
  gstNumber?: string;
  panNumber?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  defaultLanguage?: string;
  notifEmail?: boolean;
  notifInApp?: boolean;
  notifPaymentReminders?: boolean;
  notifSubscriptionExpiry?: boolean;
  notifInvoices?: boolean;
  notifLowStock?: boolean;
  enableSoundAlerts?: boolean;
  updatedAt?: string;
}

export interface GeneralSettingsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: GeneralSettingsData;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export type UpdateGeneralSettingsPayload = Partial<GeneralSettingsData>;
