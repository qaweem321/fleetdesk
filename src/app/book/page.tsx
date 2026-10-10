import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/public-page";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/db";
import { users } from "@/db/schema";
import { searchParamsOf } from "@/lib/bookings/search";
import { carModelName } from "@/lib/fleet/labels";
import { publicLocations } from "@/lib/fleet/queries";
import { formatDateTime } from "@/lib/format";
import { buildQuote } from "@/lib/pricing/build-quote";
import { listExtras } from "@/lib/pricing/queries";
import { parseQuoteRequest } from "@/lib/pricing/request";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { toLocalInput } from "@/lib/time-zone";
import { firstParam, type RawSearchParams } from "@/lib/url-params";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Book", robots: { index: false } };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [user, settings, params, locations, extras] = await Promise.all([
    requireUser(),
    requireSettings(),
    searchParams,
    publicLocations(),
    listExtras({ activeOnly: true }),
  ]);
  const fields = Object.entries(params).map(
    ([name, value]) => [name, firstParam(value) ?? ""] as [string, string],
  );
  const parsed = parseQuoteRequest(fields, settings.timeZone);
  if ("error" in parsed) {
    return <CantContinue message={parsed.error} />;
  }
  const { request } = parsed;
  const [built, [profile]] = await Promise.all([
    buildQuote(request, settings, { forCustomer: true }),
    db.select({ phone: users.phone }).from(users).where(eq(users.id, user.id)),
  ]);
  if ("error" in built) {
    return <CantContinue message={built.error} />;
  }

  const placeName = (id: string) => locations.find((location) => location.id === id)?.name ?? "";
  const query = {
    pickupLocationId: request.pickupLocationId,
    returnLocationId: request.returnLocationId,
    pickupAt: toLocalInput(request.start, settings.timeZone),
    returnAt: toLocalInput(request.end, settings.timeZone),
  };

  return (
    <PublicPage>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link
            href={`/cars/${built.model.id}?${searchParamsOf(query)}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to the car
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Book the {carModelName(built.model)}
          </h1>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Pickup</dt>
              <dd className="font-medium">
                {formatDateTime(request.start, settings.timeZone)} ·{" "}
                {placeName(request.pickupLocationId)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Return</dt>
              <dd className="font-medium">
                {formatDateTime(request.end, settings.timeZone)} ·{" "}
                {placeName(request.returnLocationId)}
              </dd>
            </div>
          </dl>
        </div>
        <BookingForm
          request={{ carModelId: built.model.id, ...query }}
          extras={extras}
          initialQuote={built.quote}
          currency={settings.currency}
          taxName={settings.taxName}
          taxRate={settings.taxRate}
          phone={profile?.phone ?? ""}
        />
      </div>
    </PublicPage>
  );
}

// The car, dates or rules don't allow this booking (any more): explain and offer a way back.
function CantContinue({ message }: { message: string }) {
  return (
    <PublicPage>
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">This booking can&apos;t continue</h1>
        <p className="text-muted-foreground">{message}</p>
        <ButtonLink href="/cars">Choose a car</ButtonLink>
      </div>
    </PublicPage>
  );
}
