export type NoteBlock = {
  kind: "text" | "code" | "complexity";
  text: string;
};

export type NoteSection = {
  title: string;
  blocks: NoteBlock[];
};

export type NoteAsset = {
  type: "image" | "pdf";
  path: string;
  label: string;
};

export type NoteVariant = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  sourceTitle: string;
  sourcePath: string;
  sourceOrder: number;
  orderPath: string;
  moduleLabel: string;
  lectureLabel: string;
  status: "ready" | "pending";
  links: string[];
  sections: NoteSection[];
  assets: NoteAsset[];
  searchableText: string;
};

export type Problem = {
  id: string;
  slug: string;
  title: string;
  topics: string[];
  patterns: string[];
  status: "ready" | "pending";
  links: string[];
  variants: NoteVariant[];
};

export type SourceSummary = {
  id: string;
  label: string;
  count: number;
};

export type NotesDatabase = {
  generatedAt: string;
  sourceFileCount: number;
  importedVariantCount: number;
  problems: Problem[];
  topics: { name: string; count: number }[];
  sources: SourceSummary[];
};
