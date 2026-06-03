export enum PlanCode {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface Plan {
  id: string;
  name: string;
  code: PlanCode;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxAlbums: number;
  maxPhotosPerAlbum: number;
  maxVideosPerAlbum: number;
  storageLimitGB: number;
  monthlyScanLimit: number;
  maxUsers: number;
  features: string[];
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Subscription {
  id: string;
  studioId: string;
  studio: {
    id: string;
    studioName: string;
    studioCode: string;
    email: string;
  } | null;
  planId: string;
  plan: Plan | null;
  startDate: string;
  endDate: string | null;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  storageUsedGB: number;
  scanUsage: number;
  albumCount: number;
  userCount: number;
  autoRenew: boolean;
  externalBillingId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsageSummary {
  plan: {
    id: string;
    name: string;
    code: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
  };
  limits: {
    maxAlbums: number;
    maxPhotosPerAlbum: number;
    maxVideosPerAlbum: number;
    storageLimitGB: number;
    monthlyScanLimit: number;
    maxUsers: number;
  };
  usage: {
    storageUsedGB: number;
    scanUsage: number;
    albumCount: number;
    userCount: number;
  };
  remaining: {
    storageGB: number | null;
    scans: number | null;
    albums: number | null;
    users: number | null;
  };
  percentages: {
    storage: number;
    scans: number;
    albums: number;
    users: number;
  };
}

export interface CreatePlanPayload {
  name: string;
  code: PlanCode;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxAlbums: number;
  maxPhotosPerAlbum: number;
  maxVideosPerAlbum: number;
  storageLimitGB: number;
  monthlyScanLimit: number;
  maxUsers: number;
  features?: string[];
}

export interface UpdatePlanPayload extends Partial<CreatePlanPayload> {
  isActive?: boolean;
}

export interface AssignPlanPayload {
  studioId: string;
  planId: string;
  billingCycle: BillingCycle;
}

export interface PaginatedSubscriptions {
  items: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
