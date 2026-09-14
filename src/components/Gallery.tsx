"use client";

import { useEffect, useState } from "react";
import type { GalleryItem } from "@/app/api/gallery/route";

const BATCH_SIZE = 24;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchPage(offset: number): Promise<{
  items: GalleryItem[];
  total: number;
  hasMore: boolean;
}> {
  const response = await fetch(`/api/gallery?offset=${offset}&limit=${BATCH_SIZE}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error();
  return response.json();
}

export function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetchPage(0)
      .then((data) => {
        if (!ignore) {
          setItems(data.items);
          setTotal(data.total);
          setHasMore(data.hasMore);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!ignore) setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [reloadToken]);

  const refresh = () => {
    setStatus("loading");
    setItems([]);
    setReloadToken((token) => token + 1);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(items.length);
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      // on laisse le bouton "Charger plus" pour réessayer
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <p className="font-sans text-sm text-sage-600">
          {status === "ready" &&
            (total === 0
              ? "Aucune photo pour l'instant."
              : `${items.length} sur ${total} photo${total > 1 ? "s" : ""}`)}
        </p>
        <button
          onClick={refresh}
          className="rounded-full border border-sage-300 px-4 py-1.5 font-sans text-sm text-sage-700 hover:bg-sage-100"
        >
          Actualiser
        </button>
      </div>

      {status === "loading" && (
        <p className="py-16 text-center font-sans text-sage-500">Chargement…</p>
      )}

      {status === "error" && (
        <p className="py-16 text-center font-sans text-red-600">
          Impossible de charger la galerie. Réessayez dans un instant.
        </p>
      )}

      {status === "ready" && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.name}
                onClick={() => setSelected(item)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-sage-100"
              >
                {item.contentType.startsWith("video/") ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                {item.contentType.startsWith("video/") && (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl text-white drop-shadow">
                    ▶
                  </span>
                )}
                {item.guestName && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-2 py-0.5 font-sans text-[10px] text-white">
                    {item.guestName}
                  </span>
                )}
              </button>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-sage-300 px-6 py-2 font-sans text-sm text-sage-700 hover:bg-sage-100 disabled:opacity-50"
              >
                {loadingMore ? "Chargement…" : "Charger plus"}
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute right-4 top-4 font-sans text-3xl text-white/80 hover:text-white"
            onClick={() => setSelected(null)}
            aria-label="Fermer"
          >
            ×
          </button>

          {selected.contentType.startsWith("video/") ? (
            <video
              src={selected.url}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.url}
              alt=""
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 font-sans text-xs text-white">
            {[selected.guestName, formatDate(selected.uploadedAt)].filter(Boolean).join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}
