import { and, asc, count, desc, eq, getTableColumns, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { carModelPhotos, carModels, locations, vehicleBlocks, vehicles } from "@/db/schema";
import { fileUrl } from "@/lib/storage";
import type { VehicleStatus } from "./labels";

// Read queries for the fleet pages. Each one is a single round trip (joins and grouping
// instead of a query per row).

export async function listLocations() {
  return db
    .select({ ...getTableColumns(locations), vehicleCount: count(vehicles.id) })
    .from(locations)
    .leftJoin(vehicles, eq(vehicles.locationId, locations.id))
    .groupBy(locations.id)
    .orderBy(desc(locations.active), asc(locations.name));
}

export async function getLocation(id: string) {
  const [location] = await db
    .select({ ...getTableColumns(locations), vehicleCount: count(vehicles.id) })
    .from(locations)
    .leftJoin(vehicles, eq(vehicles.locationId, locations.id))
    .where(eq(locations.id, id))
    .groupBy(locations.id);
  return location ?? null;
}

// For pickers: id and name, active ones first.
export async function locationOptions() {
  return db
    .select({ id: locations.id, name: locations.name, active: locations.active })
    .from(locations)
    .orderBy(desc(locations.active), asc(locations.name));
}

// The first photo of each model, as a URL (or null).
async function mainPhotos(modelIds: string[]) {
  if (modelIds.length === 0) {
    return new Map<string, string>();
  }
  const rows = await db
    .selectDistinctOn([carModelPhotos.carModelId], {
      carModelId: carModelPhotos.carModelId,
      fileId: carModelPhotos.fileId,
    })
    .from(carModelPhotos)
    .where(inArray(carModelPhotos.carModelId, modelIds))
    .orderBy(carModelPhotos.carModelId, asc(carModelPhotos.position));
  return new Map(rows.map((row) => [row.carModelId, fileUrl(row.fileId)]));
}

export async function listCarModels() {
  const models = await db
    .select({ ...getTableColumns(carModels), vehicleCount: count(vehicles.id) })
    .from(carModels)
    .leftJoin(vehicles, eq(vehicles.carModelId, carModels.id))
    .groupBy(carModels.id)
    .orderBy(desc(carModels.active), asc(carModels.make), asc(carModels.model));
  const photos = await mainPhotos(models.map((model) => model.id));
  return models.map((model) => ({ ...model, photoUrl: photos.get(model.id) ?? null }));
}

export async function getCarModel(id: string) {
  const [[model], photos] = await Promise.all([
    db.select().from(carModels).where(eq(carModels.id, id)),
    db
      .select({ fileId: carModelPhotos.fileId })
      .from(carModelPhotos)
      .where(eq(carModelPhotos.carModelId, id))
      .orderBy(asc(carModelPhotos.position)),
  ]);
  if (!model) {
    return null;
  }
  return {
    ...model,
    photos: photos.map((photo) => ({ id: photo.fileId, url: fileUrl(photo.fileId) })),
  };
}

// For pickers: "Toyota Corolla".
export async function carModelOptions() {
  return db
    .select({ id: carModels.id, make: carModels.make, model: carModels.model })
    .from(carModels)
    .orderBy(asc(carModels.make), asc(carModels.model));
}

export type VehicleFilters = {
  carModelId?: string;
  locationId?: string;
  status?: VehicleStatus;
};

export async function listVehicles(filters: VehicleFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.carModelId) {
    conditions.push(eq(vehicles.carModelId, filters.carModelId));
  }
  if (filters.locationId) {
    conditions.push(eq(vehicles.locationId, filters.locationId));
  }
  if (filters.status) {
    conditions.push(eq(vehicles.status, filters.status));
  }
  return db
    .select({
      ...getTableColumns(vehicles),
      make: carModels.make,
      model: carModels.model,
      locationName: locations.name,
    })
    .from(vehicles)
    .innerJoin(carModels, eq(vehicles.carModelId, carModels.id))
    .innerJoin(locations, eq(vehicles.locationId, locations.id))
    .where(and(...conditions))
    .orderBy(asc(carModels.make), asc(carModels.model), asc(vehicles.plate));
}

export async function getVehicle(id: string) {
  const [[vehicle], blocks] = await Promise.all([
    db
      .select({
        ...getTableColumns(vehicles),
        make: carModels.make,
        model: carModels.model,
        locationName: locations.name,
      })
      .from(vehicles)
      .innerJoin(carModels, eq(vehicles.carModelId, carModels.id))
      .innerJoin(locations, eq(vehicles.locationId, locations.id))
      .where(eq(vehicles.id, id)),
    db
      .select()
      .from(vehicleBlocks)
      .where(eq(vehicleBlocks.vehicleId, id))
      .orderBy(desc(vehicleBlocks.startsAt)),
  ]);
  return vehicle ? { ...vehicle, blocks } : null;
}
