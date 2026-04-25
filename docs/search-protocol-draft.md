# Search Protocol Draft

Updated: 2026-04-07

## Purpose
- Let Kin decide what to search.
- Let GPT execute the search, keep the raw evidence, and return a structured response.
- Make search an explicit task action, not just a loose chat command.

## Design Goals
- Kin owns the question, keywords, and search direction.
- GPT acts as search operator, evidence organizer, and formatter.
- Search can be linked to a task with `TASK_ID` and `ACTION_ID`.
- Search results can be reused later from stored raw evidence.
- Long outputs should still respect the 3200-3600 safe send range.

## First Version Scope
- Add one request block: `<<SYS_SEARCH_REQUEST>>`
- Add one response block: `<<SYS_SEARCH_RESPONSE>>`
- Keep search tied to existing task flow where possible.
- Reuse existing search storage already present in `SearchContext`.
- Include `RAW_RESULT_ID` and raw-result retention from the first version.

## Request Block
```text
<<SYS_SEARCH_REQUEST>>
TASK_ID: [optional]
ACTION_ID: [required]
QUERY: [required]
SEARCH_GOAL: [required]
OUTPUT_MODE: [summary | raw | summary_plus_raw]
MAX_SOURCES: [optional]
NOTES: [optional]
<<END_SYS_SEARCH_REQUEST>>
```

## Request Semantics
- `TASK_ID`
  Use when the search belongs to a current task.
- `ACTION_ID`
  Required so the request and response stay paired.
- `QUERY`
  The actual search query Kin wants GPT to run.
- `SEARCH_GOAL`
  Why the search is needed.
- `OUTPUT_MODE`
  Controls how much GPT should return to Kin.
- `MAX_SOURCES`
  Optional cap for returned source list.
- `NOTES`
  Optional exclusion hints, framing, or desired angle.

## Response Block
```text
<<SYS_SEARCH_RESPONSE>>
TASK_ID: [optional]
ACTION_ID: [required]
QUERY: [required]
OUTPUT_MODE: [summary | raw | summary_plus_raw]
SUMMARY:
[search summary for Kin]
SOURCES:
- [title] | [url]
- [title] | [url]
RAW_RESULT_AVAILABLE: [YES | NO]
RAW_RESULT_ID: [required if RAW_RESULT_AVAILABLE is YES]
<<END_SYS_SEARCH_RESPONSE>>
```

## Response Semantics
- `SUMMARY`
  The main search digest Kin reads.
- `SOURCES`
  Short source list for traceability.
- `RAW_RESULT_AVAILABLE`
  Tells Kin whether GPT is holding fuller evidence than shown here.
- `RAW_RESULT_ID`
  Required handle when raw evidence is stored and retrievable later.

## Output Modes
- `summary`
  Return only a concise synthesis.
- `raw`
  Return a raw-focused response with sources and a raw excerpt.
- `summary_plus_raw`
  Return synthesis plus sources and a compact raw-evidence section when safe.

## Relation To Existing App Behavior
- Existing GPT search already supports:
  - search execution in `app/api/chatgpt/route.ts`
  - evidence storage in `SearchContext`
  - later reuse through search-result integration into tasks
- This protocol should sit on top of that behavior, not replace it.

## Raw Result Policy
- Every successful search should store a raw evidence bundle from the first version.
- Each stored bundle should receive a stable `RAW_RESULT_ID`.
- `RAW_RESULT_ID` should be returned in every successful `SYS_SEARCH_RESPONSE`.
- GPT may omit the raw body from the visible response when `OUTPUT_MODE` is not `raw_and_summary`, but the stored raw bundle should still exist.
- The stored raw bundle should include at least:
  - original query
  - source list
  - extracted evidence text
  - timestamp
  - linked `TASK_ID` and `ACTION_ID` when present

## Recommended Runtime Rules
- `SYS_SEARCH_REQUEST` counts as a task-side action, not as `ASK_GPT`.
- `SYS_SEARCH_RESPONSE` should not increment `ask_gpt` counters.
- If the request is task-linked, store it in protocol log with `TASK_ID + ACTION_ID`.
- Store `RAW_RESULT_ID` in both protocol log and `SearchContext` when available.
- If search fails, GPT should still answer in SYS format with a failure summary.

## Failure Response
```text
<<SYS_SEARCH_RESPONSE>>
TASK_ID: [optional]
ACTION_ID: [required]
QUERY: [required]
OUTPUT_MODE: [requested mode]
SUMMARY:
Search could not be completed or returned insufficient evidence.
SOURCES:
- none
RAW_RESULT_AVAILABLE: NO
<<END_SYS_SEARCH_RESPONSE>>
```

## Long Message Rule
- Keep each message under 3600 characters.
- If needed, split at 3200-3600 characters.
- Label each part as `PART n/total`.
- Mark the final part clearly.

## First Implementation Plan
1. Add `search_request` and `search_response` parsing to `lib/task/taskRuntimeProtocol.ts`.
2. Extend `types/taskProtocol.ts` with any missing event typing for search response state.
3. Detect `<<SYS_SEARCH_REQUEST>>` in GPT input flow inside `app/page.tsx`.
4. Convert it into an internal GPT search request using the existing search endpoint.
5. Generate a stable `RAW_RESULT_ID` for the stored raw evidence bundle.
6. Wrap the result into `<<SYS_SEARCH_RESPONSE>>`.
7. Save the raw result into existing `SearchContext` so it can be attached to tasks later.
7. Show the latest search action in task progress UI when `TASK_ID` is present.

## Suggested Second Phase
- Add `RAW_RESULT_ID` retrieval support.
- Add `<<SYS_SEARCH_REFINE>>` for Kin-driven query revision.
- Add automation toggles for Kin-to-GPT search forwarding.
- Allow GPT to propose alternative search queries in a structured way.

## Practical Example
```text
<<SYS_SEARCH_REQUEST>>
TASK_ID: 552293
ACTION_ID: S001
QUERY: Napoleon Davout personality leadership Austerlitz
SEARCH_GOAL: Gather evidence to support a persuasive presentation about Davout.
OUTPUT_MODE: summary_plus_raw
MAX_SOURCES: 5
NOTES: Focus on reliability, discipline, and memorable episodes.
<<END_SYS_SEARCH_REQUEST>>
```

```text
<<SYS_SEARCH_RESPONSE>>
TASK_ID: 552293
ACTION_ID: S001
QUERY: Napoleon Davout personality leadership Austerlitz
OUTPUT_MODE: summary_plus_raw
SUMMARY:
Davout is consistently described as disciplined, methodical, and unusually reliable under pressure. Sources strongly emphasize his undefeated record, his calm command style, and his reputation as Napoleon's most dependable marshal. Evidence also highlights his corps-level independence and his ability to win when outnumbered.
SOURCES:
- Example Source 1 | https://example.com/1
- Example Source 2 | https://example.com/2
RAW_RESULT_AVAILABLE: YES
RAW_RESULT_ID: RAW-552293-S001-001
<<END_SYS_SEARCH_RESPONSE>>
```
