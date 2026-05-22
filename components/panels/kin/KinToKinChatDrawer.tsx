"use client";

import React, { useMemo, useRef, useState } from "react";
import type { KinProfile } from "@/types/chat";
import { generateId } from "@/lib/shared/uuid";
import {
  buildKinGroupChatRelayBlock,
  buildKinGroupChatRetryBlock,
  buildKinGroupChatStartBlock,
  buildKinToKinLimitNotice,
  buildKinToKinRelayBlock,
  buildKinToKinStartBlock,
  buildKinToKinSummaryRequest,
  containsKinGroupChatEndToken,
  parseKinToKinProtocolBlock,
  parseKinToKinChatReply,
  validateKinGroupChatRoute,
  type KinToKinMember,
  type KinToKinTranscriptEntry,
} from "@/lib/app/kin-to-kin/kinToKinChat";

type Props = {
  kinList: KinProfile[];
  sendKinToKinMessage: (
    kinId: string,
    text: string,
    speakerLabel: string
  ) => Promise<string>;
  requestSummary: (text: string) => void | Promise<void>;
};

type SessionStatus = "idle" | "running" | "paused" | "completed" | "error";

function resolveMaxCount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

export default function KinToKinChatDrawer({
  kinList,
  sendKinToKinMessage,
  requestSummary,
}: Props) {
  const [starterId, setStarterId] = useState(() => kinList[0]?.id || "");
  const [participantIds, setParticipantIds] = useState<string[]>(() =>
    kinList[1]?.id ? [kinList[1].id] : []
  );
  const [topic, setTopic] = useState("");
  const [maxCountInput, setMaxCountInput] = useState("50");
  const [summarizeOnEnd, setSummarizeOnEnd] = useState(false);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [notice, setNotice] = useState("");
  const [transcript, setTranscript] = useState<KinToKinTranscriptEntry[]>([]);
  const stopRequestedRef = useRef(false);
  const transcriptRef = useRef<KinToKinTranscriptEntry[]>([]);
  const resolvedStarterId =
    starterId && kinList.some((kin) => kin.id === starterId)
      ? starterId
      : kinList[0]?.id || "";

  const availablePartners = useMemo(
    () => kinList.filter((kin) => kin.id !== resolvedStarterId),
    [kinList, resolvedStarterId]
  );
  const resolvedParticipantIds = useMemo(() => {
    return participantIds.filter(
      (id) => id !== resolvedStarterId && kinList.some((kin) => kin.id === id)
    );
  }, [kinList, participantIds, resolvedStarterId]);
  const selectedMembers = useMemo(
    () =>
      [resolvedStarterId, ...resolvedParticipantIds]
        .map((id) => kinList.find((kin) => kin.id === id))
        .filter((kin): kin is KinProfile => Boolean(kin)),
    [kinList, resolvedParticipantIds, resolvedStarterId]
  );
  const hasDuplicateSelectedLabels =
    new Set(selectedMembers.map((kin) => kin.label)).size !==
    selectedMembers.length;
  const selectedParticipantLabels = availablePartners
    .filter((kin) => resolvedParticipantIds.includes(kin.id))
    .map((kin) => kin.label);
  const participantModeLabel =
    resolvedParticipantIds.length > 1
      ? `${resolvedParticipantIds.length + 1} members / group`
      : "2 members";
  const canStart =
    kinList.length >= 2 &&
    resolvedStarterId &&
    resolvedParticipantIds.length > 0 &&
    !hasDuplicateSelectedLabels &&
    topic.trim() &&
    resolveMaxCount(maxCountInput) > 0 &&
    status !== "running";

  const appendEntry = (entry: KinToKinTranscriptEntry) => {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(transcriptRef.current);
  };

  const finishSession = async (params: {
    members: KinProfile[];
    reason: "limit" | "stopped";
  }) => {
    setStatus(params.reason === "limit" ? "completed" : "paused");
    if (params.reason === "limit") {
      const noticeBlock = buildKinToKinLimitNotice({
        maxCount: resolveMaxCount(maxCountInput),
        topic: topic.trim(),
      });
      for (const member of params.members) {
        await sendKinToKinMessage(member.id, noticeBlock, member.label);
      }
    }
    if (summarizeOnEnd && transcriptRef.current.length > 0) {
      await requestSummary(
        buildKinToKinSummaryRequest({
          topic: topic.trim(),
          entries: transcriptRef.current,
        })
      );
    }
  };

  const startSession = async () => {
    const starter = kinList.find((kin) => kin.id === resolvedStarterId);
    const participants = resolvedParticipantIds
      .map((id) => kinList.find((kin) => kin.id === id))
      .filter((kin): kin is KinProfile => Boolean(kin));
    if (!starter || participants.length === 0 || !canStart) return;
    const maxCount = resolveMaxCount(maxCountInput);

    stopRequestedRef.current = false;
    transcriptRef.current = [];
    setTranscript([]);
    setStatus("running");
    setNotice("");

    try {
      if (participants.length > 1) {
        await runGroupSession({
          starter,
          participants,
          maxCount,
        });
        return;
      }

      const partner = participants[0];
      let sender = starter;
      let receiver = partner;
      let outbound = buildKinToKinStartBlock({
        starter: starter.label,
        partner: partner.label,
        topic: topic.trim(),
        maxCount,
      });

      for (let count = 1; count <= maxCount; count += 1) {
        if (stopRequestedRef.current) {
          await finishSession({ members: [starter, partner], reason: "stopped" });
          return;
        }

        const reply = await sendKinToKinMessage(sender.id, outbound, sender.label);
        if (!reply.trim()) {
          setStatus("error");
          setNotice("No valid reply was received from " + sender.label + ".");
          return;
        }

        const parsed = parseKinToKinChatReply(reply, {
          from: sender.label,
          to: receiver.label,
        });
        const entry = {
          id: generateId(),
          from: parsed.from,
          to: parsed.to,
          text: parsed.text,
          count,
          maxCount,
          createdAt: new Date().toISOString(),
        };
        appendEntry(entry);

        if (count >= maxCount) {
          await finishSession({ members: [starter, partner], reason: "limit" });
          return;
        }

        outbound = buildKinToKinRelayBlock({
          from: entry.from,
          to: entry.to,
          message: entry.text,
          topic: topic.trim(),
          count,
          maxCount,
        });
        [sender, receiver] = [receiver, sender];
      }
    } catch (error) {
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "Kin-to-Kin chat failed.");
    }
  };

  const runGroupSession = async (params: {
    starter: KinProfile;
    participants: KinProfile[];
    maxCount: number;
  }) => {
    const members = [params.starter, ...params.participants];
    const memberRefs: KinToKinMember[] = members.map((member) => ({
      id: member.id,
      label: member.label,
    }));
    const facilitator = memberRefs[0];
    const participantLabels = memberRefs.map((member) => member.label);
    let sender = params.starter;
    let outbound = buildKinGroupChatStartBlock({
      facilitator: params.starter.label,
      participants: participantLabels,
      topic: topic.trim(),
      maxCount: params.maxCount,
    });
    let count = 0;
    let retryCount = 0;

    while (count < params.maxCount) {
      if (stopRequestedRef.current) {
        await finishSession({ members, reason: "stopped" });
        return;
      }

      const reply = await sendKinToKinMessage(sender.id, outbound, sender.label);
      if (!reply.trim()) {
        setStatus("error");
        setNotice(`No valid reply was received from ${sender.label}.`);
        return;
      }

      const parsed = parseKinToKinProtocolBlock(reply);
      const validation = validateKinGroupChatRoute({
        parsed,
        sender: { id: sender.id, label: sender.label },
        facilitator,
        members: memberRefs,
      });

      if (!validation.ok) {
        retryCount += 1;
        if (retryCount > 2) {
          setStatus("error");
          setNotice(
            `${sender.label} could not rewrite the group chat route correctly: ${validation.reason}`
          );
          return;
        }
        outbound = buildKinGroupChatRetryBlock({
          facilitator: params.starter.label,
          participants: participantLabels,
          sender: sender.label,
          reason: validation.reason,
        });
        continue;
      }

      retryCount = 0;
      count += 1;
      const entry = {
        id: generateId(),
        from: validation.from,
        to: validation.to,
        text: validation.text,
        count,
        maxCount: params.maxCount,
        createdAt: new Date().toISOString(),
      };
      appendEntry(entry);

      if (
        validation.from === params.starter.label &&
        containsKinGroupChatEndToken(validation.text)
      ) {
        await finishSession({ members, reason: "limit" });
        return;
      }

      if (count >= params.maxCount) {
        await finishSession({ members, reason: "limit" });
        return;
      }

      outbound = buildKinGroupChatRelayBlock({
        facilitator: params.starter.label,
        participants: participantLabels,
        recipient: validation.recipient.label,
        sender: validation.from,
        message: validation.text,
      });
      const nextSender = members.find(
        (member) => member.id === validation.recipient.id
      );
      if (!nextSender) {
        setStatus("error");
        setNotice("Next Kin participant could not be resolved.");
        return;
      }
      sender = nextSender;
    }
  };

  return (
    <div style={drawerStyle}>
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Kin-to-Kin chat</div>
        </div>
        <span style={statusPillStyle}>{status}</span>
      </div>

      {kinList.length < 2 ? (
        <div style={alertStyle}>Register at least two Kin profiles to use this chat.</div>
      ) : (
        <>
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Starter Kin</span>
              <select
                value={resolvedStarterId}
                disabled={status === "running"}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setStarterId(next);
                  setParticipantIds((current) =>
                    current.filter((id) => id !== next)
                  );
                }}
                style={inputStyle}
              >
                {kinList.map((kin) => (
                  <option key={kin.id} value={kin.id}>
                    {kin.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Participants / {participantModeLabel}</span>
              <div style={participantPanelStyle}>
                <div style={participantSummaryStyle}>
                  {selectedParticipantLabels.length > 0
                    ? selectedParticipantLabels.join(", ")
                    : "Select at least one participant"}
                </div>
                <div style={participantListStyle}>
                {availablePartners.map((kin) => {
                  const checked = resolvedParticipantIds.includes(kin.id);
                  return (
                    <button
                      key={kin.id}
                      type="button"
                      aria-pressed={checked}
                      disabled={status === "running"}
                      onClick={() => {
                        setParticipantIds((current) =>
                          checked
                            ? current.filter((id) => id !== kin.id)
                            : [...new Set([...current, kin.id])]
                        );
                      }}
                      style={{
                        ...participantOptionStyle,
                        borderColor: checked ? "#a78bfa" : "#cbd5e1",
                        background: checked ? "#f3e8ff" : "#ffffff",
                        color: checked ? "#5b21b6" : "#334155",
                        cursor: status === "running" ? "not-allowed" : "pointer",
                      }}
                    >
                      <span style={participantCheckStyle}>
                        {checked ? "ON" : "OFF"}
                      </span>
                      <span style={participantNameStyle}>{kin.label}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Max turns</span>
              <input
                type="number"
                min={1}
                max={200}
                disabled={status === "running"}
                value={maxCountInput}
                onChange={(event) => setMaxCountInput(event.currentTarget.value)}
                onBlur={() => setMaxCountInput(String(resolveMaxCount(maxCountInput)))}
                style={inputStyle}
              />
            </label>

            <div style={fieldStyle}>
              <span style={labelStyle}>Summary on end</span>
              <button
                type="button"
                disabled={status === "running"}
                onClick={() => setSummarizeOnEnd((current) => !current)}
                style={{
                  ...toggleButtonStyle,
                  background: summarizeOnEnd ? "#ecfeff" : "#ffffff",
                  borderColor: summarizeOnEnd ? "#99f6e4" : "#cbd5e1",
                  color: summarizeOnEnd ? "#0f766e" : "#475569",
                  opacity: status === "running" ? 0.6 : 1,
                  cursor: status === "running" ? "not-allowed" : "pointer",
                }}
                aria-pressed={summarizeOnEnd}
              >
                {summarizeOnEnd ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>Topic</span>
            <textarea
              value={topic}
              disabled={status === "running"}
              onChange={(event) => setTopic(event.currentTarget.value)}
              placeholder="Conversation topic"
              style={topicInputStyle}
            />
          </label>

          <div style={actionsStyle}>
            <button
              type="button"
              disabled={!canStart}
              onClick={() => void startSession()}
              style={{
                ...primaryButtonStyle,
                opacity: canStart ? 1 : 0.55,
                cursor: canStart ? "pointer" : "not-allowed",
              }}
            >
              Start
            </button>
            <button
              type="button"
              disabled={status !== "running"}
              onClick={() => {
                stopRequestedRef.current = true;
                setNotice("The session will stop after the current send/receive cycle finishes.");
              }}
              style={secondaryButtonStyle}
            >
              Stop
            </button>
            <button
              type="button"
              disabled={status === "running"}
              onClick={() => {
                transcriptRef.current = [];
                setTranscript([]);
                setNotice("");
                setStatus("idle");
              }}
              style={secondaryButtonStyle}
            >
              Reset
            </button>
          </div>
        </>
      )}

      {notice ? <div style={alertStyle}>{notice}</div> : null}

      <div style={transcriptStyle}>
        {transcript.length === 0 ? (
          <div style={bodyStyle}>No conversation log yet.</div>
        ) : (
          transcript.map((entry) => (
            <div key={entry.id} style={entryStyle}>
              <div style={entryMetaStyle}>
                {entry.count}/{entry.maxCount} {entry.from} {"->"} {entry.to}
              </div>
              <div style={entryTextStyle}>{entry.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const drawerStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "7px 8px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "#ddd6fe",
  background: "rgba(250,245,255,0.94)",
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "flex-start",
};

const titleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#3b0764",
};

const bodyStyle: React.CSSProperties = {
  marginTop: 3,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#475569",
};

const statusPillStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#c4b5fd",
  borderRadius: 999,
  padding: "2px 7px",
  fontSize: 10,
  fontWeight: 800,
  color: "#5b21b6",
  background: "#ffffff",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "165px 220px 82px 74px",
  gap: 6,
  justifyContent: "start",
  alignItems: "end",
  overflowX: "auto",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: "#475569",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 7,
  padding: "5px 7px",
  fontSize: 12,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#0f172a",
};

const topicInputStyle: React.CSSProperties = {
  ...inputStyle,
  maxWidth: 640,
  minHeight: 36,
  resize: "vertical",
};

const participantPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 7,
  padding: 5,
  background: "#ffffff",
};

const participantSummaryStyle: React.CSSProperties = {
  minHeight: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 10,
  fontWeight: 800,
  color: "#475569",
};

const participantListStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))",
  gap: 3,
  maxHeight: 54,
  overflow: "auto",
};

const participantOptionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 4,
  minWidth: 0,
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 5,
  padding: "3px 5px",
  fontSize: 10,
  fontWeight: 700,
  textAlign: "left",
};

const participantCheckStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  flexShrink: 0,
  borderRadius: 999,
  padding: "1px 0",
  background: "rgba(255,255,255,0.72)",
  fontSize: 8,
  fontWeight: 900,
};

const participantNameStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const toggleButtonStyle: React.CSSProperties = {
  width: 74,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
  textAlign: "center",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 999,
  padding: "5px 10px",
  background: "#6d28d9",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 999,
  padding: "5px 10px",
  background: "#ffffff",
  color: "#334155",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const alertStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#fde68a",
  background: "#fffbeb",
  color: "#92400e",
  borderRadius: 8,
  padding: 8,
  fontSize: 12,
  fontWeight: 700,
};

const transcriptStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  maxHeight: 180,
  overflow: "auto",
};

const entryStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#ddd6fe",
  background: "#ffffff",
  borderRadius: 8,
  padding: 8,
};

const entryMetaStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#6d28d9",
};

const entryTextStyle: React.CSSProperties = {
  marginTop: 4,
  whiteSpace: "pre-wrap",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#0f172a",
  overflowWrap: "anywhere",
};
