import assert from "node:assert/strict";
import { test } from "node:test";
import { parseManualPayment } from "./input";

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

test("reads a payment taken at the counter", () => {
  assert.deepEqual(
    parseManualPayment(
      reader({ amount: "120.50", method: "card_terminal", description: "Rental" }),
      "USD",
    ),
    { values: { amount: 12050, method: "card_terminal", description: "Rental" } },
  );
});

test("explains what's missing", () => {
  const base = { amount: "10", method: "cash", description: "Fuel" };
  const cases: [Record<string, string>, RegExp][] = [
    [{ amount: "0" }, /amount/],
    [{ amount: "ten" }, /amount/],
    [{ method: "stripe" }, /how it was paid/],
    [{ description: "" }, /what it was for/],
  ];
  for (const [change, message] of cases) {
    const result = parseManualPayment(reader({ ...base, ...change }), "USD");
    assert.ok("error" in result);
    assert.match(result.error, message);
  }
});
