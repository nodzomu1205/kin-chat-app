"use client";

import { useEffect, useState } from "react";
import type {
  FileReadPolicy,
  UploadKind,
  ImageDetail,
  IngestMode,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  COMPACT_CHAR_LIMIT_KEY,
  DRIVE_IMPORT_AUTO_SUMMARY_KEY,
  FILE_READ_POLICY_KEY,
  IMAGE_DETAIL_KEY,
  INGEST_MODE_KEY,
  SIMPLE_IMAGE_CHAR_LIMIT_KEY,
  UPLOAD_KIND_KEY,
  loadPersistedGptOptionsState,
} from "@/lib/app/persistedGptOptionsState";

export function usePersistedGptOptions() {
  const [initialState] = useState(() =>
    loadPersistedGptOptionsState(
      typeof window === "undefined" ? null : window.localStorage
    )
  );
  const responseMode: ResponseMode = "strict";
  const setResponseMode = () => {};
  const [uploadKind, setUploadKind] = useState<UploadKind>(
    initialState.uploadKind
  );
  const [ingestMode, setIngestMode] = useState<IngestMode>(
    initialState.ingestMode
  );
  const [imageDetail, setImageDetail] = useState<ImageDetail>(
    initialState.imageDetail
  );
  const [compactCharLimit, setCompactCharLimit] = useState(
    initialState.compactCharLimit
  );
  const [simpleImageCharLimit, setSimpleImageCharLimit] = useState(
    initialState.simpleImageCharLimit
  );
  const [fileReadPolicy, setFileReadPolicy] =
    useState<FileReadPolicy>(initialState.fileReadPolicy);
  const [driveImportAutoSummary, setDriveImportAutoSummary] = useState(
    initialState.driveImportAutoSummary
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UPLOAD_KIND_KEY, uploadKind);
  }, [uploadKind]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INGEST_MODE_KEY, ingestMode);
  }, [ingestMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(IMAGE_DETAIL_KEY, imageDetail);
  }, [imageDetail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COMPACT_CHAR_LIMIT_KEY, String(compactCharLimit));
  }, [compactCharLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIMPLE_IMAGE_CHAR_LIMIT_KEY,
      String(simpleImageCharLimit)
    );
  }, [simpleImageCharLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FILE_READ_POLICY_KEY, fileReadPolicy);
  }, [fileReadPolicy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      DRIVE_IMPORT_AUTO_SUMMARY_KEY,
      String(driveImportAutoSummary)
    );
  }, [driveImportAutoSummary]);

  return {
    responseMode,
    setResponseMode,
    uploadKind,
    setUploadKind,
    ingestMode,
    setIngestMode,
    imageDetail,
    setImageDetail,
    compactCharLimit,
    setCompactCharLimit,
    simpleImageCharLimit,
    setSimpleImageCharLimit,
    fileReadPolicy,
    setFileReadPolicy,
    driveImportAutoSummary,
    setDriveImportAutoSummary,
  };
}
