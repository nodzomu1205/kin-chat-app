import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memoryInterpreterRules";

export const GPT_PROTOCOL_SETTINGS_TEXT = {
  automationTitle: "自動プロトコル連携",
  automation: [
    {
      label: "A. Kin入力後に SYS を自動送信",
      help: "Kin に入力した直後、必要に応じて SYS ブロックを自動送信します。",
    },
    {
      label: "B. Kin の SYS 応答を GPT 入力欄へ自動コピー",
      help: "Kin の最新メッセージに SYS ブロックが含まれる時、GPT の入力欄へ自動で反映します。",
    },
    {
      label: "C. GPT入力後に SYS を自動送信",
      help: "GPT に入力した直後、必要に応じて SYS ブロックを自動送信します。",
    },
    {
      label: "D. GPT の SYS 応答を Kin 入力欄へ自動コピー",
      help: "GPT の最新メッセージに SYS ブロックが含まれる時、Kin の入力欄へ自動で反映します。",
    },
    {
      label: "E. ファイル読込後の SYS_INFO を Kin 入力欄へ自動コピー",
      help: "ファイル読込後に生成された SYS_INFO を Kin 入力欄へセットします。",
    },
  ],
  promptLabel: "プロンプト",
  rulebookLabel: "ルールブック",
  rulebookHelp:
    "設定用プロトコルでは `ENGINE: google_search / google_ai_mode / google_news / google_local` と `LOCATION: Japan` のような指定を使えます。",
  resetDefaults: "既定値に戻す",
  saveDefaults: "既定値として保存",
  setKinDraft: "Kin 入力欄へセット",
  sendSysInfo: "SYS_INFO として送信",
} as const;

export const GPT_PROTOCOL_AUTOMATION_LABELS = [
  "A. Kin入力欄のSYSフォーマットを自動送信",
  "B. KinのSYS応答を GPT 入力欄へ自動コピー",
  "C. GPT入力欄のSYSフォーマットを自動送信",
  "D. GPT の SYS 応答を Kin 入力欄へ自動コピー",
  "E. ファイル読込後の SYS_INFO を Kin 入力欄へ自動コピー",
] as const;

export const GPT_SETTINGS_SECTION_TEXT = {
  searchPresetTitle: "検索プリセット",
  searchPresetLabels: {
    normal: "通常",
    ai: "AI",
    integrated: "統合",
    news: "News",
    geo: "Maps / Local",
    youtube: "YouTube",
  },
  locationLabel: "Location",
  locationPlaceholder: "例: Japan / Johannesburg, South Africa",
  locationHelp: "Protocol の `LOCATION` に使う主な地理設定です。",
  enginesLabel: "Engines",
  enginesHelp:
    "使用可能: `google_search / google_ai_mode / google_news / google_maps / google_local / youtube_search`",
  sourceDisplayCountLabel: "リンク表示件数",
  sourceDisplayCountHelp: "検索結果カードや関連リンクカードで表示する件数です。",
  autoLibraryReferenceLabel: "ライブラリ自動参照",
  autoLibraryReferenceHelp:
    "Kin の発話や検索結果、取込文書などをもとに、ライブラリ候補を自動で参照に含めます。",
  libraryReferenceModeLabel: "ライブラリ参照モード",
  libraryIndexResponseCountLabel: "ライブラリ index 件数",
  libraryReferenceCountLabel: "ライブラリ参照件数",
  libraryStorageLabel: "ライブラリ容量",
  libraryEstimatedTokensLabel: "ライブラリ想定トークン",
  libraryEstimatedTokensValuePrefix: "約 ",
} as const;

export const GPT_SETTINGS_WORKSPACE_TEXT = {
  viewTitles: {
    chat: "チャット設定",
    task: "タスク設定",
    library: "ライブラリ設定",
  },
  viewSubtitles: {
    chat: "応答制御、自動連携、記憶モード",
    task: "SYSルール、連携候補、プロトコル用プロンプト",
    library: "ライブラリ、検索、取込",
  },
  viewTabs: {
    chat: "チャット",
    task: "タスク",
    library: "ライブラリ",
  },
  close: "閉じる",
  memoryCapacityPreviewLabel: "メモリ容量プレビュー",
  memoryCapacityPreviewPrefix: "合計 ",
  memoryCapacityPreviewHelp: "recent + facts + preferences",
  reset: "リセット",
  save: "保存",
  outputMode: "出力モード",
} as const;

export const GPT_SETTINGS_DRAWER_TEXT = {
  tabs: {
    memory: "メモリ",
    ingest: "取込",
    search: "検索",
    library: "ライブラリ",
    rules: "ルール",
    output: "出力",
    protocol: "プロトコル",
  },
  memoryCapacityPreviewLabel: "メモリ容量プレビュー",
  memoryCapacityPreviewPrefix: "合計 ",
  memoryCapacityPreviewHelp: "recent + facts + preferences",
  reset: "リセット",
  save: "保存",
  fileReadPolicy: "ファイル読み取り方針",
  fileReadPolicyOptions: {
    text_first: "テキスト優先",
    visual_first: "見た目優先",
    text_and_layout: "両方",
  },
  textIngest: "テキスト取込",
  imagePdfIngest: "画像 / PDF 取込",
  charLimit: "文字数上限",
  outputMode: "出力モード",
  outputModeHelp:
    "`Balanced` は既定モードで、説明を広めた場合に使います。`Strict` を使うと、必要に応じて出力をより調整できます。",
  memoryFieldHelp: {
    maxFacts: "facts の最大数",
    maxPreferences: "preferences の最大数",
    chatRecentLimit: "recentMessages の保持数",
    summarizeThreshold: "要約を始める閾値",
    recentKeep: "要約後に残す recentMessages 数",
  },
} as const;

export const GPT_SETTINGS_REVIEW_TEXT = {
  showApproved: "承認済みを表示",
  hideApproved: "承認済みを閉じる",
  createdAt: "登録日",
  delete: "削除",
  pending: "承認待ち",
  pendingMeta: "左が確定、右が却下です。",
  approve: "承認",
  reject: "却下",
  memoryReviewTitle: "文脈レビュー",
  approved: "承認済み",
  noApprovedMemoryReview: "登録済みの文脈レビューはありません。",
  sourcePhrase: "入力語",
  intent: "意図",
  topicDecision: "トピック判定",
  topicCandidate: "トピック候補",
  noPendingMemoryReview: "未対応の文脈候補はありません。",
  actualComment: "実際のコメント",
  userIntent: "ユーザー意図",
  topic: "トピック",
  keepEmpty: "(keep の場合は空)",
  keepPlaceholder: "keep の場合は空のまま",
  confirm: "確定",
  sysRuleTitle: "SYSフォーマットルール",
  noPendingSysRules: "未対応の SYS ルール候補はありません。",
  detectedPhrase: "元の検出語",
  approvedDraft: "承認文面",
  approvalHelp:
    "正しければ承認、少しズレていれば修正して承認、方向が違えば却下します。",
  approvedSection: "承認済み",
  approvalCount: "承認回数",
  rejectionCount: "却下回数",
} as const;

export const GPT_SETTINGS_RULES_TEXT = {
  interpreterTitle: "Memory Interpreter",
  llmFallback: "LLM fallback",
  llmFallbackHelp:
    "判定しにくい topic / closing reply を LLM で補助判定します。",
  saveCandidates: "候補を保存",
  saveCandidatesHelp:
    "LLM fallback で見つけた Memory ルール候補をレビューキューに残します。",
  pendingMemoryTitle: "Memory ルール候補",
  pendingMemoryHelp:
    "判定が難しい発話をもとに、文脈レビューや LLM で候補化したルールです。",
  pendingMemoryEmpty: "現在、レビュー待ちの Memory ルール候補はありません。",
  approvedMemoryHelp:
    "承認済みルールは、次回以降の LLM fallback 判定にも使われます。",
  showApprovedMemory: "承認済み Memory ルールを表示",
  hideApprovedMemory: "承認済み Memory ルールを閉じる",
  pendingSysTitle: "SYS フォーマットルール候補",
  pendingSysHelp:
    "こちらは SYS フォーマットや意図判定まわりの候補です。Memory 関連候補とは別管理です。",
  pendingSysEmpty: "現在、SYS フォーマットルール候補はありません。",
  showApprovedSys: "承認済み SYS ルールを表示",
  hideApprovedSys: "承認済み SYS ルールを閉じる",
  sourcePhrase: "入力語",
  userIntent: "ユーザー意図",
  topicDecision: "トピック判定",
  topic: "トピック",
  topicPlaceholder: "keep の場合は空のまま",
  approve: "承認",
  reject: "却下",
  delete: "削除",
  createdAt: "登録日",
  ruleKinds: {
    utterance_review: "文脈レビュー",
    topic_alias: "topic 関連",
    closing_reply: "closing reply 関連",
  },
  intentKinds: {
    ask_gpt: "GPT依頼回数",
    ask_user: "ユーザー確認回数",
    search_request: "検索依頼回数",
    youtube_transcript_request: "コンテンツ取得回数",
    library_reference: "ライブラリ参照回数",
    char_limit: "文字数制約",
  },
} as const;

type MemoryRuleKind = PendingMemoryRuleCandidate["kind"] | ApprovedMemoryRule["kind"];
type IntentPhraseKind = PendingIntentCandidate["kind"] | ApprovedIntentPhrase["kind"];

export function getCandidateIntentValue(
  candidate: PendingMemoryRuleCandidate
): UserUtteranceIntent {
  if (candidate.intent) return candidate.intent;
  if (candidate.kind === "closing_reply") return "acknowledgement";
  if (candidate.kind === "topic_alias") return "question";
  return "unknown";
}

export function getCandidateTopicDecisionValue(
  candidate: PendingMemoryRuleCandidate
): TopicDecision {
  if (candidate.topicDecision) return candidate.topicDecision;
  if (candidate.kind === "closing_reply") return "keep";
  if (candidate.kind === "topic_alias") return "switch";
  return "unclear";
}

export function formatMemoryRuleKind(kind: MemoryRuleKind) {
  return GPT_SETTINGS_RULES_TEXT.ruleKinds[kind] ?? kind;
}

export function formatIntentPhraseKindLabel(kind: IntentPhraseKind) {
  return GPT_SETTINGS_RULES_TEXT.intentKinds[kind] ?? kind;
}

export function formatIntentLabel(intent: UserUtteranceIntent) {
  switch (intent) {
    case "agreement":
      return "同意";
    case "disagreement":
      return "否定";
    case "question":
      return "質問";
    case "request":
      return "依頼";
    case "statement":
      return "叙述";
    case "suggestion":
      return "提案";
    case "acknowledgement":
      return "相槌";
    default:
      return "不明";
  }
}

export function formatTopicDecisionLabel(decision: TopicDecision) {
  switch (decision) {
    case "keep":
      return "維持";
    case "switch":
      return "切替";
    default:
      return "保留";
  }
}
