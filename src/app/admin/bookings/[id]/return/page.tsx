import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { db } from "@/db";
import { carModels } from "@/db/schema";
import { getBooking } from "@/lib/bookings/queries";
import { locationOptions } from "@/lib/fleet/queries";
import { getInspections } from "@/lib/operations/queries";
import { hasCardDeposit } from "@/lib/payments/deposits";
import { bookingLedger } from "@/lib/payments/records";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";
import { uploadInspectionPhoto } from "../../../uploads";
import { completeReturn } from "./actions";
import { ReturnForm } from "./return-form";

export const metadata: Metadata = { title: "Return" };

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [, settings, booking] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getBooking(id),
  ]);
  if (!booking) {
    notFound();
  }
  if (booking.status !== "active") {
    redirect(`/admin/bookings/${booking.id}`);
  }
  const [{ pickup }, [model], ledger, locations, cardDeposit] = await Promise.all([
    getInspections(booking.id),
    db
      .select({
        includedDistancePerDay: carModels.includedDistancePerDay,
        extraDistanceFee: carModels.extraDistanceFee,
      })
      .from(carModels)
      .where(eq(carModels.id, booking.carModelId)),
    bookingLedger(booking.id, booking.total),
    locationOptions(),
    hasCardDeposit(booking.id),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Return ${booking.reference}`}
        back={{ label: "Booking", href: `/admin/bookings/${booking.id}` }}
        description={`${booking.customerName} · ${booking.make} ${booking.model} · ${booking.plate}`}
      />
      <ReturnForm
        action={completeReturn.bind(null, booking.id)}
        upload={uploadInspectionPhoto.bind(null, booking.id)}
        booking={{
          pickupAt: booking.pickupAt.toISOString(),
          returnAt: booking.returnAt.toISOString(),
          days: booking.days,
          rentalPrice: booking.rentalPrice,
          currency: booking.currency,
          returnLocationId: booking.returnLocationId,
        }}
        model={model}
        pickup={{ mileage: pickup?.mileage ?? 0, fuelLevel: pickup?.fuelLevel ?? 8 }}
        settings={{
          graceMinutes: settings.graceMinutes,
          fuelChargePerEighth: settings.fuelChargePerEighth,
          distanceUnit: settings.distanceUnit,
        }}
        locations={locations.filter((location) => location.active)}
        due={ledger.due}
        depositHeld={ledger.depositHeld}
        depositOnCard={cardDeposit}
      />
    </div>
  );
}
