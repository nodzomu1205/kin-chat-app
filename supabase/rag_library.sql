create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  library_item_id text not null unique,
  source_id text not null,
  item_type text not null,
  artifact_type text,
  title text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rag_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists rag_documents_library_item_id_idx
  on public.rag_documents(library_item_id);

create index if not exists rag_documents_source_id_idx
  on public.rag_documents(source_id);

create index if not exists rag_documents_metadata_idx
  on public.rag_documents using gin(metadata);

create index if not exists rag_document_chunks_document_id_idx
  on public.rag_document_chunks(document_id);

create index if not exists rag_document_chunks_metadata_idx
  on public.rag_document_chunks using gin(metadata);

create index if not exists rag_document_chunks_embedding_idx
  on public.rag_document_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function public.set_rag_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rag_documents_set_updated_at on public.rag_documents;
create trigger rag_documents_set_updated_at
before update on public.rag_documents
for each row execute function public.set_rag_updated_at();

drop trigger if exists rag_document_chunks_set_updated_at on public.rag_document_chunks;
create trigger rag_document_chunks_set_updated_at
before update on public.rag_document_chunks
for each row execute function public.set_rag_updated_at();

create or replace function public.match_rag_library_chunks(
  query_embedding vector(1536),
  match_count integer default 10,
  match_threshold double precision default 0,
  filter_metadata jsonb default '{}'::jsonb,
  document_ids uuid[] default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  library_item_id text,
  source_id text,
  title text,
  item_type text,
  artifact_type text,
  chunk_index integer,
  content text,
  similarity double precision,
  document_metadata jsonb,
  chunk_metadata jsonb
)
language sql stable
as $$
  select
    chunks.id as chunk_id,
    documents.id as document_id,
    documents.library_item_id,
    documents.source_id,
    documents.title,
    documents.item_type,
    documents.artifact_type,
    chunks.chunk_index,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) as similarity,
    documents.metadata as document_metadata,
    chunks.metadata as chunk_metadata
  from public.rag_document_chunks chunks
  join public.rag_documents documents on documents.id = chunks.document_id
  where chunks.embedding is not null
    and (document_ids is null or documents.id = any(document_ids))
    and documents.metadata @> filter_metadata
    and 1 - (chunks.embedding <=> query_embedding) >= match_threshold
  order by chunks.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.find_similar_rag_library_chunks(
  min_similarity double precision default 0.68,
  max_pairs integer default 30
)
returns table (
  left_chunk_id uuid,
  left_document_id uuid,
  left_title text,
  left_chunk_index integer,
  left_token_estimate integer,
  right_chunk_id uuid,
  right_document_id uuid,
  right_title text,
  right_chunk_index integer,
  right_token_estimate integer,
  similarity double precision
)
language sql stable
as $$
  select
    c1.id as left_chunk_id,
    d1.id as left_document_id,
    d1.title as left_title,
    c1.chunk_index as left_chunk_index,
    c1.token_estimate as left_token_estimate,
    c2.id as right_chunk_id,
    d2.id as right_document_id,
    d2.title as right_title,
    c2.chunk_index as right_chunk_index,
    c2.token_estimate as right_token_estimate,
    1 - (c1.embedding <=> c2.embedding) as similarity
  from public.rag_document_chunks c1
  join public.rag_documents d1 on d1.id = c1.document_id
  join public.rag_document_chunks c2 on c1.id < c2.id
  join public.rag_documents d2 on d2.id = c2.document_id
  where c1.embedding is not null
    and c2.embedding is not null
    and c1.document_id <> c2.document_id
    and 1 - (c1.embedding <=> c2.embedding) >= min_similarity
  order by c1.embedding <=> c2.embedding
  limit greatest(max_pairs, 1);
$$;
