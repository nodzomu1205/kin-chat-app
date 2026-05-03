"use client";

import React from "react";
import type {
  FileReadPolicy,
  ImageDetail,
  ImageLibraryImportMode,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import {
  helpTextStyle,
  labelStyle,
} from "@/components/panels/gpt/gptPanelStyles";
import { sectionCard, subtleCard } from "@/components/panels/gpt/GptSettingsSections";
import {
  GPT_SETTINGS_DRAWER_TEXT,
} from "@/components/panels/gpt/gptSettingsText";
import { GPT_GOOGLE_DRIVE_TEXT } from "@/components/panels/gpt/gptGoogleDriveText";
import { GPT_INGEST_SETTINGS_TEXT } from "@/components/panels/gpt/gptIngestSettingsText";
import {
  LabeledSelect,
  NumberField,
  CountBadge,
  SectionHeaderRow,
  ReadonlyStatField,
  TextField,
  ToggleButtons,
} from "@/components/panels/gpt/GptSettingsShared";
import { tabButton } from "@/components/panels/gpt/GptSettingsSections";
import { usePptDirectEditApprovals } from "@/hooks/usePptDirectEditApprovals";
import type {
  PptDirectEditBlockEdit,
  PptDirectEditCandidate,
  PptDirectEditVisualMode,
} from "@/lib/app/presentation/presentationDirectEditApproval";

export function PptDirectEditApprovalSection(props: {
  onApplyCandidate?: (candidate: PptDirectEditCandidate) => Promise<void>;
}) {
  const approvals = usePptDirectEditApprovals();
  const [showApproved, setShowApproved] = React.useState(false);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const handleApprove = async (candidate: PptDirectEditCandidate) => {
    setErrorMessage("");
    setSuccessMessage("");
    setApplyingId(candidate.id);
    try {
      if (!props.onApplyCandidate) {
        throw new Error("PPT直接編集の反映処理が接続されていません。");
      }
      await approvals.approve(candidate.id, {
        apply: props.onApplyCandidate,
      });
      setSuccessMessage("PPT直接編集を反映しました。");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "PPT直接編集の反映に失敗しました。"
      );
    } finally {
      setApplyingId(null);
    }
  };

  const updateEdit = (
    candidate: PptDirectEditCandidate,
    editId: string,
    patch: Partial<PptDirectEditBlockEdit>
  ) => {
    approvals.update(candidate.id, {
      edits: (candidate.edits || []).map((edit) =>
        edit.id === editId ? { ...edit, ...patch } : edit
      ),
    });
  };

  const parseTargetValue = (value: string) => {
    const match = value.match(/slide\s*(\d+).*?block\s*(\d+)/i);
    if (!match) return null;
    return {
      slideNumber: Number(match[1]),
      blockNumber: Number(match[2]),
    };
  };

  const updateEditTarget = (
    candidate: PptDirectEditCandidate,
    edit: PptDirectEditBlockEdit,
    value: string
  ) => {
    const target = parseTargetValue(value);
    if (!target) return;
    updateEdit(candidate, edit.id, target);
    approvals.update(candidate.id, {
      targetSummary: (candidate.edits || [])
        .map((item) =>
          item.id === edit.id
            ? `Slide ${target.slideNumber} / Block ${target.blockNumber}`
            : `Slide ${item.slideNumber} / Block ${item.blockNumber}`
        )
        .join(", "),
    });
  };

  return (
    <div style={sectionCard}>
      <SectionHeaderRow
        title="PPT直接編集 承認"
        badges={
          <>
            <CountBadge
              label="承認待ち"
              count={approvals.pending.length}
              tone={approvals.pending.length > 0 ? "warning" : "neutral"}
            />
            <CountBadge
              label="承認済"
              count={approvals.approved.length}
              tone="info"
            />
          </>
        }
        action={
          <button
            type="button"
            style={tabButton(showApproved)}
            onClick={() => setShowApproved((prev) => !prev)}
          >
            {showApproved ? "承認済を隠す" : "承認済を表示"}
          </button>
        }
      />

      <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>
        承認待ち
      </div>
      {approvals.pending.length === 0 ? (
        <div style={helpTextStyle}>承認待ちはありません。</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {approvals.pending.map((candidate) => (
            <div key={candidate.id} style={subtleCard}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={labelStyle}>{candidate.documentId}</div>
                {candidate.edits?.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {candidate.edits.map((edit) => (
                      <div
                        key={edit.id}
                        style={{
                          display: "grid",
                          gap: 8,
                          border: "1px solid #dbeafe",
                          borderRadius: 8,
                          padding: 10,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            ...labelStyle,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={edit.accepted !== false}
                            onChange={(event) =>
                              updateEdit(candidate, edit.id, {
                                accepted: event.target.checked,
                              })
                            }
                          />
                          採用
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={labelStyle}>対象</span>
                          <input
                            value={`Slide ${edit.slideNumber} / Block ${edit.blockNumber}`}
                            placeholder="Slide 1 / Block 1"
                            onChange={(event) =>
                              updateEditTarget(candidate, edit, event.target.value)
                            }
                            style={{
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              padding: "8px 10px",
                              fontSize: 13,
                            }}
                          />
                        </label>
                        <div style={helpTextStyle}>
                          種別: {edit.blockType === "visual" ? "Visual" : "Text"} /{" "}
                          {edit.blockKind}
                        </div>
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={labelStyle}>ユーザー変更指示</span>
                          <textarea
                            value={edit.instruction}
                            rows={2}
                            onChange={(event) =>
                              updateEdit(candidate, edit.id, {
                                instruction: event.target.value,
                              })
                            }
                            style={{
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              padding: "8px 10px",
                              fontSize: 13,
                              resize: "vertical",
                            }}
                          />
                        </label>
                        {edit.currentText ? (
                          <div style={helpTextStyle}>現在内容: {edit.currentText}</div>
                        ) : null}
                        {edit.blockType === "visual" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <LabeledSelect
                              label="Visual変更"
                              value={edit.visualMode || "revise_prompt"}
                              onChange={(value) =>
                                updateEdit(candidate, edit.id, {
                                  visualMode: value as PptDirectEditVisualMode,
                                })
                              }
                            >
                              <option value="library_image">Image ID</option>
                              <option value="generate_image">画像生成</option>
                              <option value="revise_prompt">指示更新</option>
                              <option value="none">変更なし</option>
                            </LabeledSelect>
                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={labelStyle}>Image ID</span>
                              <input
                                value={edit.imageId || ""}
                                onChange={(event) =>
                                  updateEdit(candidate, edit.id, {
                                    imageId: event.target.value,
                                  })
                                }
                                style={{
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  fontSize: 13,
                                }}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={labelStyle}>Visual案</span>
                              <textarea
                                value={edit.visualBrief || edit.proposedText || ""}
                                rows={3}
                                onChange={(event) =>
                                  updateEdit(candidate, edit.id, {
                                    visualBrief: event.target.value,
                                  })
                                }
                                style={{
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  fontSize: 13,
                                  resize: "vertical",
                                }}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4 }}>
                              <span style={labelStyle}>生成/差替指示</span>
                              <textarea
                                value={edit.generationPrompt || ""}
                                rows={3}
                                onChange={(event) =>
                                  updateEdit(candidate, edit.id, {
                                    generationPrompt: event.target.value,
                                  })
                                }
                                style={{
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  fontSize: 13,
                                  resize: "vertical",
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <label style={{ display: "grid", gap: 4 }}>
                            <span style={labelStyle}>更新後内容案</span>
                            <textarea
                              value={edit.proposedText || ""}
                              rows={4}
                              onChange={(event) =>
                                updateEdit(candidate, edit.id, {
                                  proposedText: event.target.value,
                                })
                              }
                              style={{
                                border: "1px solid #cbd5e1",
                                borderRadius: 8,
                                padding: "8px 10px",
                                fontSize: 13,
                                resize: "vertical",
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={helpTextStyle}>
                    この承認候補は現在のPPT直接編集形式ではありません。
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={tabButton(true)}
                    disabled={applyingId === candidate.id}
                    onClick={() => void handleApprove(candidate)}
                  >
                    {applyingId === candidate.id ? "反映中" : "承認"}
                  </button>
                  <button
                    type="button"
                    style={tabButton(false)}
                    onClick={() => approvals.reject(candidate.id)}
                  >
                    却下
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {errorMessage ? (
        <div style={{ ...helpTextStyle, color: "#b91c1c", marginTop: 8 }}>
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div style={{ ...helpTextStyle, color: "#047857", marginTop: 8 }}>
          {successMessage}
        </div>
      ) : null}

      {showApproved ? (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {approvals.approved.length === 0 ? (
            <div style={helpTextStyle}>承認済はありません。</div>
          ) : (
            approvals.approved.map((approved) => (
              <div key={approved.id} style={subtleCard}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={labelStyle}>{approved.documentId}</div>
                  <div style={helpTextStyle}>{approved.instruction}</div>
                  {approved.targetSummary ? (
                    <div style={helpTextStyle}>承認対象: {approved.targetSummary}</div>
                  ) : null}
                  <button
                    type="button"
                    style={tabButton(false)}
                    onClick={() => approvals.deleteApproved(approved.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function IngestSettingsSection(props: {
  isMobile?: boolean;
  uploadKind: UploadKind;
  onChangeUploadKind: (v: UploadKind) => void;
  ingestMode: IngestMode;
  onChangeIngestMode: (v: IngestMode) => void;
  imageDetail: ImageDetail;
  onChangeImageDetail: (v: ImageDetail) => void;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeCompactCharLimit: (v: number) => void;
  onChangeSimpleImageCharLimit: (v: number) => void;
  fileReadPolicy: FileReadPolicy;
  onChangeFileReadPolicy: (v: FileReadPolicy) => void;
  imageLibraryImportEnabled: boolean;
  onChangeImageLibraryImportEnabled: (v: boolean) => void;
  imageLibraryImportMode: ImageLibraryImportMode;
  onChangeImageLibraryImportMode: (v: ImageLibraryImportMode) => void;
}) {
  const unifiedDetail =
    props.imageDetail === "simple" ? "compact" : props.imageDetail;
  const unifiedLimit = props.compactCharLimit;
  const applyUnifiedMode = (value: IngestMode) => {
    props.onChangeIngestMode(value);
    props.onChangeImageDetail(value === "compact" ? "simple" : value);
  };
  const applyUnifiedLimit = (value: number) => {
    props.onChangeCompactCharLimit(value);
    props.onChangeSimpleImageCharLimit(value);
  };

  return (
    <>
      <div style={sectionCard}>
        <div style={{ display: "grid", gap: 12 }}>
        <LabeledSelect
          label="テキスト取込方針"
          value={props.fileReadPolicy}
          onChange={(value) => props.onChangeFileReadPolicy(value as FileReadPolicy)}
        >
          <option value="text_first">
            {GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_first}
          </option>
          <option value="visual_first">
            {GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.visual_first}
          </option>
          <option value="text_and_layout">
            {GPT_SETTINGS_DRAWER_TEXT.fileReadPolicyOptions.text_and_layout}
          </option>
        </LabeledSelect>
          <div style={subtleCard}>
            <LabeledSelect
              label="取込粒度"
              value={unifiedDetail}
              onChange={(value) => applyUnifiedMode(value as IngestMode)}
            >
              <option value="compact">compact</option>
              <option value="detailed">detailed</option>
              <option value="max">max</option>
            </LabeledSelect>
            <div style={{ marginTop: 8 }}>
              <NumberField
                label={GPT_SETTINGS_DRAWER_TEXT.charLimit}
                value={String(unifiedLimit)}
                onChange={(v) => applyUnifiedLimit(Number(v || 0))}
              />
            </div>
          </div>
        </div>
      </div>
      <div style={sectionCard}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={labelStyle}>画像取込</div>
          <ToggleButtons
            label="画像ライブラリ保存"
            checked={props.imageLibraryImportEnabled}
            onChange={props.onChangeImageLibraryImportEnabled}
          />
          <LabeledSelect
            label="保存内容"
            value={props.imageLibraryImportMode}
            onChange={(value) =>
              props.onChangeImageLibraryImportMode(
                value as ImageLibraryImportMode
              )
            }
          >
            <option value="image_only">画像のみ</option>
            <option value="image_with_description">画像+描写テキスト</option>
          </LabeledSelect>
          <div style={helpTextStyle}>
            オフの場合は通常ライブラリにテキストとして保存します。オンの場合は通常ライブラリへの保存に加え、画像ライブラリにも保存します。
          </div>
        </div>
      </div>
    </>
  );
}

export function LibraryCardSummarySettingsSection(props: {
  autoGenerateLibrarySummary: boolean;
  onChangeAutoGenerateLibrarySummary: (value: boolean) => void;
}) {
  return (
    <div style={sectionCard}>
      <ToggleButtons
        label={GPT_INGEST_SETTINGS_TEXT.autoSummaryLabel}
        checked={props.autoGenerateLibrarySummary}
        onChange={props.onChangeAutoGenerateLibrarySummary}
      />
    </div>
  );
}

export function WorkspaceSectionTitle(props: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: "-0.02em",
        }}
      >
        {props.title}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
        {props.subtitle}
      </div>
    </div>
  );
}

export function GoogleDriveLibrarySection(props: {
  folderLink: string;
  folderId: string;
  integrationMode: "manual_link" | "picker";
  onChangeFolderLink: (value: string) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>
            {GPT_GOOGLE_DRIVE_TEXT.settings.title}
          </div>
          <div style={helpTextStyle}>
            {GPT_GOOGLE_DRIVE_TEXT.settings.importHelp}
          </div>
        </div>

        <TextField
          label={GPT_GOOGLE_DRIVE_TEXT.settings.folderLinkLabel}
          value={props.folderLink}
          onChange={props.onChangeFolderLink}
          help={GPT_GOOGLE_DRIVE_TEXT.settings.folderLinkHelp}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <ReadonlyStatField
            label={GPT_GOOGLE_DRIVE_TEXT.settings.folderIdLabel}
            value={props.folderId || "-"}
          />
          <ReadonlyStatField
            label={GPT_GOOGLE_DRIVE_TEXT.settings.integrationModeLabel}
            value={
              props.integrationMode === "manual_link"
                ? GPT_GOOGLE_DRIVE_TEXT.settings.integrationModeManual
                : GPT_GOOGLE_DRIVE_TEXT.settings.integrationModePicker
            }
          />
        </div>
      </div>
    </div>
  );
}
