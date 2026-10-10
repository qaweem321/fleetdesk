// Coupon rules (pure functions). A coupon takes money off the rental price only: extras,
// drop-off fees and tax are charged in full.

export type CouponRules = {
  type: "percent" | "fixed";
  amount: number;
  validFrom: string | null;
  validUntil: string | null;
  minDays: number | null;
  maxUses: number | null;
  timesUsed: number;
  active: boolean;
};

// "summer-10 " -> "SUMMER-10". Codes are saved and compared this way.
export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

// Why a coupon can't be used for this booking, or null when it can. `today` is the booking
// date at the business ("2026-10-11").
export function couponProblem(coupon: CouponRules, today: string, days: number): string | null {
  if (!coupon.active) {
    return "This code is no longer valid.";
  }
  if (coupon.validFrom && today < coupon.validFrom) {
    return "This code isn't valid yet.";
  }
  if (coupon.validUntil && today > coupon.validUntil) {
    return "This code has expired.";
  }
  if (coupon.maxUses !== null && coupon.timesUsed >= coupon.maxUses) {
    return "This code has been used up.";
  }
  if (coupon.minDays !== null && days < coupon.minDays) {
    return `This code is for rentals of ${coupon.minDays} days or more.`;
  }
  return null;
}

// The discount on a rental price. Never more than the price itself.
export function couponDiscount(coupon: Pick<CouponRules, "type" | "amount">, rentalPrice: number) {
  const discount =
    coupon.type === "percent" ? Math.round((rentalPrice * coupon.amount) / 100) : coupon.amount;
  return Math.min(discount, rentalPrice);
}
