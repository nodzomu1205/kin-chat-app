# Architecture

## 目的

`kin-chat-app` は、Kin と GPT を組み合わせた作業支援ワークスペースです。単なるチャット UI ではなく、次のドメインが協調して動く構成を目指しています。

- conversation
- memory
- task orchestration
- protocol bridge
- search
- library
- ingest

この文書は、今の構造をどう理解し、どこをどう薄くしていくかを確認するための基準です。

## 現在の主要構造

### UI / orchestration

- [app/page.tsx](../app/page.tsx)
- [components/panels/gpt/GptSettingsSections.tsx](../components/panels/gpt/GptSettingsSections.tsx)
- [components/panels/gpt/ReceivedDocsDrawer.tsx](../components/panels/gpt/ReceivedDocsDrawer.tsx)

役割:
- top-level state
- panel coordination
- layout
- final props wiring

課題:
- orchestration がまだ厚い
- 今後 controller 化を進めたい

### App flows

- [lib/app/sendToGptFlow.ts](../lib/app/sendToGptFlow.ts)
- [lib/app/fileIngestFlow.ts](../lib/app/fileIngestFlow.ts)
- [lib/app/taskDraftActionFlows.ts](../lib/app/taskDraftActionFlows.ts)
- [lib/app/kinMultipart.ts](../lib/app/kinMultipart.ts)

役割:
- 対話送信
- protocol 応答
- 文書取り込み
- タスク整理
- multipart 組み立て

課題:
- `sendToGptFlow.ts` はまだ責務が多い
- flow ごとの service 分離余地が大きい

### Memory

- [hooks/useGptMemory.ts](../hooks/useGptMemory.ts)
- [lib/app/memoryInterpreter.ts](../lib/app/memoryInterpreter.ts)
- [lib/app/gptMemoryStateHelpers.ts](../lib/app/gptMemoryStateHelpers.ts)

役割:
- recent / facts / preferences / collections / context の整理
- deterministic 判定
- LLM fallback
- 承認候補からの再整理

課題:
- `memoryInterpreter.ts` が重くなりやすい
- 今後は `topic/goal`, `facts`, `entities/collections` に分けられるとよい

### Task / protocol runtime

- [hooks/useKinTaskProtocol.ts](../hooks/useKinTaskProtocol.ts)
- [lib/taskIntent.ts](../lib/taskIntent.ts)
- [lib/taskCompiler.ts](../lib/taskCompiler.ts)
- [lib/taskRuntimeProtocol.ts](../lib/taskRuntimeProtocol.ts)

役割:
- タスク意図抽出
- protocol prompt 生成
- 進捗管理
- protocol event parsing

課題:
- execution budget の型整理がまだ弱い
- 将来的には `ProtocolAction` / `ExecutionBudget` を明示したい

### Server routes

- [app/api/chatgpt/route.ts](../app/api/chatgpt/route.ts)
- [app/api/youtube-transcript/route.ts](../app/api/youtube-transcript/route.ts)
- [app/api/kindroid/route.ts](../app/api/kindroid/route.ts)

役割:
- request entrypoint
- OpenAI / SerpApi / Kindroid 接続

課題:
- `chatgpt/route.ts` はまだ厚い
- route は薄くし、service 層に寄せたい

## 現在の問題意識

### 1. 巨大統合地点

今も次のファイルは、変更の波及が大きいです。

- `app/page.tsx`
- `lib/app/sendToGptFlow.ts`
- `lib/app/memoryInterpreter.ts`
- `app/api/chatgpt/route.ts`

### 2. 多重 state write の再発リスク

以前の「バナナの皮」の多くは、同じ state を複数経路が直接更新していたことから起きました。今後も次を守る必要があります。

- state の source of truth を一つに寄せる
- provisional と persisted をずらさない
- protocol 表示と内部 state の優先順位を揃える

### 3. UI 主導ではなく domain 主導へ

今後の拡張は、画面単位で積むのではなく、domain ごとに controller / service / domain へ寄せる必要があります。

## 目指す段階移行

全面リネームはしません。既存構造を活かしながら、次の順で移行します。

### Phase 1

- docs 整備
- `route.ts` の service 抽出
- `page.tsx` と action hook の controller 分離

### Phase 2

- protocol / task / memory の型とテスト強化
- ingest pipeline の抽象を定義

### Phase 3

- shared workspace 導入
- 複数 Kin 協調の最小構造

## 今後の target structure

最終的には、次のような方向に寄せたいです。

```text
features/
  chat/
  kin/
  task/
  ingest/
  library/
  workspace/

lib/
  server/
  shared/
```

ただし今は、いきなり全面移行するより、
- docs
- controller
- server services
- tests
を先に整えるのが安全です。

## 次に着手すべき点

現在のおすすめ優先順位は次です。

1. `app/api/chatgpt/route.ts` の service 抽出
2. `app/page.tsx` の controller 化
3. protocol / task / memory の純粋関数テスト導入

この 3 つが、今後の機能追加を一番安定させます。
