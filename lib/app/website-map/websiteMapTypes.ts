export type WebsiteMapFile = {
  url: string;
  sourcePageUrl: string;
  label: string;
  kind: "pdf" | "file";
  contentType?: string;
  contentLength?: number;
  status?: number;
};

export type WebsiteMapLink = {
  url: string;
  label: string;
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
  sameHostLinks?: WebsiteMapLink[];
  fileLinks?: WebsiteMapLink[];
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
  maxPages: number | null;
  maxFiles: number | null;
  timedOut?: boolean;
  timeBudgetMs?: number;
  pages: WebsiteMapPage[];
  files: WebsiteMapFile[];
  skipped: WebsiteMapSkippedUrl[];
};

export type WebsiteMapPageTextResult = {
  url: string;
  finalUrl: string;
  title: string;
  contentType: string;
  status: number;
  text: string;
  textCharEstimate: number;
  images: WebsiteMapPageImage[];
  fetchedAt: string;
};

export type WebsiteMapPageImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type WebsiteMapRequest = {
  url: string;
  maxDepth?: number;
  maxPages?: number | null;
  maxFiles?: number | null;
};
