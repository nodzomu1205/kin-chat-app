import { afterEach, describe, expect, it, vi } from "vitest";
import { openGoogleDrivePicker } from "@/hooks/googleDrivePickerRuntime";

describe("openGoogleDrivePicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubPickerWindow() {
    const addedViews: unknown[] = [];
    const setVisible = vi.fn();
    let callback: ((data: unknown) => void | Promise<void>) | undefined;

    class DocsView {
      viewId: string;
      parent = "";
      mimeTypes = "";
      includeFolders = false;
      selectFolderEnabled = false;

      constructor(viewId: string) {
        this.viewId = viewId;
      }

      setIncludeFolders(value: boolean) {
        this.includeFolders = value;
        return this;
      }

      setSelectFolderEnabled(value: boolean) {
        this.selectFolderEnabled = value;
        return this;
      }

      setMimeTypes(value: string) {
        this.mimeTypes = value;
        return this;
      }

      setParent(value: string) {
        this.parent = value;
        return this;
      }
    }

    class PickerBuilder {
      appId = "";
      developerKey = "";
      oauthToken = "";

      setAppId(value: string) {
        this.appId = value;
        return this;
      }

      setDeveloperKey(value: string) {
        this.developerKey = value;
        return this;
      }

      setOAuthToken(value: string) {
        this.oauthToken = value;
        return this;
      }

      setCallback(value: (data: unknown) => void | Promise<void>) {
        callback = value;
        return this;
      }

      addView(value: unknown) {
        addedViews.push(value);
        return this;
      }

      build() {
        return { setVisible };
      }
    }

    vi.stubGlobal("window", {
      google: {
        picker: {
          Action: { PICKED: "picked" },
          DocsView,
          PickerBuilder,
          ViewId: {
            DOCS: "docs",
            FOLDERS: "folders",
          },
        },
      },
    });

    return {
      addedViews,
      setVisible,
      pick: async (docs: unknown[]) => {
        await callback?.({ action: "picked", docs });
      },
    };
  }

  it("opens a file picker rooted at the configured Drive folder", async () => {
    const picker = stubPickerWindow();
    const onPickedDocs = vi.fn();

    const opened = await openGoogleDrivePicker({
      mode: "file_import",
      folderId: "folder-1",
      accessToken: "token-1",
      onPickedDocs,
    });

    expect(opened).toBe(true);
    expect(picker.setVisible).toHaveBeenCalledWith(true);
    expect(picker.addedViews).toHaveLength(1);
    expect(picker.addedViews[0]).toMatchObject({
      viewId: "docs",
      parent: "folder-1",
      includeFolders: true,
      selectFolderEnabled: true,
    });

    await picker.pick([{ id: "file-1", name: "notes.txt" }]);
    expect(onPickedDocs).toHaveBeenCalledWith([
      { id: "file-1", name: "notes.txt" },
    ]);
  });

  it("uses the folder-only view for folder modes", async () => {
    const picker = stubPickerWindow();

    await openGoogleDrivePicker({
      mode: "folder_import",
      accessToken: "token-2",
      onPickedDocs: vi.fn(),
    });

    expect(picker.addedViews[0]).toMatchObject({
      viewId: "folders",
      mimeTypes: "application/vnd.google-apps.folder",
    });
  });
});
