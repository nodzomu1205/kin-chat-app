# Next Session Handover

Updated: 2026-05-28

## Latest Handoff

The newest active record is the 2026-05-28 compact transfer / GPT reply
translation closeout. Start there for the Kin/GPT compact curved-arrow transfer
buttons, GPT chat-tab `EN/RU/JP` reply-translation split button, the
`translate_reply_*` instruction modes, or the `解説` -> `返信案を作りますか？`
follow-up behavior that builds from extracted `[原文]` plus the user's latest
instruction, without passing the prior translation/explanation text as reply
context. Reply-draft prompts also assume the source speaker is a woman and the
replying user is a man:

- [`HANDOFF-2026-05-28.md`](./HANDOFF-2026-05-28.md)

The 2026-05-27 Kin/GPT settings UI closeout remains the entry point for
Kin drawer tab behavior, compact Kin list cards, GPT library settings
layout, DB candidate chunk limit `0` behavior, or the Kin outgoing message
limit change to 500 characters / 400-500 character parts:

- [`HANDOFF-2026-05-27.md`](./HANDOFF-2026-05-27.md)

The 2026-05-24 multi-recipient Kin send closeout remains the entry point for
normal/SYS_INFO sends to multiple Kin, multipart SYS_INFO fanout, recent
chat-window context for ordinary and Kin-to-Kin sends, task-execution Kin
routing, or the Kin drawer `送信対象` / `タスク実行` controls:

- [`HANDOFF-2026-05-24.md`](./HANDOFF-2026-05-24.md)

The 2026-05-22 Kin-to-Kin facilitator-led group chat closeout remains the entry
point for three-or-more Kin chat, facilitator routing, invalid route retry
handling, or Kin-to-Kin participant selection UI:

- [`HANDOFF-2026-05-22.md`](./HANDOFF-2026-05-22.md)

Use the 2026-05-21 Kin-to-Kin chat / DB chunk pagination closeout for the
original two-Kin relay implementation, Kin speaker-label display, DB
chunk-count regressions, or Library DB panel React style warnings:

- [`HANDOFF-2026-05-21.md`](./HANDOFF-2026-05-21.md)

For website crawling, source-card website actions, linked PDF/file discovery,
page-text extraction, or saved website-map library display work, use the
2026-05-14 Website Map / Site Contents MVP closeout:

- [`HANDOFF-2026-05-14.md`](./HANDOFF-2026-05-14.md)

The 2026-05-12 Library DB / RAG closeout remains the entry point only if the
user explicitly reopens DB, RAG, deduplication, compaction, or DB organization
work:

- [`HANDOFF-2026-05-12.md`](./HANDOFF-2026-05-12.md)
- [`library-rag-mvp.md`](./library-rag-mvp.md)

For PPT work, use the 2026-05-10 PPT / library maintenance closeout:

- [`HANDOFF-2026-05-10.md`](./HANDOFF-2026-05-10.md)
- [`presentation-renderer/development-session-checklist.md`](./presentation-renderer/development-session-checklist.md)
- [`presentation-renderer/two-stage-visual-workflow-checklist.md`](./presentation-renderer/two-stage-visual-workflow-checklist.md)
- [`presentation-renderer/next-implementation-notes.md`](./presentation-renderer/next-implementation-notes.md)
- [`HANDOFF-2026-05-03.md`](./HANDOFF-2026-05-03.md)
- [`HANDOFF-2026-05-01.md`](./HANDOFF-2026-05-01.md)
- [`presentation-renderer/slide-frame-design-plan.md`](./presentation-renderer/slide-frame-design-plan.md)

## Current Next Start

Current newest product slice is Kin/GPT settings UI cleanup:

1. The Kin panel exposes `Kin間チャット` as a hanging header tab.
2. Kin list / connection / Kin-to-Kin drawers are mutually exclusive.
3. The Kin-to-Kin drawer fits mobile width without horizontal scrolling.
4. Kin list cards are compact: Kin ID is on the `送信対象` row, and the display
   name editor sits on the Kin name/action row.
5. GPT library settings show direct reference plus capacity first, then image
   library reference, then DB reference.
6. Redundant panel titles and gray explanatory copy were removed from the GPT
   library settings panels.
7. Settings UI labels use `DB参照` rather than `RAG参照`.
8. `DB参照 検索候補チャンク上限` accepts and persists `0`; at runtime `0` skips DB
   candidate search with `candidate_count_zero` instead of being rounded to `1`.

9. Kin-facing protocol prompts, compiled `SYS_TASK` delivery limits, and
   automatic resend guidance now share the 500-character outgoing-message
   limit and 400-500 character split range from `lib/shared/kinMessageLimits.ts`.
10. GPT chat toolbar labels changed from `翻訳` to `解説` and from `返信のみ` to
    `返信案`. The old `整える` button and `polish` instruction mode were removed.
11. The `解説` flow now outputs `[原文]`, `[日本語訳]`, `[解説]`, then asks
    `返信案を作りますか？`. Affirmative follow-ups create a reply draft in the same
    language as `[原文]` and skip DB/RAG plus direct library reference injection
    for speed.

Manual retest should open Kin list, connection, and Kin-to-Kin chat in sequence
and confirm only one drawer is expanded. On mobile, confirm Kin-to-Kin controls
fit without horizontal scrolling. In GPT library settings, confirm the panel
order and compact copy, then set `DB参照 検索候補チャンク上限` to blank/`0` and
confirm it remains `0` after leaving and reopening settings. Also use the GPT
chat `解説` button on an English message, answer `はい。短く回答して下さい。`, and
confirm the reply draft is English and returns without DB/reference delay.

Previous product slice was multi-recipient Kin send:

1. The Kin list separates `送信対象` from `タスク実行`.
2. Normal messages and `SYS_INFO` go to all selected `送信対象` Kin.
3. `ALL` toggles all send targets on/off.
4. Multi-recipient user messages display once in chat, while Kin replies retain
   per-Kin speaker labels.
5. Multipart `SYS_INFO` sends each PART to every selected Kin and advances only
   after every target returns a receipt. `Received.` and `Received. Send the
   next.` are both accepted.
6. Multipart fanout sends are sequenced across targets to avoid external API
   concurrency drops.
7. Task protocol sends route only to the single `タスク実行` Kin. This includes
   `SYS_TASK`, `SYS_TASK_CONFIRM`, `SYS_USER_RESPONSE`, and GPT/search/library/
   transcript/draft/PPT/file-saving response blocks.
8. Kin-to-Kin chat ignores normal send target selection and continues using its
   own drawer-selected direct-send route.
9. The Kin-to-Kin drawer `Context` input controls recent chat-window context for
   ordinary Kin composer sends and Kin-to-Kin start/relay/retry/final notices.
   Relay sends remove the duplicated `Incoming message` from context before
   taking N earlier messages.

Manual retest should use at least three Kin profiles. Select all as
`送信対象`, send a normal message, send a multi-part `SYS_INFO`, and confirm one
user bubble, one reply per Kin, and PART advancement only after all selected Kin
reply. Then set one `タスク実行` Kin and confirm a task response block only goes
to that Kin. Also set `Context` above zero, send an ordinary Kin message, and
start a Kin-to-Kin chat. Confirm the outgoing API payload includes context while
visible user bubbles stay clean, and confirm relay context does not duplicate
the separate `Incoming message`.

Current newest product slice is Kin-to-Kin facilitator-led group chat:

1. The Kin-to-Kin drawer supports one or more selected participant Kin profiles.
2. One selected participant keeps the original two-Kin alternating relay.
3. Two or more selected participants use group mode.
4. Group mode sends the initial request only to the starter Kin.
5. The starter Kin acts as facilitator and chooses the next participant through
   the existing `<<SYS_[Facilitator]_TO_[Participant]_CHAT>>` format.
6. Participants reply only to the facilitator with
   `<<SYS_[Participant]_TO_[Facilitator]_CHAT>>`.
7. The app validates route shape and participant names before relaying.
8. Invalid routes are retried with a short English system notice to the same
   Kin, with retry count capped to avoid infinite correction loops.
9. The facilitator can end group chat early by including `**END THE CHAT**` in
   the message body; participants cannot end the session with that token.
10. The drawer UI is now compact: participant chips stay inside a small
    scrollable grid and PC controls no longer stretch across the full width.

Manual retest should start with three Kin profiles and a low max count such as
`3` or `4`. Confirm only the starter receives the initial prompt, the starter
selects a participant, participants reply to the starter, and invalid direct
participant-to-participant output is retried rather than relayed. Also confirm
that the facilitator can end the session with `**END THE CHAT**`.

Live note: the three-or-more Kin group chat was tested successfully. Follow-up
fixes on 2026-05-23 added the missing one-to-one starter `**END THE CHAT**`
notice and changed `**END THE CHAT**` completion to use a distinct
ended-by-starter notice instead of the max-count notice. The detector also
accepts the common typo `**(END THE CHAT)**`.

Previous product slice was Kin-to-Kin chat v1:

1. The Kin panel exposes `Kin間チャット`.
2. v1 is intentionally two-Kin only.
3. The app alternates API sends between the selected starter Kin and partner
   Kin; it does not require simultaneous Kindroid connections.
4. The app owns max-count enforcement, transcript display, stop/reset controls,
   and final `SYS_INFO` notices to both Kin profiles.
5. Optional completion summary sends the transcript to GPT as a summary request.
6. Kin reply bubbles now store/display the active Kin label through
   `Message.meta.speakerLabel`.

Manual retest should start with a low max count such as `2` or `3`. Confirm the
numeric max-count input accepts editing from the default `50`, the transcript
increments, both Kin labels are visible, and the final notices are sent at the
configured limit.

DB/RAG watch update: DB document chunk loading now pages through
`rag_document_chunks` in 1000-row pages until exhausted. This avoids the
Supabase/PostgREST default response cap acting as a hidden total chunk cap for
DB tab chunk counts, duplicate detection, organization, and compaction.

Current default next work is no longer DB organization. The DB/RAG slice is in
maintenance-watch after the organization workflow, full DB-card listing, and DB
reference log cleanup.

The latest product slice is Website Map / Site Contents. It is now a one-page
at-a-time, inspectable MVP, with the main `Website Map` command acting as the
combined site report:

1. `Website Map: <url>` displays the readable map, extracted main text/images,
   and linked files together in chat.
2. `Save Site Map: <url>` saves that combined site report to the library.
3. `Get Site Contents: <url>` remains as a direct compatibility command for
   extracted main text and page images.
4. `Download File: <url>` remains as a direct compatibility command for linked
   files.
5. `Download and Read File: <url>` imports a linked file through file ingest;
   user-facing links are labeled `Read and save`.
6. Manual URL/search/news cards expose `サイトマップ表示`.
7. YouTube cards intentionally do not expose website actions.

Current action-menu note: manual URL/search/news cards now expose one Website
Map action because the Website Map result includes page contents and linked
files.

DB reference guard note: local command/system actions should not trigger the
automatic DB reference lookup unless they are generative requests where library
context is useful. Covered local actions include Website Map / URL shortcuts,
pure inline search, task directive-only updates, image commands, `/task` /
`/edit`, action-only SYS blocks, and PPT save/render/visual-resolution commands.

Do not broaden this into automatic deep crawling by default. The current UX is
manual, one page per command, and safe against never-ending loading.

The 2026-05-12 DB/RAG closeout started from:

- DB deletion working
- exact duplicate detection working
- semantic similar-chunk RPC implemented
- non-destructive DB compaction implemented
- pure SerpAPI inline search skipping DB reference
- live observation that automatic semantic near-duplicate detection still did
  not surface useful candidates from the current data

Completed since that closeout:

1. DB category/theme/entity extraction is available through the DB organization
   workflow.
2. DB organization groups can be reviewed from the DB tab.
3. User-selected DB documents can be rebuilt into a RAG-optimized DB document.
4. DB cards now load without the old 50-document display cap, so organization
   targets are not accidentally limited by the first page of results.
5. DB duplicate and organization candidate displays no longer hide actionable
   candidates behind local display caps.

DB follow-up should now be narrow regression work only unless the user
explicitly reopens the DB/RAG product slice. Do not start by tuning the
semantic-similarity threshold alone.

## PPT / Library Prior Context

The 2026-05-10 closeout ended with a clean worktree after:

- restoring PPT presentation-plan library export/import pairing
- restoring search-card summary/context persistence
- repairing selected-image render parity between library `[PPT]` and Resolve
  `Save and create PPT`
- stabilizing sparse PPT plan output through upstream validation/completion
- syncing library-card edits back into presentation-plan JSON for opening slide
  title, visual prompts, visual labels, and intentional visual-label deletion
- ensuring library show display, JSON, frameSpec, and PPTX output all observe
  the same edited visual-label state
- splitting several PPT helper files into smaller boundaries

Default next action:

1. If the user reports a live regression, trace the exact projection boundary:
   library text, structured JSON, chat display, frameSpec, or renderer.
2. If continuing maintenance, choose one small PPT file/helper family and run
   focused tests before committing.
3. Do not start with broad prompt rewrites or renderer fallback changes.

The current PPT creation path is the two-stage visual workflow:

1. Stage 1 creates an editable PPT design with visual prompts and in-image
   labels, without premature image selection.
2. Stage 2 resolves visual blocks for body slides and `visualTitleCover` through
   explicit image-library selection.
3. PPTX rendering hydrates selected image bytes at render time only.
4. Unresolved visuals remain valid placeholders.

The 2026-05-07 closeout confirmed this behavior in live testing:

- Stage 1 design output is usable.
- `Save` updates the existing library card.
- `Resolve visual blocks` works for body visuals and opening title visuals.
- Selected images remain visible in design/resolve views.
- `Save` preserves selected opening/body image data.
- Library display and `[PPT]` paths use selected images correctly.
- Image-free placeholder PPTX and resolved-image PPTX are both useful.

The 2026-05-08 recovery pass added these current invariants:

- `/ppt Document ID + comment` updates a saved PPT design without losing
  canonical `slideFrames`; if the LLM update result lacks usable `slideFrames`,
  the saved design is preserved and no overwrite occurs.
- Reopening Resolve visuals after all opening/body visual slots are selected
  must not call the visual-normalization LLM or consume task tokens; it only
  displays current selections.
- Visual selection is slot-scoped. One selected slot in a multi-slot block must
  not duplicate the selected image into sibling slots.
- Visual label edits made through `/ppt Document ID + comment` preserve selected
  image IDs but rebase `selectionMatches` and renderer-facing `brief` so the
  PPTX caption/label uses the updated label.
- `adaptiveVisualMain` and `adaptiveTextMain` are simple code/renderer
  invariants, not broad update-prompt pressure. Do not reintroduce heavy prompt
  rules that force local saved-plan edits to regenerate the whole deck.

User live confirmation at close:

- PPT design updates through `/ppt Document ID` worked and JSON was preserved.
- Fully resolved Resolve visuals reopened quickly without LLM delay/token use.
- Updated visual labels appeared in PPTX.
- The multi-slot duplicate-image fix is covered by local regression tests but
  still awaits future manual confirmation with another deck/material set.

API image generation directly inside the PPT resolve flow is intentionally not
part of the current stable path. Treat it as a future branch only if explicitly
requested; the current stable path is image-library selection plus placeholders.

The PPT creation feature is still close to a practical stopping point. Do not
continue polishing renderer typography by default. The likely next product slice
remains:

**Have Kin perform PPT creation as a registered task/process.**

Treat the current PPT feature as the callable capability. The next work should
design how Kin requests, monitors, revises, and completes that capability
through the task/protocol system.

If it is about PPT frame/image rendering, also review the 2026-05-01 and
2026-05-05 handoffs as historical context before touching code. Otherwise,
start from the Kin task process plan below.

Before making any PPT renderer/image-routing claim, follow the handoff's
non-negotiable debugging rule: distinguish observed facts from hypotheses,
trace `preferredImageId` through library metadata, hydration, resolver output,
frameSpec, and PPTX XML/media, and do not use fallback behavior as a substitute
for proving the primary route.

Additional stop rule from the 2026-05-08 regressions:

- Do not fix a PPT symptom by adding another broad fallback or global prompt
  constraint. First identify the owning boundary: saved-plan update,
  visual-slot selection, chat display, frameSpec projection, or renderer.
- If the workflow starts from a saved structured document, incomplete incoming
  LLM output is never an overwrite source.
- If a slot/address format is touched, audit every consumer of that address
  before asking for manual testing.

For text/body layout, keep style decisions in frame/block-style data. Renderer
V2 should execute `renderStyle.textStyle` and conservative defaults, not bake in
one-off typography rules that will be hard to change later.

Retired direct-edit note:

- PPTX direct edit and its approval queue were removed from the active PPT
  command path in the 2026-05-07 closeout.
- Do not use `HANDOFF-2026-05-03.md` direct-edit instructions as active guidance;
  they are archive context for a retired experiment.
- Future text fit work should be designed as block/frame policy or
  `renderStyle.textStyle`, not as a direct-edit emergency patch.

Latest PPT layout normalization note:

- Main text/list block styles currently use 2-line paragraph gaps through
  `renderStyle.textStyle`, not renderer hard-coding.
- Long slash-separated slide titles are compacted during presentation plan
  normalization so `titleLineFooter` stays visually one line.
- Dense `heroTopDetailsBottom` slides can be normalized to `leftRight50` before
  rendering when the detail row is too cramped. Treat this as design-frame
  correction, not as a renderer fallback.
- Title/closing bookends are deck-level fields:
  `deckFrame.openingSlide` and `deckFrame.closingSlide`. Do not put cover or
  END/summary slides into body `slideFrames`. Renderer V2 inserts them around
  the body slides, and `pageNumber.scope: "bodyOnly"` keeps those bookends
  unnumbered.
- Bookend normalization now chooses `visualTitleCover` when early body slides
  have a representative visual and chooses `summaryClosing` when the final body
  slide is a summary/next-priority slide. Bookend visuals use
  `openingSlide.visualRequest` and are hydrated by the same image-library route
  as ordinary slide visuals.

Completed in this PPT slice:

1. Renderer V2 is active for frame-native PPTX output.
2. Image-library rendering is routed through deterministic selected-ID
   hydration. API generation remains outside the stable PPT resolve flow.
3. Frame/block typography is style-data-driven via `renderStyle.textStyle`.
4. Deck-level title/closing bookends are implemented and normalized.
5. Retired PPT-frame inspection commands and their registry helper were removed
   from the active code path.

Deferred unless explicitly requested:

1. `PPT frames: Edit JSON / <frameId>` with schema/error validation.
2. `PPT frames: Delete JSON / <frameId>`.
3. Editable registry persistence wired into design generation and renderer
   mapping.

Keep the frame-based slide JSON direction from the 2026-04-30 handoff. Do not
return to the older approach of generating natural-language slide specs first
and parsing them into JSON later.

Watch for the closeout trap recorded in `HANDOFF-2026-05-01.md`: common
`deckFrame.masterFrameId` values should not be repeated as ordinary slide-level
frame content unless the slide intentionally overrides the deck master.

## Stop Rule

Do not patch the first visible symptom.

For judgment-heavy features, also follow
[`engineering-judgment-policy.md`](./engineering-judgment-policy.md): avoid
brittle semantic heuristics, use LLMs with explicit staged logic, and keep
classification fields necessary and sufficient rather than over-specified.

For topic / task / memory / protocol regressions, trace the adopted value end to
end before changing code:

1. prompt sent to the LLM or Kin
2. raw reply
3. parsed protocol event or parsed memory candidate
4. every post-parse transform / resolver / gate
5. final value written to UI, memory, task state, or library card

If only part of that path was inspected, record it as partial verification. Do
not call a path removed or fixed from a nearby helper read alone.

## Next Slice: Kin-Run PPT Tasks

Goal: let Kin initiate and operate the PPT creation workflow as a task, without
turning the PPT renderer into another hidden side channel.

Recommended implementation order:

1. Define the Kin protocol surface.
   - Add or extend a protocol block for presentation work, likely a
     `SYS_TASK_PROPOSAL` or `SYS_TASK` whose output format is
     `presentation_plan`.
   - The request should carry source material, intended audience, target slide
     count, image policy, and whether Kin expects design-only or PPTX output.
2. Route the protocol into the existing task-registration/draft path.
   - Kin should propose the PPT task.
   - GPT/user can inspect the task draft.
   - The registered task should then invoke the existing PPT design and render
     capabilities.
3. Keep task state explicit.
   - `design_requested`
   - `design_ready`
   - `revision_requested`
   - `pptx_requested`
   - `pptx_ready`
   - `completed`
4. Reuse current PPT document IDs.
   - The task should persist and reference `Document ID`.
   - Revisions should target the same document unless the user/Kin explicitly
     asks for a new deck.
5. Make evidence visible.
   - When Kin asks for PPT creation, record the source input and image policy in
     task state.
   - When rendering, record the resulting PPTX filename, slide count, image
     mode, and unresolved visual placeholders.
6. Do not add fallback routing as a shortcut.
   - If a Kin-triggered PPT task fails, trace protocol block -> task draft ->
     presentation plan -> frameSpec -> render route -> PPTX output.

Open design choices for the next session:

- Whether Kin should request design only first by default, with PPTX output
  requiring user approval.
- Whether image mode should default to `library` for cost/control or `hybrid`
  for completeness.
- Whether generated PPTX should be auto-shared back to Kin as `SYS_INFO`, or
  only summarized with a document/PPTX reference until the user approves.

## Prior Session Close Status

Closeout verification passed:

- `npx tsc --noEmit`
- `npm run check:utf8`
- `npm run lint`
- `npm test` (`232 files / 1085 tests`)
- `npm run build`

The repository is in `late-stage maintenance-watch`, not active rescue.

Stable enough to avoid broad refactor by default:

- task-intent fallback uses a fixed-slot JSON schema
- approved wording compiles directly into `CONSTRAINTS`
- task progress derives from `CONSTRAINTS`
- send-to-GPT request/finalize/gate boundaries are split and should stay
  orchestration-oriented
- page/controller/panel composition is in regrowth-watch, not active teardown
- PPTX two-column frame rendering now adapts visual/text column widths from
  selected image aspect ratio for portrait/square/landscape assets
- Frame-native PPTX output now uses `rendererV2`, with borderless visual
  placement, hero rendering for `singleCenter` visual slides, and text blocks
  rendered as a single flow box instead of overlapping per-bullet shapes

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

Latest PPT renderer checks:

```bash
npm test --prefix kin-presentation-renderer
```

```bash
npm run build --prefix kin-presentation-renderer
```

```bash
npm test -- lib/app/presentation/presentationPlanValidation.test.ts lib/server/presentation/imageGeneration.test.ts
```

```bash
npm run build
```

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
