import assert from "node:assert/strict";
import { test } from "node:test";
import {
  currencyDecimals,
  formatMoney,
  isValidCurrency,
  moneyInputValue,
  parseMoney,
} from "./money";

test("knows how many decimals each currency has", () => {
  assert.equal(currencyDecimals("USD"), 2);
  assert.equal(currencyDecimals("JPY"), 0);
  assert.equal(currencyDecimals("KWD"), 3);
});

test("formats amounts stored in the smallest unit", () => {
  assert.equal(formatMoney(4999, "USD"), "$49.99");
  assert.equal(formatMoney(500000, "USD"), "$5,000.00");
  assert.equal(formatMoney(4999, "JPY"), "¥4,999");
  assert.equal(formatMoney(0, "EUR"), "€0.00");
});

test("reads typed amounts into the smallest unit", () => {
  assert.equal(parseMoney("49.99", "USD"), 4999);
  assert.equal(parseMoney("49.9", "USD"), 4990);
  assert.equal(parseMoney("49", "USD"), 4900);
  assert.equal(parseMoney(" 1,250.50 ", "USD"), 125050);
  assert.equal(parseMoney("0", "USD"), 0);
  assert.equal(parseMoney("5000", "JPY"), 5000);
  assert.equal(parseMoney("1.255", "KWD"), 1255);
});

test("refuses anything that isn't a plain positive amount", () => {
  for (const bad of ["", "-5", "abc", "1.999", "1e5", "12.", ".5"]) {
    assert.equal(parseMoney(bad, "USD"), null, bad);
  }
  assert.equal(parseMoney("10.5", "JPY"), null);
});

test("writes amounts back for form fields", () => {
  assert.equal(moneyInputValue(4990, "USD"), "49.90");
  assert.equal(moneyInputValue(5000, "JPY"), "5000");
});

test("accepts only real currency codes", () => {
  assert.equal(isValidCurrency("USD"), true);
  assert.equal(isValidCurrency("PKR"), true);
  assert.equal(isValidCurrency("usd"), false);
  assert.equal(isValidCurrency("XYZ"), false);
});

test("amounts too large for the database are refused", () => {
  assert.equal(parseMoney("20000000.00", "USD"), 2_000_000_000);
  assert.equal(parseMoney("20000000.01", "USD"), null);
  assert.equal(parseMoney("999999999.99", "USD"), null);
  assert.equal(parseMoney("999999999999", "JPY"), null);
});
