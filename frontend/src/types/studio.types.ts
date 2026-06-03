export enum StudioStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  EXPIRED = 'expired',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface Studio {
  id: string;
  studioCode: string;
  studioName: string;
  ownerName: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
  website: string | null;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  storageLimitGB: number;
  storageUsedGB: number;
  monthlyScanLimit: number;
  monthlyScanUsage: number;
  status: StudioStatus;
  createdAt: string | null;
  updatedAt: string | null;
  adminAccess?: StudioAdminAccess | null;
}

export interface StudioAdminAccess {
  email: string;
  temporaryPassword: string | null;
  passwordChanged: boolean;
}

export interface StudioUsage {
  storageLimitGB: number;
  storageUsedGB: number;
  storageUsedPercent: number;
  monthlyScanLimit: number;
  monthlyScanUsage: number;
  monthlyScanUsedPercent: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId: string | null;
  status: StudioStatus;
}

export interface AdminDashboardStats {
  totalStudios: number;
  activeStudios: number;
  suspendedStudios: number;
  trialStudios: number;
  expiredStudios: number;
  totalStorageUsedGB: number;
  totalMonthlyScans: number;
  revenuePlaceholder: number;
  subscriptionSummary: {
    trial: number;
    active: number;
    expired: number;
    suspended: number;
  };
}

export interface PaginatedStudios {
  items: Studio[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CreateStudioPayload {
  studioName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface UpdateStudioPayload {
  studioName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  status?: StudioStatus;
}

export interface CreateStudioResult {
  studio: Studio;
  admin: {
    email: string;
    temporaryPassword: string;
  };
}

export interface StudioQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudioStatus;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}
