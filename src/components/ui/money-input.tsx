import type { ComponentProps } from "react";
import { moneyInputValue } from "@/lib/money";
import { Input } from "./input";

type Props = Omit<ComponentProps<"input">, "defaultValue" | "type"> & {
  currency: string;
  // The saved amount in cents (null or undefined: empty field).
  amount?: number | null;
};

// A price field: the currency code in front, a plain decimal number inside ("49.00").
// The server reads it with parseMoney().
export function MoneyInput({ currency, amount, className, ...props }: Props) {
  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        {currency}
      </span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={
          amount === null || amount === undefined ? "" : moneyInputValue(amount, currency)
        }
        className={`rounded-l-none ${className ?? ""}`}
      />
    </div>
  );
}
