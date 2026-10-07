import { Role, User } from '../../types';

export interface ApiUserMembership {
  organizationId: string;
  role: {
    code: string;
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
  email: string;
  password?: string;
}

export interface ApiLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: ApiUser;
}

export interface ApiRefreshTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: ApiUser;
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

export interface ApiChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
