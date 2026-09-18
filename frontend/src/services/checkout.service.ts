import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type { AlbumPack } from '@/types/pack.types';
import type { LoginResponse } from '@/types/auth.types';

export type CartItem = { packId: string; quantity: number };

export type CartQuote = {
  amountInr: number;
  subtotalInr?: number;
  discountInr?: number;
  couponCode?: string | null;
  discountPercent?: number | null;
  totalMappings: number;
  totalMappingSlots?: number;
  /** @deprecated Albums are unlimited. */
  totalAlbumCredits: number;
  mergesPersonalPacks: boolean;
  lines: Array<{
    packId: string;
    code: string;
    name: string;
    tier: string;
    quantity: number;
    maxMappings: number;
    albumsIncluded: number;
    mappingSlots?: number;
    lineTotalInr: number;
  }>;
};

export type CheckoutOrderResult = {
  checkoutId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  quote: CartQuote;
  provider: string;
};

export type CheckoutVerifyPayload = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

const loadRazorpayScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
    document.body.appendChild(script);
  });

export async function collectRazorpayPayment(input: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  provider: string;
  name?: string;
  email?: string;
  description?: string;
}): Promise<CheckoutVerifyPayload> {
  if (input.provider === 'manual' || input.keyId === 'manual_key') {
    return {
      razorpayOrderId: input.orderId,
      razorpayPaymentId: `pay_manual_${Date.now()}`,
      razorpaySignature: 'manual_ok',
    };
  }

  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error('Razorpay Checkout is unavailable');
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: 'Story-PIX',
      description: input.description ?? 'Album pack',
      order_id: input.orderId,
      prefill: {
        email: input.email,
        name: input.name,
      },
      theme: { color: '#6B2CDB' },
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.open();
  });
}

export const checkoutService = {
  async catalog(): Promise<AlbumPack[]> {
    const { data } = await apiClient.get<ApiResponse<AlbumPack[]>>('/public/checkout/catalog');
    return data.data;
  },

  async quote(items: CartItem[], couponCode?: string): Promise<CartQuote> {
    const { data } = await apiClient.post<ApiResponse<CartQuote>>('/public/checkout/quote', {
      items,
      ...(couponCode?.trim() ? { couponCode: couponCode.trim() } : {}),
    });
    return data.data;
  },

  async createSignupOrder(payload: {
    email: string;
    password: string;
    confirmPassword: string;
    studioName?: string;
    ownerName?: string;
    items: CartItem[];
    couponCode?: string;
  }): Promise<CheckoutOrderResult> {
    const { data } = await apiClient.post<ApiResponse<CheckoutOrderResult>>(
      '/public/checkout/signup/order',
      payload,
    );
    return data.data;
  },

  async verifySignup(
    payload: CheckoutVerifyPayload,
  ): Promise<
    | (LoginResponse & { alreadyProcessed?: boolean })
    | { alreadyProcessed?: boolean; message?: string; email?: string }
  > {
    const { data } = await apiClient.post<
      ApiResponse<
        | (LoginResponse & { alreadyProcessed?: boolean })
        | { alreadyProcessed?: boolean; message?: string; email?: string }
      >
    >('/public/checkout/signup/verify', payload);
    return data.data;
  },

  async createRechargeOrder(items: CartItem[]): Promise<CheckoutOrderResult> {
    const { data } = await apiClient.post<ApiResponse<CheckoutOrderResult>>(
      '/studio/packs/purchase/order',
      { items },
    );
    return data.data;
  },

  async verifyRecharge(payload: CheckoutVerifyPayload) {
    const { data } = await apiClient.post<
      ApiResponse<{ alreadyProcessed: boolean; summary: unknown }>
    >('/studio/packs/purchase/verify', payload);
    return data.data;
  },
};
