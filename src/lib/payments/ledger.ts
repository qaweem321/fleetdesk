// Adds up a booking's payment records (pure, so it's easy to test). Every screen and email that
// shows "paid", "to pay" or "deposit held" uses this, so they always agree.

export type LedgerEntry = {
  kind: "payment" | "refund" | "deposit_hold" | "deposit_capture" | "deposit_release";
  amount: number;
};

export type Ledger = {
  // Money received, minus refunds. Charged deposit amounts count as received.
  paid: number;
  refunded: number;
  // A deposit currently held on the card (not charged, not released).
  depositHeld: number;
  // What the customer still owes for the booking total (never below 0).
  due: number;
};

export function summarizePayments(entries: LedgerEntry[], bookingTotal: number): Ledger {
  let received = 0;
  let refunded = 0;
  let held = 0;
  for (const entry of entries) {
    switch (entry.kind) {
      case "payment":
        received += entry.amount;
        break;
      case "refund":
        refunded += entry.amount;
        break;
      case "deposit_hold":
        held += entry.amount;
        break;
      case "deposit_capture":
        // Charging part of the deposit ends the hold on the whole amount.
        received += entry.amount;
        held = 0;
        break;
      case "deposit_release":
        held = 0;
        break;
    }
  }
  const paid = received - refunded;
  return { paid, refunded, depositHeld: held, due: Math.max(0, bookingTotal - paid) };
}

// The records written when a deposit is settled at the return: what was kept and what went back
// to the customer, so the payment list shows both (e.g. $104 kept, $146 given back).
export function depositSettlementRows(held: number, keep: number, givenBack: string) {
  const kept = Math.min(Math.max(keep, 0), held);
  const rows: {
    kind: "deposit_capture" | "deposit_release";
    amount: number;
    description: string;
  }[] = [];
  if (kept > 0) {
    rows.push({ kind: "deposit_capture", amount: kept, description: "Kept from the deposit" });
  }
  if (held - kept > 0) {
    rows.push({ kind: "deposit_release", amount: held - kept, description: givenBack });
  }
  return rows;
}
