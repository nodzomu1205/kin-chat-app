export type DriveFolderNode = {
  id: string;
  name: string;
  mimeType: string;
  path: string;
  modifiedTime?: string;
  sizeBytes?: number | null;
};

export async function fetchDriveJson<T>(
  url: string,
  accessToken: string
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Drive request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchDriveFileBlob(args: {
  fileId: string;
  mimeType: string;
  accessToken: string;
}): Promise<Blob> {
  const exportMimeType =
    args.mimeType === "application/vnd.google-apps.document"
      ? "text/plain"
      : args.mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : "";
  const url = exportMimeType
    ? `https://www.googleapis.com/drive/v3/files/${args.fileId}/export?mimeType=${encodeURIComponent(
        exportMimeType
      )}`
    : `https://www.googleapis.com/drive/v3/files/${args.fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Drive file fetch failed: ${response.status}`);
  }
  return response.blob();
}

export async function uploadDriveTextFile(args: {
  accessToken: string;
  folderId: string;
  fileName: string;
  text: string;
}) {
  const metadata = {
    name: args.fileName,
    parents: [args.folderId],
    mimeType: "text/plain",
  };
  const boundary = `drive-upload-${Math.random().toString(36).slice(2, 10)}`;
  const payload =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
    `${args.text}\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: payload,
    }
  );

  if (!response.ok) {
    throw new Error(`Drive upload failed: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };
}

export async function listDriveFolderChildren(args: {
  accessToken: string;
  folderId: string;
  currentPath: string;
}): Promise<DriveFolderNode[]> {
  const files: DriveFolderNode[] = [];
  let pageToken = "";

  do {
    const response = await fetchDriveJson<{
      files?: Array<{
        id: string;
        name: string;
        mimeType: string;
        modifiedTime?: string;
        size?: string;
      }>;
      nextPageToken?: string;
    }>(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `'${args.folderId}' in parents and trashed = false`
      )}&fields=nextPageToken,files(id,name,mimeType,modifiedTime,size)&pageSize=200${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      }`,
      args.accessToken
    );

    for (const file of response.files || []) {
      const path = `${args.currentPath}/${file.name}`;
      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        path,
        modifiedTime: file.modifiedTime,
        sizeBytes:
          typeof file.size === "string" && file.size.trim().length > 0
            ? Number(file.size)
            : null,
      });
      if (file.mimeType === "application/vnd.google-apps.folder") {
        files.push(
          ...(await listDriveFolderChildren({
            accessToken: args.accessToken,
            folderId: file.id,
            currentPath: path,
          }))
        );
      }
    }

    pageToken = response.nextPageToken || "";
  } while (pageToken);

  return files;
}

export async function listDriveChildFolders(args: {
  accessToken: string;
  folderId: string;
}): Promise<DriveFolderNode[]> {
  const response = await fetchDriveJson<{
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      modifiedTime?: string;
    }>;
  }>(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `'${args.folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`
    )}&fields=files(id,name,mimeType,modifiedTime)&pageSize=200`,
    args.accessToken
  );

  return (response.files || []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    path: file.name,
    modifiedTime: file.modifiedTime,
  }));
}
