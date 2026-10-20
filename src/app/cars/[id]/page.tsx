import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarPhoto } from "@/components/car-photo";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { CarSpecs } from "@/components/site/car-specs";
import { PublicPage } from "@/components/site/public-page";
import { SearchForm } from "@/components/site/search-form";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { bookingRuleProblem } from "@/lib/bookings/rules";
import { defaultSearchTimes, readSearch, searchParamsOf } from "@/lib/bookings/search";
import { searchCars } from "@/lib/bookings/search-results";
import { carModelName } from "@/lib/fleet/labels";
import { getPublicModel, publicLocations } from "@/lib/fleet/queries";
import { formatMoney } from "@/lib/money";
import { requireSettings } from "@/lib/settings";
import type { RawSearchParams } from "@/lib/url-params";
import { isUuid } from "@/lib/uuid";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawSearchParams> };

async function findModel(id: string) {
  return isUuid(id) ? getPublicModel(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await findModel((await params).id);
  return model
    ? {
        title: carModelName(model),
        description: model.description || `Rent a ${carModelName(model)}.`,
      }
    : {};
}

export default async function CarPage({ params, searchParams }: Props) {
  const [{ id }, query, settings, locations] = await Promise.all([
    params,
    searchParams,
    requireSettings(),
    publicLocations(),
  ]);
  const model = await findModel(id);
  if (!model) {
    notFound();
  }
  const name = carModelName(model);
  const money = (amount: number) => formatMoney(amount, settings.currency);

  const search = readSearch(query, settings.timeZone);
  const problem =
    search && "start" in search
      ? bookingRuleProblem(search.start, search.end, settings)
      : search?.error;
  const ready = search && "start" in search && !problem ? search : null;
  const [result] = ready ? await searchCars(ready, settings, model.id) : [];
  const bookHref = ready ? `/book?carModelId=${model.id}&${searchParamsOf(ready.query)}` : "";

  return (
    <PublicPage>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-3">
            <CarPhoto
              url={model.photos[0]?.url ?? null}
              alt={name}
              className="aspect-[3/2] w-full rounded-2xl"
            />
            {model.photos.length > 1 && (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {model.photos.slice(1).map((photo) => (
                  <li key={photo.id}>
                    <a href={photo.url} target="_blank" rel="noreferrer">
                      <CarPhoto
                        url={photo.url}
                        alt={`${name}, more`}
                        className="aspect-[3/2] w-full"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
              <p className="mt-1 text-muted-foreground">
                From {money(model.dailyRate)} per day
                {model.weeklyRate && ` · ${money(model.weeklyRate)} per week`}
              </p>
            </div>
            <CarSpecs model={model} />
            {model.description && (
              <p className="leading-7 text-secondary-foreground">{model.description}</p>
            )}
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                {model.includedDistancePerDay
                  ? `${model.includedDistancePerDay} ${settings.distanceUnit} per day included, then ${money(model.extraDistanceFee)} per ${settings.distanceUnit}`
                  : `Unlimited ${settings.distanceUnit === "km" ? "kilometers" : "miles"}`}
              </li>
              {model.depositAmount > 0 && (
                <li>
                  Deposit of {money(model.depositAmount)} at pickup, given back after the return
                  minus any extra charges
                </li>
              )}
            </ul>

            <div className="rounded-2xl border border-border p-5">
              {result ? (
                <div className="space-y-4">
                  <QuoteBreakdown
                    quote={result.quote}
                    currency={settings.currency}
                    taxName={settings.taxName}
                    taxRate={settings.taxRate}
                  />
                  <ButtonLink href={bookHref} size="full">
                    Book this car
                  </ButtonLink>
                  <p className="text-xs text-subtle-foreground">
                    Extras and coupons on the next step.
                  </p>
                </div>
              ) : ready ? (
                <FormMessage error="This car isn't free for these dates at this location. Try other dates or see the other cars." />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Choose your dates below to see the price and book.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold">Your dates</h2>
          <SearchForm
            locations={locations}
            values={search?.query ?? defaultSearchTimes(settings.timeZone)}
            action={`/cars/${model.id}`}
            submitLabel="Check these dates"
          />
          {problem && <FormMessage error={problem} />}
        </div>
      </div>
    </PublicPage>
  );
}
