"use client";

import React from "react";
import ReceivedDocsDrawer from "@/components/panels/gpt/ReceivedDocsDrawer";
import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";

type Props = Pick<
  GptPanelProps,
  | "multipartAssemblies"
  | "referenceLibraryItems"
  | "libraryReferenceCount"
  | "selectedTaskLibraryItemId"
  | "onSelectTaskLibraryItem"
  | "onMoveLibraryItem"
  | "onChangeLibraryItemMode"
  | "onStartAskAiModeSearch"
  | "onDownloadMultipartAssembly"
  | "onDeleteMultipartAssembly"
  | "onDownloadStoredDocument"
  | "onDeleteStoredDocument"
  | "onDeleteSearchHistoryItem"
  | "onSaveStoredDocument"
>;

export default function SearchRawDrawer(props: Props) {
  return <ReceivedDocsDrawer {...props} initialTab="search" />;
}
