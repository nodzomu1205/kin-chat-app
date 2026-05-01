import { describe, expect, it } from "vitest";
import {
  buildDriveImportStoredText,
  buildDriveImportSummary,
  buildDriveImportFailedMessage,
  buildDriveImportSavedInfoMessage,
  buildDriveFolderIndexMessage,
  buildDriveUploadCancelledMessage,
  buildDriveUploadCompletedMessage,
  buildDriveUploadDestinationPrompt,
  buildDriveUploadInvalidSelectionMessage,
  buildDriveUiMessage,
  canImportDriveMimeType,
  resolveDrivePickedImportAction,
  resolveDriveUploadDestinationIndex,
  type DriveFolderNode,
} from "@/hooks/googleDrivePickerBuilders";

describe("googleDrivePickerBuilders", () => {
  it("builds a richer folder index message with counts and metadata", () => {
    const entries: DriveFolderNode[] = [
      {
        id: "folder-1",
        name: "Drafts",
        mimeType: "application/vnd.google-apps.folder",
        path: "Project/Drafts",
        modifiedTime: "2026-04-18T10:15:00.000Z",
      },
      {
        id: "file-1",
        name: "notes.txt",
        mimeType: "text/plain",
        path: "Project/Drafts/notes.txt",
        modifiedTime: "2026-04-18T11:45:00.000Z",
        sizeBytes: 1536,
      },
    ];

    const message = buildDriveFolderIndexMessage({
      folderName: "Project",
      entries,
    });

    expect(message).toContain("Google Drive folder index: Project");
    expect(message).toContain("Items: 2 (folders 1, files 1, importable 1)");
    expect(message).toContain("[Folder] Project/Drafts");
    expect(message).toContain("[File] Project/Drafts/notes.txt");
    expect(message).toContain("2026-04-18");
    expect(message).toContain("1.5 KB");
    expect(message).toContain("importable");
  });

  it("builds the upload destination prompt for child-folder selection", () => {
    expect(
      buildDriveUploadDestinationPrompt({
        childFolders: [
          { name: "Drafts" },
          { name: "Published", modifiedTime: "2026-04-18T10:15:00.000Z" },
        ],
      })
    ).toContain("2 child folders");
  });

  it("resolves the chosen child-folder index from prompt input", () => {
    expect(
      resolveDriveUploadDestinationIndex({
        input: "2",
        childFolderCount: 3,
      })
    ).toBe(1);
    expect(
      resolveDriveUploadDestinationIndex({
        input: "0",
        childFolderCount: 3,
      })
    ).toBe(-1);
    expect(
      resolveDriveUploadDestinationIndex({
        input: "9",
        childFolderCount: 3,
      })
    ).toBeNull();
  });

  it("keeps Drive importable MIME type rules in the shared builder", () => {
    expect(canImportDriveMimeType("text/plain")).toBe(true);
    expect(canImportDriveMimeType("application/pdf")).toBe(true);
    expect(canImportDriveMimeType("application/vnd.google-apps.document")).toBe(true);
    expect(canImportDriveMimeType("image/png")).toBe(true);
  });

  it("resolves picked Drive folder actions from picker mode", () => {
    expect(
      resolveDrivePickedImportAction({
        doc: {
          id: "folder-1",
          mimeType: "application/vnd.google-apps.folder",
        },
        mode: "folder_index",
      })
    ).toEqual({
      kind: "folder",
      folder: {
        id: "folder-1",
        name: "Google Drive Folder",
      },
      mode: "index",
    });

    expect(
      resolveDrivePickedImportAction({
        doc: {
          id: "folder-2",
          name: "Project",
          mimeType: "application/vnd.google-apps.folder",
        },
        mode: "folder_import",
      })
    ).toEqual({
      kind: "folder",
      folder: {
        id: "folder-2",
        name: "Project",
      },
      mode: "import",
    });
  });

  it("resolves picked Drive file actions and skips unsupported files", () => {
    expect(
      resolveDrivePickedImportAction({
        doc: {
          id: "file-1",
          name: "notes.txt",
          mimeType: "text/plain",
        },
        mode: "file_import",
      })
    ).toEqual({
      kind: "file",
      file: {
        id: "file-1",
        name: "notes.txt",
        mimeType: "text/plain",
      },
    });

    expect(
      resolveDrivePickedImportAction({
        doc: {
          id: "file-2",
          name: "image.png",
          mimeType: "image/png",
        },
        mode: "file_import",
      })
    ).toEqual({
      kind: "file",
      file: {
        id: "file-2",
        name: "image.png",
        mimeType: "image/png",
      },
    });
  });

  it("builds Drive import stored text and prefers compact summaries", () => {
    expect(
      buildDriveImportStoredText({
        selectedLines: ["alpha", "beta"],
        rawText: "raw fallback",
      })
    ).toBe("alpha\nbeta");

    expect(
      buildDriveImportSummary({
        result: {
          structuredSummary: ["long fallback summary"],
          kinCompact: ["short compact summary"],
        },
        fallbackText: "A much longer imported document body.",
        fallbackTitle: "Drive doc",
      })
    ).toBe("short compact summary");
  });

  it("builds Drive UI feedback messages in one shared place", () => {
    expect(
      buildDriveImportFailedMessage({
        errorMessage: "Failed to import notes.txt.",
      })
    ).toBe("Google Drive import failed: Failed to import notes.txt.");

    expect(
      buildDriveImportSavedInfoMessage({
        title: "Project notes",
        storedDocumentCharCount: 12345,
      })
    ).toBe(
      "Google Driveファイルをライブラリに保存しました: Project notes\n抽出文字数: 12,345 chars"
    );

    expect(buildDriveUploadCancelledMessage()).toBe(
      "Google Drive upload cancelled."
    );
    expect(buildDriveUploadInvalidSelectionMessage()).toBe(
      "Google Drive upload cancelled: invalid child-folder selection."
    );
    expect(
      buildDriveUploadCompletedMessage({
        fileName: "export.txt",
        destinationFolderName: "Drafts",
      })
    ).toBe("Google Drive uploaded: export.txt -> Drafts");
  });

  it("builds Drive GPT status messages with a consistent task-info shape", () => {
    expect(
      buildDriveUiMessage({
        id: "drive-ui-1",
        text: "Google Drive import failed: boom",
        sourceType: "file_ingest",
      })
    ).toEqual({
      id: "drive-ui-1",
      role: "gpt",
      text: "Google Drive import failed: boom",
      meta: {
        kind: "task_info",
        sourceType: "file_ingest",
      },
    });

    expect(
      buildDriveUiMessage({
        id: "drive-ui-2",
        text: "Google Drive upload cancelled.",
      }).meta?.sourceType
    ).toBe("manual");
  });
});
