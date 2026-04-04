"use client";

import { useRef, useState } from "react";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { useGptMemory } from "@/hooks/useGptMemory";
import { createEmptyTaskDraft } from "@/types/task";
import type { Message } from "@/types/chat";

const MOBILE_BREAKPOINT = 1180;

export default function TestTaskPage() {
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [gptInput, setGptInput] = useState("");

  const isMobile = useResponsive(MOBILE_BREAKPOINT);
  const gptBottomRef = useRef<HTMLDivElement>(null);

  useAutoScroll(gptBottomRef, [gptMessages]);

  const {
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
  } = usePersistedGptOptions();

  const { tokenStats } = useTokenTracking();

  const {
    gptState,
    resetGptForCurrentKin,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(null);

  const noopAsync = async () => {};
  const noop = () => {};

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          padding: isMobile ? 0 : 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <GptPanel
            currentKin={null}
            currentKinLabel={null}
            kinStatus="idle"
            gptState={gptState}
            gptMessages={gptMessages}
            gptInput={gptInput}
            setGptInput={setGptInput}
            sendToGpt={noopAsync}
            runPrepTaskFromInput={noopAsync}
            runDeepenTaskFromLast={noopAsync}
            runUpdateTaskFromInput={noopAsync}
            runUpdateTaskFromLastGptMessage={noopAsync}
            runAttachSearchResultToTask={noopAsync}
            resetGptForCurrentKin={resetGptForCurrentKin}
            sendLastGptToKinDraft={noop}
            sendTaskToKinDraft={noopAsync}
            injectFileToKinDraft={noopAsync}
            canInjectFile={false}
            loading={false}
            ingestLoading={false}
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
            onSwitchPanel={noop}
            isMobile={isMobile}
            currentTaskDraft={createEmptyTaskDraft()}
          />
        </div>
      </div>
    </div>
  );
}