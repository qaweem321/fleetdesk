import assert from "node:assert/strict";
import { test } from "node:test";
import { can, invitableRoles, isStaff, isStaffRole } from "./permissions";

test("owners can do everything", () => {
  for (const permission of [
    "settings:update",
    "fleet:manage",
    "pricing:manage",
    "payments:refund",
    "reports:view",
    "staff:invite",
    "staff:manage",
  ] as const) {
    assert.equal(can("owner", permission), true, permission);
  }
});

test("managers run the business but can't change who is staff", () => {
  assert.equal(can("manager", "settings:update"), true);
  assert.equal(can("manager", "fleet:manage"), true);
  assert.equal(can("manager", "pricing:manage"), true);
  assert.equal(can("manager", "payments:refund"), true);
  assert.equal(can("manager", "reports:view"), true);
  assert.equal(can("manager", "staff:invite"), true);
  assert.equal(can("manager", "staff:manage"), false);
});

test("agents and customers can't change settings or staff", () => {
  for (const role of ["agent", "customer"] as const) {
    assert.equal(can(role, "settings:update"), false);
    assert.equal(can(role, "fleet:manage"), false);
    assert.equal(can(role, "pricing:manage"), false);
    assert.equal(can(role, "payments:refund"), false);
    assert.equal(can(role, "reports:view"), false);
    assert.equal(can(role, "staff:invite"), false);
    assert.equal(can(role, "staff:manage"), false);
  }
});

test("nobody can invite someone with more power than themselves", () => {
  assert.deepEqual(invitableRoles("owner"), ["agent", "manager", "owner"]);
  assert.deepEqual(invitableRoles("manager"), ["agent"]);
  assert.deepEqual(invitableRoles("agent"), []);
  assert.deepEqual(invitableRoles("customer"), []);
});

test("customers are not staff, and customer is not a staff role", () => {
  assert.equal(isStaff("customer"), false);
  assert.equal(isStaff("agent"), true);
  assert.equal(isStaffRole("customer"), false);
  assert.equal(isStaffRole("manager"), true);
  assert.equal(isStaffRole("admin"), false);
});
