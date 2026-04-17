import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_GOOGLE_DRIVE_FOLDER_LINK,
  resolveGoogleDriveFolderId,
  sanitizeGoogleDriveFolderLink,
} from "@/lib/app/googleDriveLink";

const GOOGLE_DRIVE_FOLDER_LINK_KEY = "google_drive_library_folder_link";

function loadInitialGoogleDriveFolderLink() {
  if (typeof window === "undefined") return DEFAULT_GOOGLE_DRIVE_FOLDER_LINK;
  const saved = window.localStorage.getItem(GOOGLE_DRIVE_FOLDER_LINK_KEY);
  return saved?.trim() || DEFAULT_GOOGLE_DRIVE_FOLDER_LINK;
}

export function useGoogleDriveLibrary() {
  const [googleDriveFolderLink, setGoogleDriveFolderLink] = useState(
    loadInitialGoogleDriveFolderLink
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = sanitizeGoogleDriveFolderLink(googleDriveFolderLink);
    if (normalized) {
      window.localStorage.setItem(GOOGLE_DRIVE_FOLDER_LINK_KEY, normalized);
      if (normalized !== googleDriveFolderLink) {
        setGoogleDriveFolderLink(normalized);
      }
      return;
    }
    window.localStorage.removeItem(GOOGLE_DRIVE_FOLDER_LINK_KEY);
  }, [googleDriveFolderLink]);

  const googleDriveFolderId = useMemo(
    () => resolveGoogleDriveFolderId(googleDriveFolderLink),
    [googleDriveFolderLink]
  );

  const openGoogleDriveFolder = () => {
    if (typeof window === "undefined") return false;
    const nextLink = sanitizeGoogleDriveFolderLink(googleDriveFolderLink);
    if (!nextLink) return false;
    window.open(nextLink, "_blank", "noopener,noreferrer");
    return true;
  };

  return {
    googleDriveFolderLink,
    setGoogleDriveFolderLink,
    googleDriveFolderId,
    googleDriveIntegrationMode: "manual_link" as const,
    openGoogleDriveFolder,
  };
}
