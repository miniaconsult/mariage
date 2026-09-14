import { NextResponse } from "next/server";
import { getBucketName, getStorage } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_EXPIRY_MS = 60 * 60 * 1000;

export interface GalleryItem {
  name: string;
  url: string;
  contentType: string;
  guestName: string | null;
  uploadedAt: string | null;
}

export async function GET() {
  try {
    const bucket = getStorage().bucket(getBucketName());
    const [files] = await bucket.getFiles({ prefix: "uploads/" });

    const items: GalleryItem[] = await Promise.all(
      files
        .filter((file) => !file.name.endsWith("/"))
        .map(async (file) => {
          const [url] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + URL_EXPIRY_MS,
          });

          const metadata = file.metadata;
          const customMetadata = (metadata.metadata ?? {}) as Record<string, string>;

          return {
            name: file.name,
            url,
            contentType: metadata.contentType ?? "",
            guestName: customMetadata["guest-name"] ?? null,
            uploadedAt: metadata.timeCreated ?? null,
          };
        }),
    );

    items.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Erreur lors du chargement de la galerie :", error);
    return NextResponse.json(
      { error: "Impossible de charger la galerie pour le moment." },
      { status: 500 },
    );
  }
}
