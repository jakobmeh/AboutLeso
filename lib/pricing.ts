export const FREE_SHIPPING_THRESHOLD_CENTS = 8000;
export const STANDARD_SHIPPING_CENTS = 399;

export function getShippingCents(subtotalCents: number) {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
}
