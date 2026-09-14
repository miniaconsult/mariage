import { NextResponse } from "next/server";
import sharp from "sharp";
import { getBucketName, getStorage } from "@/lib/gcs";
import type { File } from "@google-cloud/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_EXPIRY_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;
const THUMBNAIL_MAX_SIZE = 480;
const THUMBNAIL_QUALITY = 70;

export interface GalleryItem {
  name: string;
  url: string;
  thumbnailUrl: string;
  contentType: string;
  guestName: string | null;
  uploadedAt: string | null;
}

function thumbnailPathFor(originalName: string): string {
  return `thumbnails/${originalName.replace(/\//g, "_")}.webp`;
}

async function getOrCreateThumbnailUrl(
  file: File,
  bucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>,
): Promise<string> {
  const thumbFile = bucket.file(thumbnailPathFor(file.name));

  const [exists] = await thumbFile.exists();

  if (!exists) {
    const [original] = await file.download();
    const resized = await sharp(original)
      .rotate()
      .resize(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE, { fit: "cover" })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    await thumbFile.save(resized, { contentType: "image/webp" });
  }

  const [url] = await thumbFile.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + URL_EXPIRY_MS,
  });

  return url;
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
        const metadata = file.metadata;
        const contentType = metadata.contentType ?? "";
        const customMetadata = (metadata.metadata ?? {}) as Record<string, string>;
        const isImage = contentType.startsWith("image/");

        const [url] = await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + URL_EXPIRY_MS,
        });

        let thumbnailUrl = url;
        if (isImage) {
          try {
            thumbnailUrl = await getOrCreateThumbnailUrl(file, bucket);
          } catch (thumbError) {
            console.error(`Miniature impossible pour ${file.name} :`, thumbError);
          }
        }

        return {
          name: file.name,
          url,
          thumbnailUrl,
          contentType,
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
