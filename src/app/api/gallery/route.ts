import { NextResponse } from "next/server";
import { getBucketName, getStorage } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_EXPIRY_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export interface GalleryItem {
  name: string;
  url: string;
  contentType: string;
  guestName: string | null;
  uploadedAt: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT),
    );

    const bucket = getStorage().bucket(getBucketName());
    const [files] = await bucket.getFiles({ prefix: "uploads/" });

    const sorted = files
      .filter((file) => !file.name.endsWith("/"))
      .sort((a, b) =>
        (b.metadata.timeCreated ?? "").localeCompare(a.metadata.timeCreated ?? ""),
      );

    const page = sorted.slice(offset, offset + limit);

    const items: GalleryItem[] = await Promise.all(
      page.map(async (file) => {
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

    return NextResponse.json({
      items,
      total: sorted.length,
      hasMore: offset + limit < sorted.length,
    });
  } catch (error) {
    console.error("Erreur lors du chargement de la galerie :", error);
    return NextResponse.json(
      { error: "Impossible de charger la galerie pour le moment." },
      { status: 500 },
    );
  }
}
