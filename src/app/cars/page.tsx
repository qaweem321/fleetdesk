import type { Metadata } from "next";
import Link from "next/link";
import { CarPhoto } from "@/components/car-photo";
import { CarSpecs } from "@/components/site/car-specs";
import { PublicPage } from "@/components/site/public-page";
import { SearchForm } from "@/components/site/search-form";
import { FormMessage } from "@/components/ui/field";
import { bookingRuleProblem } from "@/lib/bookings/rules";
import {
  defaultSearchTimes,
  type ParsedSearch,
  readSearch,
  searchParamsOf,
} from "@/lib/bookings/search";
import { searchCars } from "@/lib/bookings/search-results";
import { carModelName } from "@/lib/fleet/labels";
import { listPublicModels, publicLocations } from "@/lib/fleet/queries";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { type BusinessSettings, requireSettings } from "@/lib/settings";
import type { RawSearchParams } from "@/lib/url-params";

export const metadata: Metadata = {
  title: "Cars",
  description: "Our cars and prices. Choose your dates to see what's free.",
};

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [settings, locations, params] = await Promise.all([
    requireSettings(),
    publicLocations(),
    searchParams,
  ]);
  const search = readSearch(params, settings.timeZone);
  const problem =
    search && "start" in search
      ? bookingRuleProblem(search.start, search.end, settings)
      : search?.error;
  const ready = search && "start" in search && !problem ? search : null;
  const formValues = search?.query ?? defaultSearchTimes(settings.timeZone);

  return (
    <PublicPage>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {ready ? "Available cars" : "Our cars"}
          </h1>
          {ready && (
            <p className="mt-1 text-muted-foreground">
              {formatDateTime(ready.start, settings.timeZone)} –{" "}
              {formatDateTime(ready.end, settings.timeZone)}
            </p>
          )}
        </div>
        <SearchForm locations={locations} values={formValues} />
        {problem && <FormMessage error={problem} />}

        {ready ? <Results search={ready} settings={settings} /> : <Catalog settings={settings} />}
      </div>
    </PublicPage>
  );
}

async function Results({ search, settings }: { search: ParsedSearch; settings: BusinessSettings }) {
  const money = (amount: number) => formatMoney(amount, settings.currency);
  const results = await searchCars(search, settings);
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">No cars are free for these dates at this location.</p>
        <p className="mt-1 text-sm text-muted-foreground">Try other dates or another location.</p>
      </div>
    );
  }
  const query = searchParamsOf(search.query);
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((model) => (
        <li key={model.id}>
          <CarCard
            href={`/cars/${model.id}?${query}`}
            model={model}
            price={
              <>
                <p className="text-xl font-bold">{money(model.quote.total)}</p>
                <p className="text-xs text-subtle-foreground">
                  total for {model.quote.days} {model.quote.days === 1 ? "day" : "days"}
                  {settings.taxRate > 0 && `, ${settings.taxName.toLowerCase()} included`}
                </p>
              </>
            }
            note={model.freeCount <= 2 ? `Only ${model.freeCount} left` : null}
          />
        </li>
      ))}
    </ul>
  );
}

async function Catalog({ settings }: { settings: BusinessSettings }) {
  const models = await listPublicModels();
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((model) => (
        <li key={model.id}>
          <CarCard
            href={`/cars/${model.id}`}
            model={model}
            price={
              <>
                <p className="text-xs text-subtle-foreground">from</p>
                <p className="text-xl font-bold">
                  {formatMoney(model.dailyRate, settings.currency)}
                  <span className="text-sm font-normal text-muted-foreground"> / day</span>
                </p>
              </>
            }
            note={null}
          />
        </li>
      ))}
    </ul>
  );
}

type CardModel = Parameters<typeof CarSpecs>[0]["model"] & {
  make: string;
  model: string;
  photoUrl: string | null;
};

function CarCard({
  href,
  model,
  price,
  note,
}: {
  href: string;
  model: CardModel;
  price: React.ReactNode;
  note: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border transition hover:shadow-md"
    >
      <CarPhoto
        url={model.photoUrl}
        alt={carModelName(model)}
        className="aspect-[3/2] w-full rounded-none"
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{carModelName(model)}</h2>
          {note && <span className="shrink-0 text-xs font-medium text-warning">{note}</span>}
        </div>
        <CarSpecs model={model} />
        <div className="mt-auto flex items-end justify-between">
          <div>{price}</div>
          <span className="text-sm font-medium text-link">View →</span>
        </div>
      </div>
    </Link>
  );
}
