import { describe, expect, it } from "vitest";
import {
  buildDriveFolderIndexMessage,
  buildDriveUploadDestinationPrompt,
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
});
