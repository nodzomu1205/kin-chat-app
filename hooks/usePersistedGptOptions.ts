"use client";

import { useEffect, useState } from "react";
import type {
  FileReadPolicy,
  UploadKind,
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
const FILE_READ_POLICY_KEY = "gpt_file_read_policy";
const COMPACT_CHAR_LIMIT_KEY = "gpt_compact_char_limit";
const SIMPLE_IMAGE_CHAR_LIMIT_KEY = "gpt_simple_image_char_limit";

export function usePersistedGptOptions() {
  const [responseMode, setResponseMode] = useState<ResponseMode>("creative");
  const [uploadKind, setUploadKind] = useState<UploadKind>("text");
  const [ingestMode, setIngestMode] = useState<IngestMode>("detailed");
  const [imageDetail, setImageDetail] = useState<ImageDetail>("detailed");
  const [compactCharLimit, setCompactCharLimit] = useState(500);
  const [simpleImageCharLimit, setSimpleImageCharLimit] = useState(500);
  const [postIngestAction, setPostIngestAction] =
    useState<PostIngestAction>("inject_only");
  const [fileReadPolicy, setFileReadPolicy] =
    useState<FileReadPolicy>("text_and_layout");

  useEffect(() => {
    const savedMode = localStorage.getItem(RESPONSE_MODE_KEY);
    if (savedMode === "strict" || savedMode === "creative") {
      setResponseMode(savedMode);
    } else if (savedMode === "balanced") {
      setResponseMode("strict");
    }

    const savedUploadKind = localStorage.getItem(UPLOAD_KIND_KEY);
    if (
      savedUploadKind === "auto" ||
      savedUploadKind === "text" ||
      savedUploadKind === "image" ||
      savedUploadKind === "pdf" ||
      savedUploadKind === "mixed"
    ) {
      setUploadKind(savedUploadKind);
    }

    const savedIngestMode = localStorage.getItem(INGEST_MODE_KEY);
    if (savedIngestMode === "compact" || savedIngestMode === "detailed" || savedIngestMode === "max") {
      setIngestMode(savedIngestMode);
    } else if (savedIngestMode === "strict") {
      setIngestMode("compact");
    } else if (savedIngestMode === "creative" || savedIngestMode === "full") {
      setIngestMode("detailed");
    }

    const savedImageDetail = localStorage.getItem(IMAGE_DETAIL_KEY);
    if (savedImageDetail === "simple" || savedImageDetail === "detailed" || savedImageDetail === "max") {
      setImageDetail(savedImageDetail);
    } else if (savedImageDetail === "low") {
      setImageDetail("simple");
    } else if (savedImageDetail === "auto") {
      setImageDetail("detailed");
    } else if (savedImageDetail === "high") {
      setImageDetail("max");
    }

    const savedPostIngestAction = localStorage.getItem(POST_INGEST_ACTION_KEY);
    if (
      savedPostIngestAction === "inject_only" ||
      savedPostIngestAction === "inject_and_prep" ||
      savedPostIngestAction === "inject_prep_deepen" ||
      savedPostIngestAction === "attach_to_current_task"
    ) {
      setPostIngestAction(savedPostIngestAction);
    }

    const savedFileReadPolicy = localStorage.getItem(FILE_READ_POLICY_KEY);
    if (
      savedFileReadPolicy === "text_first" ||
      savedFileReadPolicy === "visual_first" ||
      savedFileReadPolicy === "text_and_layout"
    ) {
      setFileReadPolicy(savedFileReadPolicy);
    }

    const savedCompactCharLimit = Number(localStorage.getItem(COMPACT_CHAR_LIMIT_KEY));
    if (Number.isFinite(savedCompactCharLimit) && savedCompactCharLimit >= 100) {
      setCompactCharLimit(Math.floor(savedCompactCharLimit));
    }

    const savedSimpleImageCharLimit = Number(localStorage.getItem(SIMPLE_IMAGE_CHAR_LIMIT_KEY));
    if (Number.isFinite(savedSimpleImageCharLimit) && savedSimpleImageCharLimit >= 100) {
      setSimpleImageCharLimit(Math.floor(savedSimpleImageCharLimit));
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
    localStorage.setItem(COMPACT_CHAR_LIMIT_KEY, String(compactCharLimit));
  }, [compactCharLimit]);

  useEffect(() => {
    localStorage.setItem(SIMPLE_IMAGE_CHAR_LIMIT_KEY, String(simpleImageCharLimit));
  }, [simpleImageCharLimit]);

  useEffect(() => {
    localStorage.setItem(POST_INGEST_ACTION_KEY, postIngestAction);
  }, [postIngestAction]);

  useEffect(() => {
    localStorage.setItem(FILE_READ_POLICY_KEY, fileReadPolicy);
  }, [fileReadPolicy]);

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
    postIngestAction,
    setPostIngestAction,
    fileReadPolicy,
    setFileReadPolicy,
  };
}
