import { Storage } from "@google-cloud/storage";

let storageClient: Storage | null = null;

function loadServiceAccountKey() {
  const base64Key = process.env.GCS_SERVICE_ACCOUNT_KEY_BASE64;
  if (!base64Key) {
    throw new Error(
      "Variable d'environnement manquante : GCS_SERVICE_ACCOUNT_KEY_BASE64",
    );
  }

  try {
    const json = Buffer.from(base64Key, "base64").toString("utf-8");
    return JSON.parse(json) as { project_id: string; client_email: string; private_key: string };
  } catch {
    throw new Error(
      "GCS_SERVICE_ACCOUNT_KEY_BASE64 doit contenir la clé de compte de service Google Cloud encodée en base64.",
    );
  }
}

export function getStorage(): Storage {
  if (!storageClient) {
    const key = loadServiceAccountKey();
    storageClient = new Storage({
      projectId: key.project_id,
      credentials: {
        client_email: key.client_email,
        private_key: key.private_key,
      },
    });
  }
  return storageClient;
}

export function getBucketName(): string {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Variable d'environnement manquante : GCS_BUCKET_NAME");
  }
  return bucketName;
}
