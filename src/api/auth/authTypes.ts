import { Role, User } from '../../types';

export interface ApiUserMembership {
  id?: string;
  organizationId: string;
  subOrganizationId?: string | null;
  organization?: {
    id?: string;
    name?: string;
    organizationType?: number | string;
    organizationTypeName?: string;
  };
  role: {
    id?: string;
    code: string;
    name?: string;
    permissions?: Array<{
      permission: {
        code: string;
      };
    }>;
  };
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  active: boolean;
  isPlatformAdmin?: boolean;
  roleId?: string | null;
  roleCode?: string | null;
  organizationId?: string | null;
  subOrganizationId?: string | null;
  accessibleBranchIds?: string[];
  organization?: {
    id?: string;
    name?: string;
    organizationType?: number | string;
    organizationTypeName?: string;
  };
  organizationType?: number | string;
  organizationTypeName?: string;
  role?:
    | {
        id?: string;
        code?: string;
        name?: string;
      }
    | Role
    | string
    | null;
  emailVerifiedAt?: string | null;
  memberships?: ApiUserMembership[];
}

export interface ApiLoginRequest {
  email?: string;
  phone?: string;
  mobileNumber?: string;
  identifier?: string;
  password?: string;
}

export interface ApiLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: ApiUser;
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: {
    token?: string;
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    user?: ApiUser;
  };
}

export interface ApiRefreshTokenResponse {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
  user?: ApiUser;
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: {
    token?: string;
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    user?: ApiUser;
  };
}

export interface ApiForgotPasswordRequest {
  email: string;
}

export interface ApiForgotPasswordResponse {
  message: string;
}

export interface ApiResetPasswordRequest {
  token: string;
  password?: string;
}

export interface ApiVerifyTokenResponse {
  valid: boolean;
  userId: string;
}

export interface ApiMeResponse {
  user: ApiUser;
}

export interface ApiEmailVerificationResponse {
  message: string;
}

export interface ApiVerifyEmailRequest {
  token: string;
}

export interface ApiVerifyEmailResponse {
  message: string;
}

export interface ApiChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

