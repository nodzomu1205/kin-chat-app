"use client";

import { useEffect, useState } from "react";
import type {
  FileUploadKind,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";

const RESPONSE_MODE_KEY = "gpt_response_mode";
const UPLOAD_KIND_KEY = "gpt_upload_kind";
const INGEST_MODE_KEY = "gpt_ingest_mode";
const IMAGE_DETAIL_KEY = "gpt_image_detail";
const POST_INGEST_ACTION_KEY = "gpt_post_ingest_action";

export function usePersistedGptOptions() {
  const [responseMode, setResponseMode] = useState<ResponseMode>("strict");
  const [uploadKind, setUploadKind] = useState<FileUploadKind>("text");
  const [ingestMode, setIngestMode] = useState<IngestMode>("compact");
  const [imageDetail, setImageDetail] = useState<ImageDetail>("basic");
  const [postIngestAction, setPostIngestAction] =
    useState<PostIngestAction>("inject_only");

  useEffect(() => {
    const savedMode = localStorage.getItem(RESPONSE_MODE_KEY);
    if (savedMode === "creative") {
      setResponseMode("creative");
    }

    const savedUploadKind = localStorage.getItem(UPLOAD_KIND_KEY);
    if (savedUploadKind === "visual") {
      setUploadKind("visual");
    }

    const savedIngestMode = localStorage.getItem(INGEST_MODE_KEY);
    if (savedIngestMode === "full") {
      setIngestMode("full");
    }

    const savedImageDetail = localStorage.getItem(IMAGE_DETAIL_KEY);
    if (
      savedImageDetail === "basic" ||
      savedImageDetail === "detailed" ||
      savedImageDetail === "max"
    ) {
      setImageDetail(savedImageDetail);
    }

    const savedPostIngestAction = localStorage.getItem(POST_INGEST_ACTION_KEY);
    if (
      savedPostIngestAction === "inject_only" ||
      savedPostIngestAction === "inject_and_prep" ||
      savedPostIngestAction === "inject_prep_deepen"
    ) {
      setPostIngestAction(savedPostIngestAction);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RESPONSE_MODE_KEY, responseMode);
  }, [responseMode]);

  useEffect(() => {
    localStorage.setItem(UPLOAD_KIND_KEY, uploadKind);
  }, [uploadKind]);

  useEffect(() => {
    localStorage.setItem(INGEST_MODE_KEY, ingestMode);
  }, [ingestMode]);

  useEffect(() => {
    localStorage.setItem(IMAGE_DETAIL_KEY, imageDetail);
  }, [imageDetail]);

  useEffect(() => {
    localStorage.setItem(POST_INGEST_ACTION_KEY, postIngestAction);
  }, [postIngestAction]);

  return {
    responseMode,
    setResponseMode,
    uploadKind,
    setUploadKind,
    ingestMode,
    setIngestMode,
    imageDetail,
    setImageDetail,
    postIngestAction,
    setPostIngestAction,
  };
}
