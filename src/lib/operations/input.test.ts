import assert from "node:assert/strict";
import { test } from "node:test";
import { parseChargeLines, parseInspectionInput, parseSignature } from "./input";

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

test("reads an inspection", () => {
  assert.deepEqual(
    parseInspectionInput(reader({ mileage: "12500", fuelLevel: "8", notes: "" }), 12000),
    {
      values: { mileage: 12500, fuelLevel: 8, notes: null },
    },
  );
});

test("the mileage can't go backwards and fuel is 0 to 8 eighths", () => {
  const lower = parseInspectionInput(reader({ mileage: "11999", fuelLevel: "8" }), 12000);
  assert.ok("error" in lower);
  assert.match(lower.error, /lower than 12,000/);
  assert.ok("error" in parseInspectionInput(reader({ mileage: "12500", fuelLevel: "9" }), 0));
  assert.ok("error" in parseInspectionInput(reader({ mileage: "", fuelLevel: "8" }), 0));
});

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

test("accepts a drawn signature as a PNG", () => {
  const signature = parseSignature(`data:image/png;base64,${png.toString("base64")}`);
  assert.ok(signature?.equals(png));
});

test("refuses anything that isn't a small PNG", () => {
  assert.equal(parseSignature(""), null);
  assert.equal(parseSignature(`data:image/jpeg;base64,${png.toString("base64")}`), null);
  assert.equal(
    parseSignature(`data:image/png;base64,${Buffer.from("<svg>").toString("base64")}`),
    null,
  );
  const huge = Buffer.concat([png, Buffer.alloc(400 * 1024)]);
  assert.equal(parseSignature(`data:image/png;base64,${huge.toString("base64")}`), null);
});

test("reads the charges confirmed at the return", () => {
  const json = JSON.stringify([
    { kind: "fuel", description: "Fuel: 2/8 less", amount: 2400 },
    { kind: "damage", description: " Scratch on the rear bumper ", amount: 15000 },
  ]);
  assert.deepEqual(parseChargeLines(json), {
    values: [
      { kind: "fuel", description: "Fuel: 2/8 less", amount: 2400 },
      { kind: "damage", description: "Scratch on the rear bumper", amount: 15000 },
    ],
  });
  assert.deepEqual(parseChargeLines(""), { values: [] });
});

test("refuses charges that don't make sense", () => {
  for (const bad of [
    "not json",
    JSON.stringify([{ kind: "bribe", description: "x", amount: 100 }]),
    JSON.stringify([{ kind: "damage", description: "", amount: 100 }]),
    JSON.stringify([{ kind: "damage", description: "Dent", amount: -5 }]),
    JSON.stringify([{ kind: "damage", description: "Dent", amount: 10.5 }]),
  ]) {
    assert.ok("error" in parseChargeLines(bad), bad);
  }
});
