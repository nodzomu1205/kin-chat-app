"use client";

import { useEffect, useRef, useState } from "react";
import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory } from "@/hooks/useGptMemory";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { createSession, getSessions } from "@/lib/storage";
import type { MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";
import { generateId } from "@/lib/uuid";
import {
  type TokenStats,
  emptyTokenStats,
  normalizeUsage,
} from "@/lib/tokenStats";
import type {
  FileUploadKind,
  GptInstructionMode,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
} from "@/components/panels/gpt/gptPanelTypes";

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 1180;

export default function ChatApp() {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [kinLoading, setKinLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [pendingKinInjectionBlocks, setPendingKinInjectionBlocks] = useState<
    string[]
  >([]);
  const [pendingKinInjectionIndex, setPendingKinInjectionIndex] = useState(0);
  const [, setCurrentSessionId] = useState<string | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats>(emptyTokenStats());
  const [responseMode, setResponseMode] = useState<ResponseMode>("strict");
  const [uploadKind, setUploadKind] = useState<FileUploadKind>("text");
  const [ingestMode, setIngestMode] = useState<IngestMode>("compact");
  const [imageDetail, setImageDetail] = useState<ImageDetail>("basic");
  const [postIngestAction, setPostIngestAction] =
    useState<PostIngestAction>("inject_only");
  const [activeTab, setActiveTab] = useState<MobileTab>("kin");

  const isMobile = useResponsive(MOBILE_BREAKPOINT);

  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

  const {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    kinList,
    currentKin,
    kinStatus,
    connectKin,
    switchKin,
    disconnectKin,
    removeKin,
    renameKin,
  } = useKinManager();

  const {
    gptState,
    setGptState,
    gptStateRef,
    getProvisionalMemory,
    handleGptMemory,
    resetGptForCurrentKin,
    ensureKinState,
    removeKinState,
    chatRecentLimit,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(currentKin);

  const currentKinProfile = kinList.find((k) => k.id === currentKin) ?? null;
  const currentKinLabel = currentKinProfile?.label ?? null;

  // -------------------------
  // パネル生成
  // -------------------------

  const kinPanel = (
    <KinPanel
      kinIdInput={kinIdInput}
      setKinIdInput={setKinIdInput}
      kinNameInput={kinNameInput}
      setKinNameInput={setKinNameInput}
      connectKin={connectKin}
      disconnectKin={disconnectKin}
      kinStatus={kinStatus}
      currentKin={currentKin}
      currentKinLabel={currentKinLabel}
      kinList={kinList}
      switchKin={switchKin}
      removeKin={removeKin}
      renameKin={renameKin}
      kinMessages={kinMessages}
      kinInput={kinInput}
      setKinInput={setKinInput}
      sendToKin={() => {}}
      sendLastKinToGptDraft={() => {}}
      resetKinMessages={() => setKinMessages([])}
      pendingInjectionCurrentPart={0}
      pendingInjectionTotalParts={0}
      kinBottomRef={kinBottomRef}
      isMobile={isMobile}
      onSwitchPanel={() => setActiveTab("gpt")}
      loading={kinLoading}
    />
  );

  const gptPanel = (
    <GptPanel
      currentKin={currentKin}
      currentKinLabel={currentKinLabel}
      kinStatus={kinStatus}
      gptState={gptState}
      gptMessages={gptMessages}
      gptInput={gptInput}
      setGptInput={setGptInput}
      sendToGpt={() => {}}
      runPrepTaskFromInput={() => {}}
      runDeepenTaskFromLast={() => {}}
      resetGptForCurrentKin={() => {}}
      sendLastGptToKinDraft={() => {}}
      injectFileToKinDraft={async () => {}}
      canInjectFile={!!currentKin}
      loading={gptLoading}
      ingestLoading={ingestLoading}
      gptBottomRef={gptBottomRef}
      memorySettings={memorySettings}
      defaultMemorySettings={defaultMemorySettings}
      onSaveMemorySettings={updateMemorySettings}
      onResetMemorySettings={resetMemorySettings}
      tokenStats={tokenStats}
      responseMode={responseMode}
      onChangeResponseMode={setResponseMode}
      uploadKind={uploadKind}
      ingestMode={ingestMode}
      imageDetail={imageDetail}
      postIngestAction={postIngestAction}
      onChangeUploadKind={setUploadKind}
      onChangeIngestMode={setIngestMode}
      onChangeImageDetail={setImageDetail}
      onChangePostIngestAction={setPostIngestAction}
      pendingInjectionCurrentPart={0}
      pendingInjectionTotalParts={0}
      onSwitchPanel={() => setActiveTab("kin")}
      isMobile={isMobile}
    />
  );

  // -------------------------
  // UI
  // -------------------------

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isMobile ? 0 : 12,
          padding: isMobile ? 0 : 12,
          overflow: "hidden",
        }}
      >
        {isMobile ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: activeTab === "kin" ? "flex" : "none",
                minWidth: 0,
                minHeight: 0,
              }}
            >
              {kinPanel}
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: activeTab === "gpt" ? "flex" : "none",
                minWidth: 0,
                minHeight: 0,
              }}
            >
              {gptPanel}
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
              }}
            >
              {kinPanel}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
              }}
            >
              {gptPanel}
            </div>
          </>
        )}
      </div>
    </div>
  );
}