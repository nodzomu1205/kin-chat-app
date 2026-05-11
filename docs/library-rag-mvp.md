# Library, DB, And DB Reference Log

Updated: 2026-05-12

## Direction

Keep the existing working area named "Library". A library card is an app-side
working object used for direct reference, task work, PPT work, Google Drive
round-trips, and temporary source handling.

The DB tab is different. It represents a long-lived RAG knowledge base. Library
cards and image metadata can be sent into the DB, but the DB does not remain
live-synced with those source objects. It keeps provenance and then grows as its
own searchable knowledge base.

Recommended tabs:

```text
[Library] [Images] [DB] [DB Reference Log]
```

Japanese UI labels can remain:

```text
[ライブラリ] [画像] [DB] [DB参照ログ]
```

## Product Concepts

### Library

The Library tab is the existing source-card workspace. It can contain:

- ingested files
- search results
- Kin-created text
- generated or saved working artifacts
- Google Drive imported items

Library cards may be short-lived. Important originals can remain in Google
Drive or other storage and be imported only when needed.

### Images

The Images tab manages usable image assets inside the app, especially for PPT
material workflows.

Image binaries should not be the first DB target. The first DB target should be
image metadata, such as:

- file name
- Drive file id or external URL, when available
- title
- description
- tags
- project, customer, product, supplier, or category
- notes
- source and ingested timestamp

This lets the DB answer image-discovery questions. A user can search the DB,
get a file name or Drive identifier, find the real image in Google Drive, then
import it into the Images tab for PPT use.

For image registration, the recommended operation is a paired write:

1. Store the original image file in a configured Google Drive image folder.
2. Store searchable image metadata in the DB.

The DB metadata should keep enough Drive provenance to reconnect the searchable
record to the original image:

- Drive file id
- Drive folder id
- file name
- Drive web URL, if available
- MIME type
- file size, if available
- uploaded/registered timestamp

This keeps the DB lightweight while making image discovery practical. The DB can
return a file name or Drive id, and the app can use that to locate and import
the real image into the Images tab when needed.

### DB

The DB tab is the human-facing view of the external knowledge base. It should
not expose raw database rows one-to-one. It should group and summarize stored
knowledge in a way users can understand.

The DB can contain:

- text knowledge from library cards
- image metadata records
- ingestion history
- searchable knowledge chunks
- category, topic, entity, and provenance metadata
- duplicate and similar-content signals

### DB Reference Log

The DB Reference Log tab shows runtime usage:

- conversation or task context
- query or summarized intent
- referenced DB items
- referenced chunks
- similarity score, when available
- token usage bucket: chat or task
- timestamp

Assistant responses can also show a compact DB reference footer, while this tab
keeps the full history.

## Storage Versus UI

Supabase is the persisted store. The DB tab is a management and inspection UI.

Supabase stores normalized data:

- ingestion records
- source provenance
- knowledge chunks
- embeddings
- metadata JSON
- content hashes
- image metadata
- reference events

The DB tab displays composed views:

- DB cards
- knowledge clusters
- image metadata cards
- ingestion records
- expanded chunk lists
- duplicate or merge candidates
- reference history

A DB card does not need to equal one database row. One DB card may summarize
multiple chunks, multiple ingestions, or a topic cluster.

## RAG Ingestion Model

Sending a library card or image metadata item to the DB should create an
ingestion record. The ingestion record answers:

- what was sent
- when it was sent
- where it came from
- whether it was accepted, skipped, errored, or needs review
- which chunks or metadata records were created or affected

The DB should keep source traceability, but it should not require live sync with
the original library card or image-library item. If source material changes, the
user can send it again. The DB can then detect exact duplicates, similar
content, or potentially updated information.

## Retrieval Model

Direct reference and RAG reference remain separate:

- Direct reference sends selected library-card text directly.
- RAG reference searches the DB and injects only relevant knowledge chunks or
  metadata snippets.

If DB configuration is missing, RAG should be skipped clearly. It must not
silently fall back to sending library-card text directly.

The user-facing RAG count should be treated as a result/card limit, not as a
token estimate. Token estimates should use concrete context only. Do not add
speculative estimates such as `count * average chunk tokens`.

## Data Model Direction

The current MVP SQL uses:

- `rag_documents`
- `rag_document_chunks`

That is acceptable as a bootstrap, but the target model should move toward:

- `rag_ingestions`
  - one row per send-to-DB operation
  - source type, source id, title, content hash, status, timestamp
- `rag_knowledge_chunks`
  - searchable text chunks with embeddings
  - provenance links
  - category/topic/entity metadata
  - active/superseded status
- `rag_image_metadata`
  - searchable image descriptions and file identity
  - Drive file id or external location
  - tags and categorization
- `rag_reference_events`
  - one row per RAG use
  - chat/task usage bucket
  - referenced chunks or metadata records

## Deduplication And Growth

Start conservative:

1. Detect exact duplicate content by hash.
2. Detect similar chunks or image metadata by embedding similarity.
3. Show duplicate or merge candidates in the DB tab.
4. Avoid automatic destructive merges.
5. Keep provenance visible.

Current implementation status:

- exact duplicate document detection by `content_hash` is implemented
- exact duplicate chunk detection by normalized text is implemented
- semantic similar-chunk detection by stored embedding similarity is
  implemented through `find_similar_rag_library_chunks`
- semantic candidate detection is non-breaking when the Supabase RPC has not
  yet been applied; the app treats that as zero semantic candidates
- non-destructive compaction can create a new integrated DB document while
  keeping source documents

Current product lesson from live testing:

- automatic semantic pair detection still did not surface useful candidates for
  the current DB contents
- the next organization step should be category/theme/entity extraction,
  sorting, and user-selected multi-document compaction
- threshold tuning alone is unlikely to be enough

Later:

- user-approved merge into existing knowledge chunks
- category and entity clustering
- conflict or supersession handling
- stale or low-value chunk pruning
- image metadata enrichment

## Implementation Phases

### Phase 1: Stabilize Current RAG UX

- Keep "Library" naming.
- Rename the card action from raw "RAG" to a DB send/index action.
- Make `supabase_not_configured` and `empty_document` states explicit.
- Remove speculative RAG token estimates.
- Confirm RAG never falls back to direct library-card injection.

### Phase 2: DB And Log Tabs

- Add DB tab beside Library and Images.
- Add DB Reference Log tab.
- Show local placeholder states when Supabase is not configured.
- Show DB ingestion/document cards once API support exists.
- Show reference events once logging exists.

### Phase 3: Server APIs

- Add DB list/detail endpoints.
- Add ingestion status endpoints.
- Add reference-event write/list endpoints.
- Extend schema toward ingestion records, knowledge chunks, image metadata, and
  reference events.

### Phase 4: Knowledge Organization

- Add exact duplicate detection.
- Add similar-item review.
- Add category/tag filters.
- Add image metadata search.
- Add user-approved merge/supersede flows.

Next recommended Phase 4 slice:

1. Extract lightweight labels from DB documents/chunks:
   - category
   - theme/topic
   - entities
   - document type
2. Display those labels in the DB tab.
3. Sort and group DB documents by those labels.
4. Let the user select multiple DB documents manually.
5. Run the existing non-destructive compaction flow on the selected set.
6. Add explicit delete/supersede only after the integrated result has been
   reviewed.

## Stop Rules

- Do not silently send library cards as a fallback when RAG is unavailable.
- Do not present speculative RAG token estimates.
- Do not make source library cards and DB knowledge chunks live-synced by
  default.
- Do not auto-merge or delete knowledge without provenance and reviewability.
