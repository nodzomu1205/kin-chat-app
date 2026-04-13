# Refactor Roadmap

Updated: 2026-04-13

## 目的

この roadmap は、保守性を高めながら将来の拡張に備えるための段階的工事計画です。

狙いは 2 つです。

1. 次に着手すべき点を毎回すぐ確認できるようにする
2. 「今どこまで進んだか」を docs 上で明確にする

## 現在の判断

今は、全面改修よりも段階移行が適切です。

理由:
- 既存機能はかなり実用レベルで動いている
- ここで大規模再編を急ぐと、逆に回帰のリスクが高い
- まず docs / controller / service / tests の足場を整える方が安全

## フェーズ一覧

### Phase 1: 足場固め

目標:
- 毎回の判断材料を明文化する
- 巨大統合地点を減らす準備をする

対象:
- docs 整備
- `app/api/chatgpt/route.ts` の service 抽出
- `app/page.tsx` / action hooks の controller 分離
- protocol / task / memory のテスト基盤検討

### Phase 2: 知識吸収基盤の一般化

目標:
- YouTube 以外にも広げられる ingest 構造を作る

対象:
- `IngestJob` / `IngestItem` の定義
- zip / local folder / Google Drive へ拡張可能な pipeline 設計
- progress UI

### Phase 3: 提案駆動ワークフローの型整理

目標:
- protocol proposal と execution budget の扱いを安定させる

対象:
- `ProtocolAction`
- `ExecutionBudget`
- approval workflow
- audit log

### Phase 4: 複数 Kin 協調の最小導入

目標:
- shared workspace の土台を作る

対象:
- `Workspace`
- `SharedArtifact`
- `HandoffRecord`
- 役割タグ

### Phase 5: Kin 主 UI / GPT バックオフィス化

目標:
- UX の主役を Kin に寄せる

対象:
- Kin workspace 中心 UI
- GPT を設定・監査・管理へ寄せる

## 進捗状況

### Phase 1

#### 1-1. docs 整備

Status: In progress

完了:
- `README.md` 更新
- `docs/architecture.md` 作成
- `docs/domain-model.md` 作成
- `docs/refactor-roadmap.md` 作成

残り:
- `docs/protocol-actions.md`
- `docs/ingest-pipeline.md`
- `docs/workspace-model.md`

#### 1-2. page / UI 側の薄化

Status: Partially done

完了済みの前進:
- `GptSettingsDrawer` の分割
- `ReceivedDocsDrawer` の clean 化
- `app/page.tsx` の一部 orchestration 分離

残り:
- `useChatAppController` か同等の上位 controller 設計
- `page.tsx` の panel props / top-level orchestration の更なる分離

#### 1-3. server route の service 抽出

Status: In progress

優先対象:
- [app/api/chatgpt/route.ts](../app/api/chatgpt/route.ts)

先に抜きたいもの:
- chat message build
- search request resolve
- OpenAI call wrapper
- usage parse

完了:
- OpenAI response 整形 helper を [lib/server/chatgpt/openaiResponse.ts](../lib/server/chatgpt/openaiResponse.ts) へ抽出
  - `extractUsage`
  - `extractJsonObjectText`
  - `extractResponseText`

次の一手:
- request body 正規化と mode 分岐前処理を service 側へ出す
- その次に search prompt / base system prompt の build を分離する

#### 1-4. テスト基盤

Status: Not started

最初の候補:
- protocol parser
- task intent parser
- multipart chunking
- YouTube URL handling
- progress counting principle

## 今の定点観測ポイント

次回の開発前にまず見るべきファイル:

- [app/api/chatgpt/route.ts](../app/api/chatgpt/route.ts)
- [lib/app/sendToGptFlow.ts](../lib/app/sendToGptFlow.ts)
- [hooks/useGptMemory.ts](../hooks/useGptMemory.ts)
- [lib/app/memoryInterpreter.ts](../lib/app/memoryInterpreter.ts)
- [hooks/useKinTaskProtocol.ts](../hooks/useKinTaskProtocol.ts)
- [lib/app/kinMultipart.ts](../lib/app/kinMultipart.ts)

## 次に着手すべき点

現時点でのおすすめ順は次です。

1. `app/api/chatgpt/route.ts` の service 抽出計画を作る
2. `route.ts` から最初の 1 区画だけを外へ出す
3. protocol / task / multipart の純粋関数テスト基盤を入れる

## 工事ルール

大きな工事は毎回、次の手順で進めます。

1. 触るファイルを先に共有する
2. 触らないファイルも明示する
3. 1 フェーズずつ止める
4. 型チェックを通す
5. roadmap を更新する

## 完了条件

この roadmap の役割は、工事を細かく区切り、毎回次の一手を明確にすることです。

そのため、次回以降も大きな設計判断や段階工事をしたら、このファイルの
- `進捗状況`
- `次に着手すべき点`
を必ず更新します。
