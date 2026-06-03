export const UNLIMITED = -1;

export interface PlanLimits {
  maxAlbums: number;
  maxPhotosPerAlbum: number;
  maxVideosPerAlbum: number;
  storageLimitGB: number;
  monthlyScanLimit: number;
  maxUsers: number;
}

export interface SubscriptionUsageContext {
  subscriptionId: string;
  studioId: string;
  plan: PlanLimits & { id: string; name: string; code: string; monthlyPrice: number; yearlyPrice: number };
  status: string;
  billingCycle: string;
  startDate: Date;
  endDate: Date | null;
  storageUsedGB: number;
  scanUsage: number;
  albumCount: number;
  userCount: number;
  autoRenew: boolean;
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
    status: string;
    billingCycle: string;
    startDate: Date | null;
    endDate: Date | null;
    autoRenew: boolean;
  };
  limits: PlanLimits;
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
