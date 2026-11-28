export interface AccountRole {
  id?: string;
  code?: string;
  name?: string;
}

export interface AccountProfileData {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
  active?: boolean;
  isPlatformAdmin?: boolean;
  role?: AccountRole | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountProfileResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: AccountProfileData;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface UpdateAccountProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    updated: boolean;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface Toggle2FaPayload {
  enabled?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorAuth?: boolean;
}

export interface Toggle2FaResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    twoFactorEnabled: boolean;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
