# Next Session Handover

Updated: 2026-04-26

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
- `npm run lint`
- `npm test` (`166 files / 739 tests`)
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

Library / Kin protocol work is in a good implementation stopping state, with
one manual retest still recommended.

Implemented:

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

## Files To Review First Next Time

1. `docs/protocol-actions.md`
2. `docs/maintenance-checklist.md`
3. `lib/app/send-to-gpt/draftDocumentResolver.ts`
4. `lib/app/send-to-gpt/sendToGptPreparedGateHandlers.ts`
5. `lib/app/send-to-gpt/sendToGptProtocolBuilders.ts`
6. `lib/task/taskProtocolParser.ts`
7. `lib/app/kin-protocol/sendToKinFlow.ts`
8. `lib/app/kin-protocol/sendToKinFlowState.ts`
9. `lib/app/kin-protocol/kinMultipart.ts`
10. `lib/app/reference-library/libraryItemAggregation.ts`
11. `hooks/useProtocolAutomationEffects.ts`
12. `components/panels/gpt/LibraryDrawerControls.tsx`
13. `lib/app/memory-interpreter/memoryInterpreterFactExtraction.ts`
14. `lib/app/send-to-gpt/sendToGptFlow.ts`
15. `app/page.tsx`

## Verification Commands

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

