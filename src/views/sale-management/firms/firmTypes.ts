export interface FirmItem {
  id: string;
  name: string;
  code: string;
  logo?: string;
  registrationType?: string;
  gstNumber?: string;
  panNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  branchId?: string;
  branchName?: string;
  subOrganizationId?: string;
  subOrganizationName?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  location?: string;
  pincode?: string;
  address?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
}
