export interface PrefixItem {
  prefix: string;
  nextNumber?: string;
}

export type TransactionPrefixesMap = Record<string, PrefixItem>;

export interface NumberingSettingsData {
  prefixOptions: string[];
  transactionPrefixes: TransactionPrefixesMap;
  updatedAt?: string;
}

export interface NumberingSettingsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: NumberingSettingsData;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface UpdateNumberingSettingsPayload {
  prefixOptions?: string[];
  transactionPrefixes?: Record<string, Partial<PrefixItem>>;
}

export interface AddPrefixOptionPayload {
  prefix: string;
}

export interface AddPrefixOptionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    prefixOptions: string[];
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface RemovePrefixOptionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    prefixOptions: string[];
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
