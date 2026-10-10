import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { makeReference } from "../../lib/bookings/status";
import { demoLogins } from "../../lib/demo";
import { buildAgreementText } from "../../lib/operations/agreement";
import { calculateQuote } from "../../lib/pricing/quote";
import { fromLocalInput, localDateKey } from "../../lib/time-zone";
import { db } from "../index";
import {
  agreements,
  bookingCharges,
  bookings,
  businessSettings,
  carModels,
  driverProfiles,
  inspections,
  locations,
  maintenanceTasks,
  payments,
  users,
  vehicles,
} from "../schema";

const DAY = 86_400_000;

// Sample rentals in every state, so the dashboard, the counter pages and the customer's account
// have something to show: one coming up, one out with the customer, one finished. Only added
// when there are no bookings yet.
export async function seedBookings() {
  if ((await db.$count(bookings)) > 0) {
    return;
  }
  const [[settings], [customer], [airport], [downtown]] = await Promise.all([
    db.select().from(businessSettings),
    db.select().from(users).where(eq(users.email, demoLogins.customer.email)),
    db.select().from(locations).where(eq(locations.name, "Miami Airport (MIA)")),
    db.select().from(locations).where(eq(locations.name, "Downtown Miami")),
  ]);
  if (!settings || !customer || !airport || !downtown) {
    return;
  }
  const tz = settings.timeZone;
  const now = Date.now();
  // "10:00 at the business, `days` from today".
  const at = (days: number, time: string) =>
    fromLocalInput(`${localDateKey(new Date(now + days * DAY), tz)}T${time}`, tz) as Date;

  // The sample customer's license is already checked.
  await db
    .insert(driverProfiles)
    .values({
      userId: customer.id,
      dateOfBirth: "1990-05-17",
      licenseNumber: "S530-460-90-517",
      licenseCountry: "United States",
      licenseExpiresOn: `${new Date().getUTCFullYear() + 4}-05-17`,
      status: "approved",
      verifiedBy: "staff",
      reviewNote: "Checked in person at the counter.",
      submittedAt: new Date(now - 10 * DAY),
      reviewedAt: new Date(now - 10 * DAY),
    })
    .onConflictDoNothing();

  async function vehicleOf(model: string, locationId: string) {
    const [found] = await db
      .select({ vehicle: vehicles, model: carModels })
      .from(vehicles)
      .innerJoin(carModels, eq(carModels.id, vehicles.carModelId))
      .where(and(eq(carModels.model, model), eq(vehicles.locationId, locationId)))
      .limit(1);
    return found;
  }

  const plans = [
    {
      model: "Corolla",
      location: airport,
      start: at(1, "10:00"),
      end: at(4, "10:00"),
      status: "confirmed" as const,
    },
    {
      model: "RAV4",
      location: airport,
      start: at(-1, "09:00"),
      end: at(1, "18:00"),
      status: "active" as const,
    },
    {
      model: "Picanto",
      location: downtown,
      start: at(-8, "10:00"),
      end: at(-5, "10:00"),
      status: "completed" as const,
    },
  ];

  for (const plan of plans) {
    const found = await vehicleOf(plan.model, plan.location.id);
    if (!found) {
      continue;
    }
    const quote = calculateQuote({
      start: plan.start,
      end: plan.end,
      timeZone: tz,
      graceMinutes: settings.graceMinutes,
      rates: { dailyRate: found.model.dailyRate, weeklyRate: found.model.weeklyRate },
      seasons: [],
      extras: [],
      dropOffFee: 0,
      coupon: null,
      taxRate: settings.taxRate,
    });
    const [booking] = await db
      .insert(bookings)
      .values({
        reference: makeReference(randomBytes(6)),
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: "+1 555 0123",
        carModelId: found.model.id,
        vehicleId: found.vehicle.id,
        pickupLocationId: plan.location.id,
        returnLocationId: plan.location.id,
        pickupAt: plan.start,
        returnAt: plan.end,
        readyAt: new Date(plan.end.getTime() + settings.turnaroundMinutes * 60_000),
        status: plan.status,
        paymentMethod: "pay_at_pickup",
        currency: settings.currency,
        days: quote.days,
        rentalPrice: quote.rentalPrice,
        extrasTotal: 0,
        dropOffFee: 0,
        discount: 0,
        taxRate: settings.taxRate,
        taxName: settings.taxName,
        tax: quote.tax,
        total: quote.total,
        depositAmount: found.model.depositAmount,
        pickedUpAt: plan.status === "confirmed" ? null : plan.start,
        returnedAt: plan.status === "completed" ? plan.end : null,
        createdAt: new Date(plan.start.getTime() - 5 * DAY),
      })
      .returning();
    if (plan.status === "confirmed") {
      continue;
    }

    // Out or back: it was picked up, inspected, signed and paid at the counter.
    const mileage = found.vehicle.mileage;
    await db.insert(inspections).values({
      bookingId: booking.id,
      kind: "pickup",
      mileage,
      fuelLevel: 8,
      createdAt: plan.start,
    });
    await db.insert(agreements).values({
      bookingId: booking.id,
      signerName: customer.name,
      signedAt: plan.start,
      text: buildAgreementText({
        businessName: settings.businessName,
        businessAddress: settings.address,
        reference: booking.reference,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: booking.customerPhone,
        car: `${found.model.make} ${found.model.model}`,
        plate: found.vehicle.plate,
        pickupAt: plan.start,
        returnAt: plan.end,
        pickupLocation: plan.location.name,
        returnLocation: plan.location.name,
        mileage,
        fuelLevel: 8,
        distanceUnit: settings.distanceUnit,
        total: quote.total,
        depositAmount: found.model.depositAmount,
        currency: settings.currency,
        timeZone: tz,
        terms: settings.agreementTerms,
      }),
    });
    await db.insert(payments).values([
      {
        bookingId: booking.id,
        kind: "payment",
        method: "card_terminal",
        amount: quote.total,
        description: "Rental",
        createdAt: plan.start,
      },
      {
        bookingId: booking.id,
        kind: "deposit_hold",
        method: "card_terminal",
        amount: found.model.depositAmount,
        description: "Deposit taken at the counter",
        createdAt: plan.start,
      },
    ]);
    if (plan.status === "completed") {
      const back = mileage + 240;
      await db.insert(inspections).values({
        bookingId: booking.id,
        kind: "return",
        mileage: back,
        fuelLevel: 6,
        createdAt: plan.end,
      });
      await db.insert(bookingCharges).values({
        bookingId: booking.id,
        kind: "fuel",
        description: "Fuel: 2/8 of a tank less than at pickup",
        amount: 2400,
      });
      await db.insert(payments).values({
        bookingId: booking.id,
        kind: "deposit_capture",
        method: "card_terminal",
        amount: 2400,
        description: "Kept from the deposit",
        createdAt: plan.end,
      });
      await db.update(vehicles).set({ mileage: back }).where(eq(vehicles.id, found.vehicle.id));
    }
  }

  // One service coming up soon, so the dashboard and the Maintenance page show something.
  const corolla = await vehicleOf("Corolla", downtown.id);
  if (corolla) {
    await db.insert(maintenanceTasks).values({
      vehicleId: corolla.vehicle.id,
      title: "Oil change",
      dueMileage: corolla.vehicle.mileage + 300,
      repeatDistance: 10000,
    });
  }
}
