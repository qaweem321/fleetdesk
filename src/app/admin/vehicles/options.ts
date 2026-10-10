import { carModelName } from "@/lib/fleet/labels";
import { carModelOptions, locationOptions } from "@/lib/fleet/queries";

// The car model and location choices for the vehicle form. Inactive locations are marked, so
// a vehicle can still be saved while it's based at one.
export async function vehicleFormOptions() {
  const [models, locations] = await Promise.all([carModelOptions(), locationOptions()]);
  return {
    models: models.map((model) => ({ id: model.id, name: carModelName(model) })),
    locations: locations.map((location) => ({
      id: location.id,
      name: location.active ? location.name : `${location.name} (inactive)`,
    })),
  };
}
