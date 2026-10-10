import Link from "next/link";
import { CarPhoto } from "@/components/car-photo";
import { PublicPage } from "@/components/site/public-page";
import { SearchForm } from "@/components/site/search-form";
import { defaultSearchTimes } from "@/lib/bookings/search";
import { carModelName } from "@/lib/fleet/labels";
import { listPublicModels, publicLocations } from "@/lib/fleet/queries";
import { formatMoney } from "@/lib/money";
import { requireSettings } from "@/lib/settings";

const steps = [
  {
    title: "Choose your dates",
    text: "Pick where and when. You see the full price, taxes included.",
  },
  {
    title: "Book in minutes",
    text: "Add extras like a child seat, then confirm. No payment needed now.",
  },
  { title: "Pick up and go", text: "Show your driver's license at the counter and drive away." },
];

export default async function HomePage() {
  const [settings, locations, models] = await Promise.all([
    requireSettings(),
    publicLocations(),
    listPublicModels(),
  ]);

  return (
    <PublicPage>
      <section className="bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 space-y-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Rent a car from {settings.businessName}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Pick your dates, choose a car and book online in a few minutes.
            </p>
          </div>
          {locations.length > 0 ? (
            <SearchForm locations={locations} values={defaultSearchTimes(settings.timeZone)} />
          ) : (
            <p className="text-muted-foreground">Online booking opens soon.</p>
          )}
        </div>
      </section>

      {models.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Our cars</h2>
            <Link href="/cars" className="text-sm font-medium text-link hover:underline">
              See all cars →
            </Link>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {models.slice(0, 6).map((model) => (
              <li key={model.id}>
                <Link
                  href={`/cars/${model.id}`}
                  className="block overflow-hidden rounded-2xl border border-border hover:shadow-md"
                >
                  <CarPhoto
                    url={model.photoUrl}
                    alt={carModelName(model)}
                    className="aspect-[3/2] w-full rounded-none"
                  />
                  <div className="flex items-center justify-between gap-2 p-4">
                    <span className="font-semibold">{carModelName(model)}</span>
                    <span className="text-sm text-muted-foreground">
                      from{" "}
                      <strong className="text-foreground">
                        {formatMoney(model.dailyRate, settings.currency)}
                      </strong>{" "}
                      / day
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title}>
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </p>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {locations.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
            <h2 className="text-2xl font-bold">Where to find us</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <li key={location.id} className="rounded-xl border border-border p-4">
                  <p className="font-medium">{location.name}</p>
                  {location.address && (
                    <p className="mt-1 text-sm text-muted-foreground">{location.address}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </PublicPage>
  );
}
