export type WebsiteMapFile = {
  url: string;
  sourcePageUrl: string;
  label: string;
  kind: "pdf" | "file";
  contentType?: string;
  contentLength?: number;
  status?: number;
};

export type WebsiteMapPage = {
  url: string;
  finalUrl: string;
  title: string;
  depth: number;
  status: number;
  contentType: string;
  textCharEstimate: number;
  linkCount: number;
  sameHostLinkCount: number;
  fileLinkCount: number;
  summary: string;
};

export type WebsiteMapSkippedUrl = {
  url: string;
  reason: string;
};

export type WebsiteMapResult = {
  version: "0.1-website-map";
  rootUrl: string;
  finalRootUrl: string;
  host: string;
  crawledAt: string;
  maxDepth: number;
  maxPages: number;
  maxFiles: number;
  pages: WebsiteMapPage[];
  files: WebsiteMapFile[];
  skipped: WebsiteMapSkippedUrl[];
};

export type WebsiteMapRequest = {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  maxFiles?: number;
};
