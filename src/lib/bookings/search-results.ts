import { eq } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { mainPhotos } from "@/lib/fleet/queries";
import { listSeasons } from "@/lib/pricing/queries";
import { calculateQuote } from "@/lib/pricing/quote";
import type { BusinessSettings } from "@/lib/settings";
import { availableModels, bookingWindow } from "./availability";
import type { ParsedSearch } from "./search";

// The cars free for a search, each with its price for those dates (without extras). Uses the
// same calculator as the booking, so the price shown here is the price at checkout.
export async function searchCars(
  search: ParsedSearch,
  settings: BusinessSettings,
  onlyModelId?: string,
) {
  const { query, start, end } = search;
  const window = bookingWindow(start, end, settings.turnaroundMinutes);
  const [models, seasonRules, [dropOff]] = await Promise.all([
    availableModels(query.pickupLocationId, window),
    listSeasons(),
    query.returnLocationId === query.pickupLocationId
      ? Promise.resolve([{ dropOffFee: 0 }])
      : db
          .select({ dropOffFee: locations.dropOffFee })
          .from(locations)
          .where(eq(locations.id, query.returnLocationId)),
  ]);
  const matching = onlyModelId ? models.filter((model) => model.id === onlyModelId) : models;
  const photos = await mainPhotos(matching.map((model) => model.id));

  return matching.map((model) => ({
    ...model,
    photoUrl: photos.get(model.id) ?? null,
    quote: calculateQuote({
      start,
      end,
      timeZone: settings.timeZone,
      graceMinutes: settings.graceMinutes,
      rates: { dailyRate: model.dailyRate, weeklyRate: model.weeklyRate },
      seasons: seasonRules,
      extras: [],
      dropOffFee: dropOff?.dropOffFee ?? 0,
      coupon: null,
      taxRate: settings.taxRate,
    }),
  }));
}
