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
  const [kinDirectiveInput, setKinDirectiveInput] = useState("");
  const [fileDirectiveInput, setFileDirectiveInput] = useState("");
  const [taskDraft, setTaskDraft] = useState(createEmptyTaskDraft());

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
    compactCharLimit,
    setCompactCharLimit,
    simpleImageCharLimit,
    setSimpleImageCharLimit,
    postIngestAction,
    setPostIngestAction,
    fileReadPolicy,
    setFileReadPolicy,
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
            sendLatestGptContentToKin={noop}
            sendCurrentTaskContentToKin={noop}
            receiveLastKinResponseToGptInput={noop}
            resetGptForCurrentKin={resetGptForCurrentKin}
            sendLastGptToKinDraft={noop}
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
            compactCharLimit={compactCharLimit}
            simpleImageCharLimit={simpleImageCharLimit}
            postIngestAction={postIngestAction}
            fileReadPolicy={fileReadPolicy}
            onChangeUploadKind={setUploadKind}
            onChangeIngestMode={setIngestMode}
            onChangeImageDetail={setImageDetail}
            onChangeCompactCharLimit={setCompactCharLimit}
            onChangeSimpleImageCharLimit={setSimpleImageCharLimit}
            onChangePostIngestAction={setPostIngestAction}
            onChangeFileReadPolicy={setFileReadPolicy}
            pendingInjectionCurrentPart={0}
            pendingInjectionTotalParts={0}
            onSwitchPanel={noop}
            isMobile={isMobile}
            currentTaskDraft={taskDraft}
            onChangeTaskTitle={(value) =>
              setTaskDraft((prev) => ({
                ...prev,
                title: value,
                taskName: value.trim() || prev.taskName,
              }))
            }
            onChangeTaskUserInstruction={(value) =>
              setTaskDraft((prev) => ({
                ...prev,
                userInstruction: value,
              }))
            }
            onChangeTaskBody={(value) =>
              setTaskDraft((prev) => ({
                ...prev,
                body: value,
                mergedText: value,
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
