# kin-chat-app

Kin と GPT を組み合わせて、会話、検索、記憶、ライブラリ、タスク遂行、知識注入を一つのワークスペースとして扱うアプリです。

現時点では、ユーザー体験としては「Kin と会話しながら、GPT を検索・整理・監査・注入のバックオフィスとして使う」形が中核です。今後はさらに Kin 主体のワークスペースへ寄せ、複数 Kin 協調や知識吸収パイプラインの強化を見据えています。

## 現在の位置づけ

- Kin
  - 主にユーザーとの対話、感情表現、タスク実行主体
- GPT
  - 主に検索、要約、メモリ整理、ライブラリ管理、プロトコル処理、監査
- SYS protocol
  - Kin と GPT の間で構造化メッセージをやり取りする橋渡し

## 現在の主要機能

- 通常チャット
- GPT メモリ管理
  - deterministic 判定
  - LLM fallback
  - 承認候補による即時再整理
- 検索
  - `google_search`
  - `google_ai_mode`
  - `google_news`
  - `google_local`
  - `youtube_search`
- ライブラリ
  - 検索結果、文書、YouTube transcript、Kin 向け注入素材の統合参照
- タスク実行支援
  - `SYS_TASK`
  - `SYS_TASK_PROGRESS`
  - `SYS_SEARCH_REQUEST / RESPONSE`
  - `SYS_YOUTUBE_TRANSCRIPT_REQUEST / RESPONSE`
  - `SYS_GPT_RESPONSE`
  - `SYS_INFO`
- YouTube workflow
  - 動画検索
  - transcript 取得
  - transcript のクリーニング
  - ライブラリ保存
  - Kin 送付
- multipart protocol delivery
  - 長い `SYS_TASK` / `SYS_INFO` / transcript の分割送受信

## 設計思想

このプロジェクトは、短期的に機能を足すだけではなく、将来の拡張に耐える構造へ徐々に寄せる方針です。

基本原則は次の通りです。

1. UI とドメイン制御を分ける
2. 画面単位ではなく、`memory / task / protocol / ingest / search / library` の境界で考える
3. 同じ state を複数経路から直接触らない
4. 新機能は `page.tsx` や巨大 `route.ts` へ直書きしない
5. 新しい重要概念を入れる時は docs も同時に更新する
6. 大きい工事は段階移行で行い、毎回変更範囲を明示する

## 今後の大きな方向性

- Kin 主 UI / GPT バックオフィス化
- Knowledge Ingest Pipeline の一般化
  - YouTube
  - Zip
  - ローカルフォルダ
  - Google Drive
- Protocol Action と Execution Budget の型安全化
- 複数 Kin 協調のための Shared Workspace 導入

## 毎回見るべき docs

- [Architecture](./docs/architecture.md)
- [Domain Model](./docs/domain-model.md)
- [Refactor Roadmap](./docs/refactor-roadmap.md)
- [Architecture Guidelines](./docs/architecture-guidelines.md)
- [Handoff 2026-04-11](./docs/HANDOFF-2026-04-11.md)

## 毎回の開発前チェック

次の変更に入る前に、まず以下を確認する運用を推奨します。

1. [docs/refactor-roadmap.md](./docs/refactor-roadmap.md) の現在地
2. 今回触るファイルと触らないファイル
3. 次の定点観測ポイント
   - [app/api/chatgpt/route.ts](./app/api/chatgpt/route.ts)
   - [lib/app/sendToGptFlow.ts](./lib/app/sendToGptFlow.ts)
   - [hooks/useGptMemory.ts](./hooks/useGptMemory.ts)
   - [lib/app/memoryInterpreter.ts](./lib/app/memoryInterpreter.ts)
   - [hooks/useKinTaskProtocol.ts](./hooks/useKinTaskProtocol.ts)
4. 変更後の最低確認
   - `npx tsc --noEmit`
   - 関連機能の軽い手動確認
   - roadmap の進捗更新

## 現在の工事方針

全面改修は行わず、次の順で段階的に進めます。

1. docs と設計メモを整える
2. `app/api/chatgpt/route.ts` の server service 抽出
3. `app/page.tsx` と action hook の controller 分離
4. protocol / task / memory のテスト基盤を整える
5. ingest pipeline の job / progress モデルへ進む

## 開発コマンド

```bash
npm run dev
```

```bash
npx tsc --noEmit
```

## 補足

この README は、今後の実装方針と現在地を毎回すぐ確認できる入口として使います。大きな設計判断をした時は、README ではなく `docs/` を更新し、README から辿れるようにします。
