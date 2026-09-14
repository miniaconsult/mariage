"use client";

import { useEffect, useState } from "react";
import type { GalleryItem } from "@/app/api/gallery/route";

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

export function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetch("/api/gallery", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ items: GalleryItem[] }>;
      })
      .then((data) => {
        if (!ignore) {
          setItems(data.items);
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
    setReloadToken((token) => token + 1);
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <p className="font-sans text-sm text-sage-600">
          {status === "ready" &&
            (items.length === 0
              ? "Aucune photo pour l'instant."
              : items.length === 1
                ? "1 photo"
                : `${items.length} photos`)}
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
                  src={item.url}
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
