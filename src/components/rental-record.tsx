import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { fuelLabel } from "@/lib/operations/charges";
import { getAgreement, getInspections, listCharges } from "@/lib/operations/queries";

type Props = {
  bookingId: string;
  currency: string;
  timeZone: string;
  distanceUnit: string;
  // Where the agreement and receipt pages are: the admin area or the customer's account.
  basePath: string;
};

// What happened at the counter: the car's state at pickup and return (with photos), the signed
// agreement and any extra charges. The same record for staff and for the customer.
export async function RentalRecord({
  bookingId,
  currency,
  timeZone,
  distanceUnit,
  basePath,
}: Props) {
  const [{ pickup, back }, agreement, charges] = await Promise.all([
    getInspections(bookingId),
    getAgreement(bookingId),
    listCharges(bookingId),
  ]);
  if (!pickup) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border p-5 space-y-5">
      <h2 className="text-lg font-semibold">Pickup and return</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { title: "At pickup", inspection: pickup },
          { title: "At return", inspection: back },
        ].map(({ title, inspection }) => (
          <div key={title} className="space-y-2 text-sm">
            <p className="font-medium">{title}</p>
            {inspection ? (
              <>
                <p className="text-muted-foreground">
                  {formatDateTime(inspection.createdAt, timeZone)} ·{" "}
                  {inspection.mileage.toLocaleString("en-US")} {distanceUnit} · fuel{" "}
                  {fuelLabel(inspection.fuelLevel)}
                </p>
                {inspection.notes && <p>{inspection.notes}</p>}
                {inspection.photos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {inspection.photos.map((photo, index) => (
                      <li key={photo.id}>
                        <a href={photo.url} target="_blank" rel="noreferrer">
                          {/* biome-ignore lint/performance/noImgElement: private uploads served by our own route */}
                          <img
                            src={photo.url}
                            alt={`${title}, ${index + 1}`}
                            className="h-16 w-24 rounded-md border border-border object-cover"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Not returned yet.</p>
            )}
          </div>
        ))}
      </div>

      {charges.length > 0 && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Extra charges</p>
          <ul className="space-y-1">
            {charges.map((charge) => (
              <li key={charge.id} className="flex justify-between gap-3">
                <span>{charge.description}</span>
                <span className="tabular-nums">{formatMoney(charge.amount, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {agreement && (
          <Link href={`${basePath}/agreement`} className="text-link hover:underline">
            Signed agreement
          </Link>
        )}
        {back && (
          <Link href={`${basePath}/receipt`} className="text-link hover:underline">
            Receipt
          </Link>
        )}
      </div>
    </section>
  );
}
