"use client";

import { useRef, useState } from "react";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { useGptMemory } from "@/hooks/useGptMemory";
import { DEFAULT_MEMORY_INTERPRETER_SETTINGS } from "@/lib/memoryInterpreterRules";
import { createEmptyTaskDraft } from "@/types/task";
import type { Message } from "@/types/chat";

const MOBILE_BREAKPOINT = 1180;

export default function TestTaskPage() {
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [gptInput, setGptInput] = useState("");
  const [kinDirectiveInput, setKinDirectiveInput] = useState("");
  const [fileDirectiveInput, setFileDirectiveInput] = useState("");
  const [taskDraft, setTaskDraft] = useState(createEmptyTaskDraft());
  const [protocolPrompt, setProtocolPrompt] = useState("");
  const [protocolRulebook, setProtocolRulebook] = useState("");

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
  const noopAsync = async () => {};
  const noop = () => {};

  const {
    gptState,
    resetGptForCurrentKin,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(null, {
    memoryInterpreterSettings: DEFAULT_MEMORY_INTERPRETER_SETTINGS,
    approvedMemoryRules: [],
    rejectedMemoryRuleCandidateSignatures: [],
    onAddPendingMemoryRuleCandidates: noop,
  });

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
            searchMode="normal"
            searchEngines={[]}
            searchLocation=""
            sourceDisplayCount={3}
            autoLibraryReferenceEnabled={true}
            libraryReferenceMode="summary_only"
            libraryIndexResponseCount={12}
            libraryReferenceCount={3}
            libraryStorageMB={0}
            libraryReferenceEstimatedTokens={0}
            autoSendKinSysInput={false}
            autoCopyKinSysResponseToGpt={false}
            autoSendGptSysInput={false}
            autoCopyGptSysResponseToKin={false}
            autoCopyFileIngestSysInfoToKin={true}
            memoryInterpreterSettings={DEFAULT_MEMORY_INTERPRETER_SETTINGS}
            pendingMemoryRuleCandidates={[]}
            approvedMemoryRules={[]}
            onChangeSearchMode={noop}
            onChangeSearchEngines={noop}
            onChangeSearchLocation={noop}
            onChangeSourceDisplayCount={noop}
            onChangeAutoLibraryReferenceEnabled={noop}
            onChangeLibraryReferenceMode={noop}
            onChangeLibraryIndexResponseCount={noop}
            onChangeLibraryReferenceCount={noop}
            onChangeAutoSendKinSysInput={noop}
            onChangeAutoCopyKinSysResponseToGpt={noop}
            onChangeAutoSendGptSysInput={noop}
            onChangeAutoCopyGptSysResponseToKin={noop}
            onChangeAutoCopyFileIngestSysInfoToKin={noop}
            onChangeMemoryInterpreterSettings={noop}
            onApproveMemoryRuleCandidate={noop}
            onRejectMemoryRuleCandidate={noop}
            onUpdateMemoryRuleCandidate={noop}
            onDeleteApprovedMemoryRule={noop}
            onDeleteSearchHistoryItem={noop}
            multipartAssemblies={[]}
            storedDocuments={[]}
            referenceLibraryItems={[]}
            selectedTaskLibraryItemId=""
            onLoadMultipartAssemblyToGptInput={noop}
            onDownloadMultipartAssembly={noop}
            onDeleteMultipartAssembly={noop}
            onLoadStoredDocumentToGptInput={noop}
            onDownloadStoredDocument={noop}
            onDeleteStoredDocument={noop}
            onMoveStoredDocument={noop}
            onMoveLibraryItem={noop}
            onSelectTaskLibraryItem={noop}
              onChangeLibraryItemMode={noop}
              onStartAskAiModeSearch={noopAsync}
              onImportYouTubeTranscript={noopAsync}
              onSendYouTubeTranscriptToKin={noopAsync}
              onSaveStoredDocument={noop}
            pendingIntentCandidates={[]}
            approvedIntentPhrases={[]}
            onUpdateIntentCandidate={noop}
            onApproveIntentCandidate={noop}
            onRejectIntentCandidate={noop}
            onUpdateApprovedIntentPhrase={noop}
            onDeleteApprovedIntentPhrase={noop}
            lastSearchContext={null}
            searchHistory={[]}
            selectedTaskSearchResultId=""
            onSelectTaskSearchResult={noop}
            onMoveSearchHistoryItem={noop}
            pendingInjectionCurrentPart={0}
            pendingInjectionTotalParts={0}
            onSwitchPanel={noop}
            isMobile={isMobile}
            currentTaskDraft={taskDraft}
            taskDraftCount={1}
            activeTaskDraftIndex={0}
            taskProgressCount={0}
            activeTaskProgressIndex={0}
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
            protocolPrompt={protocolPrompt}
            protocolRulebook={protocolRulebook}
            onChangeProtocolPrompt={setProtocolPrompt}
            onChangeProtocolRulebook={setProtocolRulebook}
            onResetProtocolDefaults={noop}
            onSaveProtocolDefaults={noop}
            onSetProtocolRulebookToKinDraft={noop}
            onSendProtocolRulebookToKin={noopAsync}
            onResetTaskContext={noop}
          />
        </div>
      </div>
    </div>
  );
}
