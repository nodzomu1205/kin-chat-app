export const DEFAULT_GOOGLE_DRIVE_FOLDER_LINK =
  "https://drive.google.com/drive/folders/1On08mnCWaO3afFsSjVqPivyeXg7QQK0T?usp=drive_link";

const GOOGLE_DRIVE_FOLDER_ID_PATTERNS = [
  /\/drive\/folders\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
];

export function resolveGoogleDriveFolderId(link: string): string {
  const normalized = link.trim();
  if (!normalized) return "";

  for (const pattern of GOOGLE_DRIVE_FOLDER_ID_PATTERNS) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

export function sanitizeGoogleDriveFolderLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return "";
  const folderId = resolveGoogleDriveFolderId(trimmed);
  if (!folderId) return trimmed;
  return `https://drive.google.com/drive/folders/${folderId}`;
}
