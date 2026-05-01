# Next Session Handover

Updated: 2026-05-01

## Latest Handoff

The newest active handoff is for PPT image-library asset routing:

- [`HANDOFF-2026-05-01.md`](./HANDOFF-2026-05-01.md)
- [`presentation-renderer/next-implementation-notes.md`](./presentation-renderer/next-implementation-notes.md)
- [`presentation-renderer/slide-frame-design-plan.md`](./presentation-renderer/slide-frame-design-plan.md)

If the next session is about PPT design or PPTX rendering, start with the
2026-05-01 handoff before touching code. The immediate next slice is to route
saved image-library assets into PPTX output:

1. add image dimensions to image payloads
2. extend `/ppt Images:` from boolean to `off / library / api / hybrid`
3. hydrate browser-side image assets before `/api/presentation-render`
4. resolve visuals by library match first, then API fallback when requested

Keep the frame-based slide JSON direction from the 2026-04-30 handoff. Do not
return to the older approach of generating natural-language slide specs first
and parsing them into JSON later.

## Stop Rule

Do not patch the first visible symptom.

For topic / task / memory / protocol regressions, trace the adopted value end to
end before changing code:

1. prompt sent to the LLM or Kin
2. raw reply
3. parsed protocol event or parsed memory candidate
4. every post-parse transform / resolver / gate
5. final value written to UI, memory, task state, or library card

If only part of that path was inspected, record it as partial verification. Do
not call a path removed or fixed from a nearby helper read alone.

## Session Close Status

Closeout verification passed:

- `npx tsc --noEmit`
- `npm run check:utf8`
- `npm run lint`
- `npm test` (`167 files / 753 tests`)
- `npm run build`

The repository is in `late-stage maintenance-watch`, not active rescue.

Stable enough to avoid broad refactor by default:

- task-intent fallback uses a fixed-slot JSON schema
- approved wording compiles directly into `CONSTRAINTS`
- task progress derives from `CONSTRAINTS`
- send-to-GPT request/finalize/gate boundaries are split and should stay
  orchestration-oriented
- page/controller/panel composition is in regrowth-watch, not active teardown

## Latest Implemented Slice

Task registration / Kin scheduling work is in a good implementation stopping
state, with one live mobile-open recurrence test still recommended.

Implemented:

- Kin tab task actions are separated:
  - response share and task share both send `SYS_INFO`
  - task registration creates a registration draft instead of mutating task
    formation or Kin input
  - the unused response receive action has been removed from the UI/action path
- Task tab now has a task-registration subtab:
  - multiple registered tasks
  - start / edit / delete
  - new registration / overwrite save / cancel
  - draft and settings panels are hidden when no registration draft is active
  - registered task rows show single/repeat summary
- Registered task start behavior:
  - pressing start sets the registered `SYS_TASK` into Kin input
  - progress runtime starts only after that `SYS_TASK` is actually sent to Kin
  - runtime startup matches by `TASK_ID`
- Recurrence scheduling:
  - app-open browser scheduler checks registered repeat tasks every 30 seconds
  - when due, it sets the task into Kin input
  - existing auto-send Kin SYS input can send it onward if enabled
  - mobile background execution is not guaranteed and is intentionally out of
    scope for this first scheduler
- Task-time library settings:
  - stored per registered task
  - applied only after the registered `SYS_TASK` is actually sent to Kin
  - previous library reference settings are restored when the active task
    reaches `completed`
- `SYS_TASK_PROPOSAL`:
  - parsed from Kin replies
  - converted into the same registration draft path as the user-facing task
    registration button
  - ignored by task-progress runtime ingestion so proposals do not start tasks
- Protocol rulebook now tells Kin to use `SYS_TASK_PROPOSAL` for task ideas and
  wait for user approval followed by `SYS_TASK`
- Task sharing now sends full task-formation content as `SYS_INFO`; it no
  longer auto-summarizes to only overview/key points
- collapsible library operation area with compact bulk display / bulk Kin-send
- shared library aggregation for `Index`, `Summary`, and `Summary + Detail`
- ordinary library sends use `SYS_INFO`
- task-time library requests use `SYS_LIBRARY_DATA_REQUEST / RESPONSE`
- retired `LIBRARY_INDEX/ITEM` and `FILE_SAVE` blocks are no longer active
  parser inputs
- Draft Preparation, Draft Modification, and File Saving protocols are wired
- File Saving uses generated library summaries and validates active length
  constraints before saving
- latest-draft resolution tolerates `DOCUMENT_ID: Unknown` and blank
  `DOCUMENT_ID` in full modification responses
- Kin communication retry SYS input can auto-send again after the input was
  cleared
- memory fact extraction now picks fairly from meaningful chat-visible content
  and filters system/noise messages

## First Manual Retest

Start the next live Kin test here:

1. create a registered repeat task one or two minutes in the future
2. keep the app open on the phone
3. confirm the scheduler sets the task into Kin input at the scheduled minute
4. with `autoSendKinSysInput` enabled, confirm the SYS task is actually sent to
   Kin
5. confirm the task-progress tab starts only after send, not merely after Kin
   input is populated
6. confirm task-time library reference settings apply after send and restore
   after completion

Then run the existing draft/file-saving live test:

1. run a task that creates a draft
2. trigger `DRAFT_MODIFICATION`
3. force or observe a length failure if possible
4. request another modification and resubmission
5. trigger `FILE_SAVING`
6. confirm the saved library card has a generated summary and real
   `DOCUMENT_ID`
7. confirm `SYS_TASK_DONE` reports the same document id

If it fails, trace this order before patching:

1. GPT prompt for the protocol response
2. raw GPT response
3. parsed event from `taskProtocolParser.ts`
4. `draftDocumentResolver.ts`
5. `sendToGptPreparedGateHandlers.ts`
6. resulting library card / task done output

## Current Watch Items

- Keep protocol/task-payload `responseMode` naming under watch. Do not confuse
  it with the removed UI/settings reasoning-mode path.
- Keep ingest authority and ingest token accounting under watch when new
  ingest-adjacent behavior is added.
- Keep `sendToGptFlow.ts` orchestration-only; new policy should live in the
  focused request/gate/finalize helpers.
- Keep page/controller/panel composition from regrowing no-op pass-through glue.
- Keep old `SYS_LIBRARY_INDEX/ITEM` and `SYS_FILE_SAVE` aliases retired unless a
  real migration need appears.
- Keep draft/file-saving resolution centralized in `draftDocumentResolver.ts`
  and `sendToGptPreparedGateHandlers.ts`; do not add a second local latest-draft
  heuristic near UI code.

## Completed Product Slice: Task Registration Workspace

The task-registration workflow below has been implemented. Keep it as the
authority summary for future maintenance; do not treat the implementation order
as pending work unless a regression is found.

This workflow separates task drafting, task sharing, and response sharing.

### 1. GPT Kin Tab Button Changes

Remove the existing `レス受信` button and delete the feature path behind it. It
has not been used and should not remain as hidden UI or dead action glue.

Add a new `タスク登録` button in that location.

Expected behavior:

- The user writes a natural-language task instruction in the GPT input area.
- Pressing `タスク登録` should shape that instruction into the same kind of
  `SYS_TASK` draft currently produced by the old `タスク送信` route.
- The output target is not the Kin send input. It should populate the new Task
  tab subtab `タスク登録` as an editable draft.
- Existing automatic constraint/protocol selection behavior should be preserved.
- Newly detected constraint patterns should still go through the approval flow
  and update approved patterns after user approval.
- When a new draft is created, the Task tab should flash/blink to notify the
  user.

Rename the current `タスク送信` button to `タスク共有`.

New `タスク共有` meaning:

- It is dedicated to sharing the currently selected/formed task from the Task
  tab to Kin as `SYS_INFO`.
- It should reproduce the current `INFO:` prefixed behavior without requiring
  the user to type the prefix.
- If GPT input contains text, treat it as user instruction for the SYS_INFO
  share, such as "only share X" or "write it in English".
- If GPT input is empty, share the current task content as-is.

Rename `レス送信` to `レス共有`.

New `レス共有` meaning:

- Keep the existing response-sharing behavior.
- Treat GPT input text as user instruction for the share.

### 2. Task Tab: New `タスク登録` Subtab

Add a new subtab between `タスク形成` and `タスク進捗`:

```text
タスク形成 / タスク登録 / タスク進捗
```

The new `タスク登録` subtab should contain:

1. Registered task list at the top
2. Large SYS task draft editor
3. Task-time library reference settings
4. Recurrence settings
5. `この内容で登録` button at the bottom

#### SYS Task Draft Editor

The draft editor should display the shaped SYS task text created by the Kin tab
`タスク登録` button or by `SYS_TASK_PROPOSAL`.

This should be a relocation of the old direct-to-Kin SYS task draft path, not a
second task compiler. Keep the existing constraint/protocol selection authority
and approval flow.

#### Task-Time Library Reference Settings

Add task-specific library reference settings below the SYS draft editor:

- library reference enabled/disabled
- reference mode: `summary only` / `summary + excerpt`
- library reference count

These settings apply only while the registered task is active:

- start applying when the user presses `開始`
- remain active while Kin is executing the task
- restore the pre-task library settings after the task is fully complete
- task completion means `<<SYS_TASK_DONE>>` is received and GPT accepts it after
  length-constraint validation

Clarify existing library setting wording:

- Rename the ambiguous library `index` count setting to
  `ライブラリカード上限数`.
- Define it as the maximum number of library cards retained/registered in the
  app, not the number of items shown when requesting an index.
- The new task-registration subtab does not need UI for that maximum.
- If task-time library reference count exceeds the current library-card maximum,
  automatically raise the maximum to match the task-time count.

Implementation note:

- Preserve the user's previous library settings and restore them after task
  completion.
- Keep temporary task-time overrides separate from persisted library settings
  until `開始` is pressed.

#### Recurrence Settings

Add a recurrence panel below the library settings:

- mode: `単発` / `反復`
- if `反復`, allow weekday checkboxes from Monday through Sunday
- allow one or more send times via a `+` button

Open implementation question:

- Browser-only scheduling is reliable only while the app page is open.
- Mobile background execution is likely not reliable without platform support
  such as push/service-worker/background-sync constraints, and should be
  confirmed before promising background recurrence.
- First implementation should likely treat recurrence as "active while app is
  open" unless a dedicated background delivery mechanism is designed.

#### Register / Start / Edit

At the bottom of the subtab, add `この内容で登録`.

When pressed:

- Add the current draft/settings to the registered task list at the top.
- Show each registered task with:
  - original user instruction
  - registration timestamp
  - `開始` button
  - `編集` button

`開始` behavior:

- Send the registered SYS task format to the Kin send input.
- Activate task-time library reference overrides.

`編集` behavior:

- Load the registered task back into the draft editor and settings panels.

### 3. New Kin Protocol: `SYS_TASK_PROPOSAL`

Add a Kin-to-GPT proposal protocol:

```text
<<SYS_TASK_PROPOSAL>>
GOAL: 2000文字程度で事業計画の最新版を作ります。ライブラリデータ参照1回。検索5回迄、GPTへの依頼3回迄。
<<END_SYS_TASK_PROPOSAL>>
```

Expected behavior:

- GPT detects this block from Kin-side messages.
- The proposal is converted into the same task-registration draft path used by
  the user-facing `タスク登録` button.
- The Task tab flashes/blinks.
- The user reviews the draft, library reference settings, and recurrence
  settings.
- The user registers it, then presses `開始` when ready.

Do not let `SYS_TASK_PROPOSAL` start execution automatically.

### Suggested Implementation Order

1. Rename/remove Kin tab actions at the UI/action type boundary:
   - delete `レス受信`
   - rename `レス送信` to `レス共有`
   - rename old task sharing button path to `タスク共有`
   - add `タスク登録`
2. Extract the current "natural language -> SYS task draft" behavior into a
   reusable task-registration draft builder/flow.
3. Add Task tab subtab state and render the draft editor.
4. Add registered task list and register/edit/start actions.
5. Add task-time library reference override state with restore-on-completion.
6. Add recurrence model/UI, but initially document runtime as app-open only
   unless background delivery is explicitly designed.
7. Add `SYS_TASK_PROPOSAL` parser/runtime event and route it into the same draft
   registration flow.
8. Update docs/tests around the renamed library-card maximum wording.

### Maintenance To Do During This Slice

- Keep task-registration draft state separate from active task runtime state.
  Registered-but-not-started tasks should not mutate current task runtime.
- Avoid adding another SYS task compiler. Reuse or extract the existing task
  compiler/protocol-selection path.
- Keep Kin input mutation in Kin transfer/injection helpers, not in Task tab
  rendering components.
- Keep the temporary library-reference override as a scoped task runtime overlay,
  not as a direct mutation of persisted settings at draft time.
- Add focused tests for:
  - `SYS_TASK_PROPOSAL` parsing
  - task draft creation from user natural language
  - `タスク共有` with and without user instruction
  - task-time library settings restore after accepted `SYS_TASK_DONE`
  - recurrence model validation for weekdays/times
- Consider adding a small action-name compatibility map only if old labels are
  still referenced in tests. Do not keep dead `レス受信` behavior.

## Files To Review First Next Time

1. `docs/protocol-actions.md`
2. `docs/maintenance-checklist.md`
3. `components/panels/gpt/GptSettingsWorkspaceViews.tsx`
4. `components/panels/gpt/gptPanelTypes.ts`
5. `hooks/chatPageActionTypes.ts`
6. `hooks/chatPageControllerArgBuilders.ts`
7. `hooks/useGptMessageActions.ts`
8. `hooks/useKinTaskProtocol.ts`
9. `hooks/useTaskProtocolActions.ts`
10. `lib/task/taskCompilerSections.ts`
11. `lib/task/taskProtocolParser.ts`
12. `lib/app/task-runtime/currentTaskIntentRefresh.ts`
13. `lib/app/task-support/kinTaskInjection.ts`
14. `lib/app/task-runtime/kinTransferFlows.ts`
15. `lib/app/kin-protocol/sendToKinFlow.ts`
16. `lib/app/kin-protocol/sendToKinFlowState.ts`
17. `lib/app/kin-protocol/kinMultipart.ts`
18. `lib/app/send-to-gpt/sendToGptProtocolBuilders.ts`
19. `lib/app/send-to-gpt/sendToGptPreparedGateHandlers.ts`
20. `app/page.tsx`

## Verification Commands

```bash
npm run check:utf8
```

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```
