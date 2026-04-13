# Domain Model

この文書は、repo にすでに存在している主要概念を、今後の保守と拡張のために整理したものです。

## Core actors

### User

アプリの利用者です。Kin との会話、GPT バックオフィスの設定、承認、タスク投入を行います。

### Kin

主にユーザー対話の前面に立つ actor です。

主な役割:
- 対話
- task execution
- progress reporting
- GPT への protocol request

### GPT

主にバックオフィス側の actor です。

主な役割:
- memory interpretation
- search
- library management
- transcript fetching
- protocol response
- task compilation support

## Core domains

### Conversation

通常の会話ログと、その周辺の表示・送信フローです。

主な関係ファイル:
- [app/page.tsx](../app/page.tsx)
- [lib/app/sendToGptFlow.ts](../lib/app/sendToGptFlow.ts)

### Memory

GPT 側の短期作業記憶です。

主な構成:
- `recentMessages`
- `facts`
- `preferences`
- `lists`
- `context`

主な関係ファイル:
- [hooks/useGptMemory.ts](../hooks/useGptMemory.ts)
- [lib/app/memoryInterpreter.ts](../lib/app/memoryInterpreter.ts)
- [lib/app/gptMemoryStateHelpers.ts](../lib/app/gptMemoryStateHelpers.ts)

### Task

Kin に渡す構造化タスクと、その進捗・制約・成果条件です。

主な構成:
- `TaskIntent`
- compiled task prompt
- `requirementProgress`
- `pendingRequests`
- `protocolLog`

主な関係ファイル:
- [lib/taskIntent.ts](../lib/taskIntent.ts)
- [lib/taskCompiler.ts](../lib/taskCompiler.ts)
- [hooks/useKinTaskProtocol.ts](../hooks/useKinTaskProtocol.ts)

### Protocol

Kin と GPT の間でやり取りする構造化 block です。

代表 block:
- `SYS_TASK`
- `SYS_TASK_PROGRESS`
- `SYS_SEARCH_REQUEST / RESPONSE`
- `SYS_YOUTUBE_TRANSCRIPT_REQUEST / RESPONSE`
- `SYS_GPT_RESPONSE`
- `SYS_INFO`

主な関係ファイル:
- [lib/taskRuntimeProtocol.ts](../lib/taskRuntimeProtocol.ts)
- [lib/app/kinProtocolDefaults.ts](../lib/app/kinProtocolDefaults.ts)
- [lib/app/kinMultipart.ts](../lib/app/kinMultipart.ts)

### Search

GPT 側の検索実行と結果正規化です。

主な構成:
- search engine
- search mode
- raw result
- summarized response
- source cards

主な関係ファイル:
- [lib/app/sendToGptFlow.ts](../lib/app/sendToGptFlow.ts)
- [lib/app/sendToGptFlowHelpers.ts](../lib/app/sendToGptFlowHelpers.ts)
- [lib/search-domain/](../lib/search-domain)

### Library

検索結果、文書、transcript、Kin 注入素材などを一つの参照資産として扱う層です。

主な関係ファイル:
- [hooks/useReferenceLibrary.ts](../hooks/useReferenceLibrary.ts)
- [hooks/useStoredDocuments.ts](../hooks/useStoredDocuments.ts)

### Ingest

外部情報を取り込み、保存し、必要なら Kin / GPT に注入する流れです。

現在の source:
- file ingest
- YouTube transcript

今後の候補:
- zip
- local folder
- Google Drive folder

主な関係ファイル:
- [lib/app/fileIngestFlow.ts](../lib/app/fileIngestFlow.ts)
- [app/api/youtube-transcript/route.ts](../app/api/youtube-transcript/route.ts)

## Current source of truth

今の repo では、少なくとも次の source of truth を毎回意識する必要があります。

### Memory interpretation

- [lib/app/memoryInterpreter.ts](../lib/app/memoryInterpreter.ts)

### Memory persistence / merge

- [hooks/useGptMemory.ts](../hooks/useGptMemory.ts)

### Task progress counting

- [hooks/useKinTaskProtocol.ts](../hooks/useKinTaskProtocol.ts)

### Multipart protocol delivery

- [lib/app/kinMultipart.ts](../lib/app/kinMultipart.ts)

## Progress counting principle

この repo では、進捗カウントは次の原則に揃えていきます。

### 成功時 / 完了時に加算するもの

- `ask_gpt`
- `search_request`
- `youtube_transcript_request`
- `library_reference`
- `finalize`

### 依頼成立時に加算するもの

- `ask_user`
- `request_material`

意図:
- 外部取得や実行系は、request だけで加算すると retry や失敗でぶれやすい
- 人への問い合わせは、「依頼したこと」自体に意味がある

## 今後、明示したい概念

今はまだコード上で完全には独立していませんが、今後は次の概念を型として育てたいです。

- `ProtocolAction`
- `ExecutionBudget`
- `IngestJob`
- `IngestItem`
- `Workspace`
- `SharedArtifact`
- `HandoffRecord`

## この文書の使い方

新しい大きな機能を入れる前に、まず次を決めます。

1. これはどの domain に属するか
2. source of truth はどこか
3. 既存 domain に追加するか、新しい概念として切り出すか
4. docs も一緒に更新すべきか

この確認を先に入れるだけで、バナナの皮をかなり減らせます。
