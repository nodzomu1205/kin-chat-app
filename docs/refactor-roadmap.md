# Refactor Roadmap

Updated: 2026-04-13

## Purpose
この roadmap は、既存機能を壊さずに保守性と拡張性を上げていくための段階的工事計画です。

基本原則は次の 2 点です。

1. 次に追加する 3 機能に耐えられる構造へ、少しずつ寄せる  
2. 毎回の変更前に対象ファイルを明示し、変更後に docs と進捗を更新する

## Current Assessment
現状は、機能面ではかなり強い一方で、統合ポイントに責務が集まりやすい状態です。

特に注意して見るべき場所:

- `app/api/chatgpt/route.ts`
- `lib/app/sendToGptFlow.ts`
- `hooks/useGptMemory.ts`
- `lib/app/memoryInterpreter.ts`
- `hooks/useKinTaskProtocol.ts`
- `lib/app/kinMultipart.ts`

## Phase Plan

### Phase 1: Foundation
目的:

- 既存挙動を壊さずに、構造整理の足場を作る
- 巨大な統合地点を少しずつ薄くする

対象:

- docs 整備
- `app/api/chatgpt/route.ts` の service 抽出
- `app/page.tsx` / action hook / controller の整理
- protocol / task / multipart / memory のテスト観点整理

### Phase 2: Ingest Generalization
目的:

- YouTube 以外にも広げられる ingest pipeline の土台を作る

対象:

- `IngestJob`
- `IngestItem`
- source adapter
- progress UI

### Phase 3: Proposal Workflow Hardening
目的:

- Kin 起点の task / knowledge proposal を安全に運用できるようにする

対象:

- `ProtocolAction`
- `ExecutionBudget`
- approval workflow
- audit log

### Phase 4: Shared Workspace
目的:

- 将来の複数 Kin 協調に耐えられる shared state を導入する

対象:

- `Workspace`
- `SharedArtifact`
- `HandoffRecord`
- role / handoff 管理

### Phase 5: Kin-first UI
目的:

- Kin 主 UI / GPT バックオフィス化の足場を整える

対象:

- Kin workspace 中心 UI
- GPT の設定 / 監査 / 運用画面化

## Progress

### 1. Docs
Status: In progress

Done:

- `README.md` 更新
- `docs/architecture.md` 作成
- `docs/domain-model.md` 作成
- `docs/refactor-roadmap.md` 作成

Next:

- `docs/protocol-actions.md`
- `docs/ingest-pipeline.md`
- `docs/workspace-model.md`

### 2. Page / UI Thinning
Status: Partially done

Done:

- `GptSettingsDrawer` の分割
- `ReceivedDocsDrawer` の clean 化
- `app/page.tsx` の一部 orchestration 抽出

Next:

- `useChatAppController` 導入
- panel props / top-level orchestration の更なる整理

### 3. Server Route Service Extraction
Status: In progress

Primary file:

- [`app/api/chatgpt/route.ts`](../app/api/chatgpt/route.ts)

Done:

- OpenAI response helper を [`lib/server/chatgpt/openaiResponse.ts`](../lib/server/chatgpt/openaiResponse.ts) へ抽出
  - `extractUsage`
  - `extractJsonObjectText`
  - `extractResponseText`
- request 正規化 helper を [`lib/server/chatgpt/requestNormalization.ts`](../lib/server/chatgpt/requestNormalization.ts) へ抽出
  - `resolveChatRouteMode`
  - `normalizeInstructionMode`
  - `normalizeReasoningMode`
  - `normalizeMemoryInput`
  - `normalizeChatMessages`
- prompt builder を [`lib/server/chatgpt/promptBuilders.ts`](../lib/server/chatgpt/promptBuilders.ts) へ抽出
  - `buildInstructionWrappedInput`
  - `buildBaseSystemPrompt`
  - `buildSearchSystemPrompt`
- OpenAI call wrapper を [`lib/server/chatgpt/openaiClient.ts`](../lib/server/chatgpt/openaiClient.ts) へ抽出
  - `callOpenAIResponses`
  - `extractOpenAIJsonObjectText`
- search request resolve を [`lib/server/chatgpt/searchRequest.ts`](../lib/server/chatgpt/searchRequest.ts) へ抽出
  - `resolveSearchRequest`

Next:

- route.ts 内の重複 local helper を整理
- route.ts を request/response の薄い入口へ近づける

### 4. Test Readiness
Status: Not started

Priority targets:

- protocol parser
- task intent parser
- multipart chunking
- YouTube URL handling
- progress counting principle

## Next Review Points
次回の事前チェックでは、まずこの 3 つを確認します。

1. `app/api/chatgpt/route.ts`
2. `lib/app/sendToGptFlow.ts`
3. `hooks/useGptMemory.ts` / `lib/app/memoryInterpreter.ts`

## Working Agreement
今後の工事は次のルールで進めます。

1. 先に触るファイルを共有する
2. 触らないファイルも必要に応じて明示する
3. 1 フェーズずつ止める
4. 型チェックを通す
5. docs と roadmap を更新する

## Success Condition
この roadmap の目的は、一気に全面改修することではありません。

- 今動いている機能を壊さない
- 次の機能追加がしやすくなる
- 問題が起きた時に、どこを見ればよいか分かる

この 3 点を継続的に満たすことを成功条件とします。
