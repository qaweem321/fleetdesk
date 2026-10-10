import { runDailyJob } from "@/lib/notifications/daily";
import { getSettings } from "@/lib/settings";

// The daily job: reminder emails, the staff summary and cleaning up unused uploads. Call it
// once a day with the header "Authorization: Bearer <CRON_SECRET>". On Vercel, vercel.json
// schedules it and sends the header for you; elsewhere, use any scheduler (cron, a GitHub
// Action...), for example: curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/daily
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  if (!settings) {
    return Response.json({ error: "Setup isn't finished" }, { status: 409 });
  }
  return Response.json(await runDailyJob(settings));
}
