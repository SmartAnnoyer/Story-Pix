export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  usedCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateCouponPayload {
  code: string;
  discountPercent: number;
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
  note?: string | null;
}

export interface UpdateCouponPayload {
  discountPercent?: number;
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
  note?: string | null;
}
