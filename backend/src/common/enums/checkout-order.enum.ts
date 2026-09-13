export enum CheckoutOrderKind {
  SIGNUP_PACK = 'signup_pack',
  RECHARGE_PACK = 'recharge_pack',
}

export enum CheckoutOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FULFILLED = 'fulfilled',
  FAILED = 'failed',
  EXPIRED = 'expired',
}
