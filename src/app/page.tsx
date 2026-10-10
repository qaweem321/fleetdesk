import { PublicPage } from "@/components/site/public-page";
import { requireSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = await requireSettings();

  return (
    <PublicPage>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Rent a car from {settings.businessName}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Pick your dates, choose a car and book online in a few minutes.
        </p>
      </section>
    </PublicPage>
  );
}
