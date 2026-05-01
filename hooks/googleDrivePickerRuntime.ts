import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DrivePickerDocument,
  DrivePickerMode,
} from "@/hooks/googleDrivePickerBuilders";

const GOOGLE_OAUTH_CLIENT_ID =
  "593361829346-aq6ofe9uttbovg08hi8s14lqv7gj684o.apps.googleusercontent.com";
const GOOGLE_PICKER_SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";
const GOOGLE_API_KEY = "AIzaSyCQc_DKFE3WxU6SgVSE47X2SQv7nxZvm08";
const GOOGLE_PICKER_APP_ID = "593361829346";

const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";
const GOOGLE_GIS_SCRIPT = "https://accounts.google.com/gsi/client";

export type GooglePickerCallbackData = {
  action?: string;
  docs?: DrivePickerDocument[];
};

type GoogleTokenClient = {
  callback: (response: { access_token?: string; error?: string }) => void;
  requestAccessToken: (options: { prompt: string }) => void;
};

type GooglePickerDocsView = {
  setIncludeFolders: (value: boolean) => GooglePickerDocsView;
  setSelectFolderEnabled: (value: boolean) => GooglePickerDocsView;
  setMimeTypes: (value: string) => GooglePickerDocsView;
  setParent: (value: string) => GooglePickerDocsView;
};

type GooglePickerBuilder = {
  setAppId: (value: string) => GooglePickerBuilder;
  setDeveloperKey: (value: string) => GooglePickerBuilder;
  setOAuthToken: (value: string) => GooglePickerBuilder;
  setCallback: (value: (data: GooglePickerCallbackData) => void | Promise<void>) => GooglePickerBuilder;
  addView: (value: GooglePickerDocsView) => GooglePickerBuilder;
  enableFeature: (value: string) => GooglePickerBuilder;
  build: () => { setVisible: (value: boolean) => void };
};

type GooglePickerNamespace = {
  Action: { PICKED: string };
  DocsView: new (viewId: string) => GooglePickerDocsView;
  Feature?: {
    MULTISELECT_ENABLED?: string;
  };
  PickerBuilder: new () => GooglePickerBuilder;
  ViewId: {
    DOCS: string;
    FOLDERS: string;
  };
};

export type OpenGoogleDrivePickerArgs = {
  mode: DrivePickerMode;
  folderId?: string;
  accessToken: string;
  onPickedDocs: (docs: DrivePickerDocument[]) => void | Promise<void>;
};

type GoogleAccountsNamespace = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: { access_token?: string; error?: string }) => void;
    }) => GoogleTokenClient;
  };
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void;
    };
    google?: {
      accounts?: GoogleAccountsNamespace;
      picker?: GooglePickerNamespace;
    };
  }
}

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const existing = window.document.querySelector(`script[src="${src}"]`);
  if (existing) {
    if ((existing as HTMLScriptElement).dataset.loaded === "true") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = window.document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    window.document.head.appendChild(script);
  });
}

export async function openGoogleDrivePicker({
  mode,
  folderId,
  accessToken,
  onPickedDocs,
}: OpenGoogleDrivePickerArgs) {
  if (typeof window === "undefined") return false;
  const pickerApi = window.google?.picker;
  if (!pickerApi) return false;

  const docsView = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);
  const foldersView = new pickerApi.DocsView(pickerApi.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setMimeTypes("application/vnd.google-apps.folder")
    .setSelectFolderEnabled(true);

  if (folderId) {
    docsView.setParent(folderId);
    foldersView.setParent(folderId);
  }

  const pickerBuilder = new pickerApi.PickerBuilder()
    .setAppId(GOOGLE_PICKER_APP_ID)
    .setDeveloperKey(GOOGLE_API_KEY)
    .setOAuthToken(accessToken)
    .setCallback(async (data: GooglePickerCallbackData) => {
      if (data.action !== pickerApi.Action.PICKED) return;
      await onPickedDocs(data.docs || []);
    });

  if (mode === "file_import" && pickerApi.Feature?.MULTISELECT_ENABLED) {
    pickerBuilder.enableFeature(pickerApi.Feature.MULTISELECT_ENABLED);
  }

  pickerBuilder.addView(mode === "file_import" ? docsView : foldersView);
  pickerBuilder.build().setVisible(true);
  return true;
}

export function useGoogleDrivePickerRuntime() {
  const [pickerReady, setPickerReady] = useState(false);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);
  const accessTokenRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (typeof window === "undefined") return;
      await Promise.all([loadScript(GOOGLE_API_SCRIPT), loadScript(GOOGLE_GIS_SCRIPT)]);
      if (!window.gapi) return;
      const { gapi } = window;
      await new Promise<void>((resolve) => {
        gapi.load("picker", resolve);
      });
      if (!window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GOOGLE_PICKER_SCOPE,
        callback: () => {},
      });
      if (!cancelled) setPickerReady(true);
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureAccessToken = useCallback(async () => {
    if (accessTokenRef.current) return accessTokenRef.current;
    const tokenClient = tokenClientRef.current;
    if (!tokenClient) {
      throw new Error("Google Picker is not ready.");
    }

    return await new Promise<string>((resolve, reject) => {
      tokenClient.callback = (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "Missing Google access token."));
          return;
        }
        accessTokenRef.current = response.access_token;
        resolve(response.access_token);
      };
      tokenClient.requestAccessToken({ prompt: "consent" });
    });
  }, []);

  return {
    pickerReady,
    ensureAccessToken,
  };
}
