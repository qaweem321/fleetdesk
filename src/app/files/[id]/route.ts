import { getOptionalUser } from "@/lib/session";
import { canViewFile, findFile, readFileData } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";

// Serves uploaded files. Public ones (car photos, logo) are cached by browsers and CDNs;
// private ones (licenses, inspection photos, signatures) only reach staff and their owner.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = isUuid(id) ? await findFile(id) : null;
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  const viewer = file.visibility === "public" ? null : await getOptionalUser();
  if (!canViewFile(file, viewer)) {
    // Same answer as a missing file, so nobody can probe which ids exist.
    return new Response("Not found", { status: 404 });
  }

  const data = await readFileData(file);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(data.length),
      // A file never changes once uploaded (a new photo gets a new id).
      "Cache-Control":
        file.visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}
