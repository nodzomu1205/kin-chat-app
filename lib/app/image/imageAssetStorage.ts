import type { GeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";

const DB_NAME = "kin-generated-image-assets";
const DB_VERSION = 1;
const STORE_NAME = "images";

type StoredImageAsset = {
  imageId: string;
  mimeType: string;
  base64: string;
  prompt?: string;
  originalPrompt?: string;
  revisionInstruction?: string;
  description?: string;
  source?: GeneratedImageLibraryPayload["source"];
  fileName?: string;
  fileSize?: number;
  originalMimeType?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: GeneratedImageLibraryPayload["orientation"];
  alt?: string;
  sourcePromptHash?: string;
  options?: GeneratedImageLibraryPayload["options"];
  usage?: GeneratedImageLibraryPayload["usage"];
  createdAt?: string;
  updatedAt: string;
};

export async function saveGeneratedImageAsset(
  payload: GeneratedImageLibraryPayload
) {
  if (typeof window === "undefined" || !payload.base64) return;
  const base64 = payload.base64;
  const db = await openImageAssetDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put({
      imageId: payload.imageId,
      mimeType: payload.mimeType || "image/png",
      base64,
      prompt: payload.prompt,
      originalPrompt: payload.originalPrompt,
      revisionInstruction: payload.revisionInstruction,
      description: payload.description,
      source: payload.source,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      originalMimeType: payload.originalMimeType,
      widthPx: payload.widthPx,
      heightPx: payload.heightPx,
      aspectRatio: payload.aspectRatio,
      orientation: payload.orientation,
      alt: payload.alt,
      sourcePromptHash: payload.sourcePromptHash,
      options: payload.options,
      usage: payload.usage,
      createdAt: payload.createdAt,
      updatedAt: new Date().toISOString(),
    } satisfies StoredImageAsset);
  });
  db.close();
}

export async function loadGeneratedImageAsset(imageId: string) {
  if (typeof window === "undefined" || !imageId) return null;
  const db = await openImageAssetDb();
  const asset = await new Promise<StoredImageAsset | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(imageId);
    request.onsuccess = () => resolve((request.result as StoredImageAsset) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return asset;
}

export async function loadGeneratedImagePayloadById(
  imageId: string
): Promise<GeneratedImageLibraryPayload | null> {
  const asset = await loadGeneratedImageAsset(imageId);
  if (!asset) return null;
  return {
    version: "0.1-generated-image",
    imageId: asset.imageId,
    mimeType: asset.mimeType || "image/png",
    base64: asset.base64,
    prompt: asset.prompt || "",
    originalPrompt: asset.originalPrompt,
    revisionInstruction: asset.revisionInstruction,
    description: asset.description,
    source: asset.source,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    originalMimeType: asset.originalMimeType,
    widthPx: asset.widthPx,
    heightPx: asset.heightPx,
    aspectRatio: asset.aspectRatio,
    orientation: asset.orientation,
    alt: asset.alt,
    sourcePromptHash: asset.sourcePromptHash,
    options: asset.options || inferStoredImageOptions(asset),
    usage: asset.usage,
    createdAt: asset.createdAt || asset.updatedAt,
  };
}

export async function hydrateGeneratedImagePayload(
  payload: GeneratedImageLibraryPayload
): Promise<GeneratedImageLibraryPayload> {
  if (payload.base64) return payload;
  const asset = await loadGeneratedImageAsset(payload.imageId);
  if (!asset?.base64) return payload;
  return {
    ...payload,
    mimeType: payload.mimeType || asset.mimeType,
    base64: asset.base64,
    prompt: payload.prompt || asset.prompt || "",
    originalPrompt: payload.originalPrompt || asset.originalPrompt,
    revisionInstruction: payload.revisionInstruction || asset.revisionInstruction,
    description: payload.description || asset.description,
    source: payload.source || asset.source,
    fileName: payload.fileName || asset.fileName,
    fileSize: payload.fileSize ?? asset.fileSize,
    originalMimeType: payload.originalMimeType || asset.originalMimeType,
    widthPx: payload.widthPx ?? asset.widthPx,
    heightPx: payload.heightPx ?? asset.heightPx,
    aspectRatio: payload.aspectRatio ?? asset.aspectRatio,
    orientation: payload.orientation || asset.orientation,
    alt: payload.alt || asset.alt,
    sourcePromptHash: payload.sourcePromptHash || asset.sourcePromptHash,
    options: payload.options || asset.options || inferStoredImageOptions(asset),
    usage: payload.usage || asset.usage,
  };
}

function inferStoredImageOptions(
  asset: Pick<StoredImageAsset, "prompt" | "originalPrompt" | "revisionInstruction">
): GeneratedImageLibraryPayload["options"] {
  const text = [
    asset.prompt || "",
    asset.originalPrompt || "",
    asset.revisionInstruction || "",
  ].join("\n");
  const options: NonNullable<GeneratedImageLibraryPayload["options"]> = {
    model: "gpt-image-1",
    size: "auto",
    quality: "auto",
    outputFormat: "png",
  };
  if (/横長|ワイド|landscape|wide|16:9/i.test(text)) {
    options.size = "1536x1024";
  } else if (/縦長|portrait/i.test(text)) {
    options.size = "1024x1536";
  } else if (/正方形|square/i.test(text)) {
    options.size = "1024x1024";
  }
  return options;
}

export async function persistGeneratedImageAssetsFromDocuments(
  documents: Array<{ structuredPayload?: unknown }>
) {
  await Promise.allSettled(
    documents.map(async (document) => {
      const payload = document.structuredPayload;
      if (
        payload &&
        typeof payload === "object" &&
        (payload as { version?: unknown }).version === "0.1-generated-image" &&
        typeof (payload as { imageId?: unknown }).imageId === "string" &&
        typeof (payload as { base64?: unknown }).base64 === "string"
      ) {
        await saveGeneratedImageAsset(payload as GeneratedImageLibraryPayload);
      }
    })
  );
}

function openImageAssetDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "imageId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
