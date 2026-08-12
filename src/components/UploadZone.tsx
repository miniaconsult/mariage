"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { guessContentType } from "@/lib/uploadTypes";

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  previewUrl?: string;
}

const GUEST_NAME_STORAGE_KEY = "wedding-guest-name";
const MAX_CONCURRENT_UPLOADS = 2;

function readStoredGuestName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GUEST_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function uploadFile(
  item: UploadItem,
  guestName: string,
  maxFileSizeMb: number,
  onProgress: (progress: number) => void,
): Promise<void> {
  const contentType = guessContentType(item.file);
  if (!contentType) {
    throw new Error("Type de fichier non pris en charge.");
  }
  if (item.file.size > maxFileSizeMb * 1024 * 1024) {
    throw new Error(`Le fichier dépasse la taille maximale de ${maxFileSizeMb} Mo.`);
  }

  const signResponse = await fetch("/api/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: item.file.name,
      contentType,
      guestName: guestName || undefined,
    }),
  });

  if (!signResponse.ok) {
    const body = await signResponse.json().catch(() => null);
    throw new Error(body?.error || "Impossible de préparer l'envoi.");
  }

  const { uploadUrl, headers } = (await signResponse.json()) as {
    uploadUrl: string;
    headers: Record<string, string>;
  };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("L'envoi a échoué. Merci de réessayer."));
      }
    };

    xhr.onerror = () => reject(new Error("L'envoi a échoué. Vérifiez votre connexion."));

    xhr.send(item.file);
  });
}

export function UploadZone({ maxFileSizeMb }: { maxFileSizeMb: number }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [guestName, setGuestName] = useState(readStoredGuestName);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeUploads = useRef(0);
  const queue = useRef<string[]>([]);
  const filesById = useRef<Map<string, File>>(new Map());
  const guestNameRef = useRef(guestName);
  const processQueueRef = useRef<() => void>(() => {});

  const persistGuestName = useCallback((value: string) => {
    setGuestName(value);
    guestNameRef.current = value;
    try {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, value);
    } catch {
      // stockage local indisponible, on continue sans persistance
    }
  }, []);

  const processQueue = useCallback(() => {
    while (activeUploads.current < MAX_CONCURRENT_UPLOADS && queue.current.length > 0) {
      const id = queue.current.shift();
      const file = id ? filesById.current.get(id) : undefined;
      if (!id || !file) continue;

      activeUploads.current += 1;
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "uploading" } : it)),
      );

      uploadFile(
        { id, file, status: "uploading", progress: 0 },
        guestNameRef.current,
        maxFileSizeMb,
        (progress) => {
          setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress } : it)));
        },
      )
        .then(() => {
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, status: "done", progress: 100 } : it)),
          );
        })
        .catch((error: Error) => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === id ? { ...it, status: "error", error: error.message } : it,
            ),
          );
        })
        .finally(() => {
          activeUploads.current -= 1;
          filesById.current.delete(id);
          processQueueRef.current();
        });
    }
  }, [maxFileSizeMb]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "pending",
        progress: 0,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));

      newItems.forEach((item) => filesById.current.set(item.id, item.file));
      setItems((prev) => [...prev, ...newItems]);
      queue.current.push(...newItems.map((it) => it.id));
      processQueue();
    },
    [processQueue],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files?.length) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const doneCount = items.filter((it) => it.status === "done").length;

  return (
    <div className="w-full">
      <div className="mb-5">
        <label htmlFor="guestName" className="mb-1.5 block font-sans text-sm text-sage-700">
          Votre prénom <span className="text-sage-500">(facultatif)</span>
        </label>
        <input
          id="guestName"
          type="text"
          value={guestName}
          onChange={(event) => persistGuestName(event.target.value)}
          placeholder="ex : Nala"
          className="w-full rounded-full border border-sage-200 bg-white/70 px-4 py-2.5 font-sans text-sage-900 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
        />
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          isDragging
            ? "border-sage-500 bg-sage-100/60"
            : "border-sage-300 bg-white/50 hover:border-sage-400 hover:bg-sage-50"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-10 w-10 text-sage-500"
          aria-hidden="true"
        >
          <path
            d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="font-display text-lg text-sage-800">
          Déposez vos photos et vidéos ici
        </p>
        <p className="font-sans text-sm text-sage-500">
          ou cliquez pour parcourir votre appareil
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-white/70 p-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sage-100">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sage-400">
                    🎞️
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm text-sage-800">{item.file.name}</p>
                <p className="font-sans text-xs text-sage-400">{formatSize(item.file.size)}</p>

                {item.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sage-100">
                    <div
                      className="h-full rounded-full bg-sage-500 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {item.status === "error" && (
                  <p className="mt-1 font-sans text-xs text-red-600">{item.error}</p>
                )}
              </div>

              <div className="shrink-0 font-sans text-xs">
                {item.status === "pending" && <span className="text-sage-400">En attente…</span>}
                {item.status === "uploading" && (
                  <span className="text-sage-600">{item.progress}%</span>
                )}
                {item.status === "done" && <span className="text-sage-600">✓ Envoyée</span>}
                {item.status === "error" && <span className="text-red-600">Échec</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <p className="mt-4 text-center font-display text-lg text-sage-700">
          {doneCount === 1
            ? "1 photo envoyée, merci !"
            : `${doneCount} photos envoyées, merci !`}
        </p>
      )}
    </div>
  );
}
