export interface TaxRateItem {
  id: string;
  name: string;
  rate: number;
  isDefault?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxSettingsData {
  enableGst: boolean;
  enableHsnSac: boolean;
  reverseCharge: boolean;
  enablePlaceOfSupply: boolean;
  compositeScheme: boolean;
  enableTcs: boolean;
  enableTds: boolean;
  taxRates?: TaxRateItem[];
  updatedAt?: string;
}

export interface TaxSettingsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: TaxSettingsData;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface UpdateTaxSettingsPayload {
  enableGst?: boolean;
  enableHsnSac?: boolean;
  reverseCharge?: boolean;
  enablePlaceOfSupply?: boolean;
  compositeScheme?: boolean;
  enableTcs?: boolean;
  enableTds?: boolean;
}

export interface TaxRatesListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: TaxRateItem[];
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface CreateTaxRatePayload {
  name: string;
  rate: number;
  isDefault?: boolean;
}

export interface UpdateTaxRatePayload {
  name?: string;
  rate?: number;
  isDefault?: boolean;
  active?: boolean;
}

export interface SingleTaxRateResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: TaxRateItem;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface DeleteTaxRateResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    id: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}
