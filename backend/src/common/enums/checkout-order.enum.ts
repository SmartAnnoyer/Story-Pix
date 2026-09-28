export enum CheckoutOrderKind {
  SIGNUP_PACK = 'signup_pack',
  RECHARGE_PACK = 'recharge_pack',
  SCAN_RENEWAL = 'scan_renewal',
}

export enum CheckoutOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FULFILLED = 'fulfilled',
  FAILED = 'failed',
  EXPIRED = 'expired',
}
