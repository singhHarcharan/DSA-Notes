import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import mammoth from "mammoth";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const dataDir = path.join(projectRoot, "data");
const mediaDir = path.join(projectRoot, "public", "media");
const resourcesDir = path.join(projectRoot, "public", "resources");

const defaultArchives = [
  "Love Babbar's (Full DSA)-20261109T171722Z-1-001.zip",
  "Dynamic Programming (Love Babbar)-20261109T171714Z-1-001.zip",
  "DP by Love Babbar-20261109T171707Z-1-001.zip",
  "Graph by Striver-20261109T171718Z-1-001.zip",
  "Striver SDE Sheet-20261109T171730Z-1-001.zip",
  "Sorting Algorithms-20261109T171728Z-1-001.zip",
  "Sliding Window by Aditya Verma-20261109T171724Z-1-001.zip",
].map((name) => path.join(os.homedir(), "Downloads", name));

const requestedArchives = process.argv.slice(2);
const archivePaths = requestedArchives.length ? requestedArchives.map((item) => path.resolve(item)) : defaultArchives;

const archiveDefinitions = [
  { match: "Love Babbar's (Full DSA)", sourceId: "love-babbar-full-dsa", sourceOrder: 0, label: "Love Babbar Complete DSA", edition: "Complete beginner course", topic: null },
  { match: "Dynamic Programming (Love Babbar)", sourceId: "love-babbar-dp", sourceOrder: 1, label: "Love Babbar DP", edition: "Flat archive", topic: "Dynamic Programming" },
  { match: "DP by Love Babbar", sourceId: "love-babbar-dp", sourceOrder: 1, label: "Love Babbar DP", edition: "Pattern-grouped archive", topic: "Dynamic Programming" },
  { match: "Graph by Striver", sourceId: "striver-graph", sourceOrder: 2, label: "Striver Graph Series", edition: "Graph by Striver", topic: "Graphs" },
  { match: "Striver SDE Sheet", sourceId: "striver-sde", sourceOrder: 3, label: "Striver SDE Sheet", edition: "Striver SDE Sheet", topic: null },
  { match: "Sorting Algorithms", sourceId: "sorting", sourceOrder: 4, label: "Sorting Algorithms", edition: "Sorting Algorithms", topic: "Sorting" },
  { match: "Sliding Window by Aditya Verma", sourceId: "aditya-verma-sliding-window", sourceOrder: 5, label: "Aditya Verma Sliding Window", edition: "Sliding Window by Aditya Verma", topic: "Sliding Window" },
];

function definitionFor(archivePath) {
  const name = path.basename(archivePath);
  return archiveDefinitions.find((item) => name.startsWith(item.match)) ?? {
    match: name,
    sourceId: slugify(name.replace(/\.zip$/i, "")),
    sourceOrder: 99,
    label: name.replace(/\.zip$/i, ""),
    edition: name.replace(/\.zip$/i, ""),
    topic: "Other",
  };
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "note";
}

function cleanTitle(filename) {
  let title = filename.replace(/\.[^.]+$/, "").replace(/\b0_1\b/gi, "0/1").replace(/_s\b/g, "'s").replace(/_/g, " ");
  while (/^\s*(?:\d+[.,]\d+\s+|\d+(?:[.,]\d+)*\s*[-.,]|[,.-]+)\s*/.test(title)) {
    title = title.replace(/^\s*(?:\d+[.,]\d+\s+|\d+(?:[.,]\d+)*\s*[-.,]|[,.-]+)\s*/, "");
  }
  title = title.replace(/^\s*[.,-]+\s*/, "");
  return title.replace(/\s+/g, " ").trim() || "Untitled note";
}

function preferredTitle(title) {
  return title
    .replace(/\s*\((?:FAQ|V\.?\s*IMP|IMP|pending|not done|skipped)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalTitleKey(title) {
  return preferredTitle(title)
    .toLowerCase()
    .replace(/\([^)]*(?:approach|dp|binary search|hard|faq|leetcode|gfg|memoization|transaction|imp)[^)]*\)/g, " ")
    .replace(/\b(part\s*\d+|using|only|faq|v\s*imp|imp)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractLinks(html, text) {
  const fromHtml = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map((match) => decodeHtml(match[1]));
  const fromText = [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map((match) => match[0].replace(/[.,;:]+$/, ""));
  return unique([...fromHtml, ...fromText]).filter((link) => /^https?:\/\//i.test(link));
}

function problemLink(links) {
  return links.find((link) => /leetcode\.com\/problems|geeksforgeeks\.org\/(?:problems|practice)|practice\.geeksforgeeks\.org\/problems|codingninjas\.com\/(?:studio\/)?problems|interviewbit\.com\/problems/i.test(link));
}

function normalizeProblemUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.toLowerCase().split("?")[0];
  }
}

function sectionHeading(text) {
  const cleaned = text.replace(/^\s*[/#*=-]+\s*/, "").replace(/\s*[:=-]+\s*$/, "").trim();
  if (cleaned.length > 110 || cleaned.includes("{") || cleaned.includes(";")) return null;
  const heading = /^(?:approach\s*\d*|recursive(?: solution| approach)?|top[ -]down(?: approach)?|bottom[ -]up(?: approach)?|memoization|tabulation|space optim(?:ization|isation|ized|ised)?|brute force(?: approach| solution)?|optimal(?: approach| solution)?|optim(?:ized|ised)(?: approach| solution)?|intuition|algorithm|explanation|notes?|observations?|edge cases?|solution\s*\d*)\b/i;
  return heading.test(cleaned) ? cleaned : null;
}

function looksLikeCode(text) {
  if (/\bclass\s+Solution\b|#include\s*<|\bpublic\s*:|\bvector\s*</.test(text)) return true;
  const lines = text.split("\n").filter(Boolean);
  let score = 0;
  for (const line of lines) {
    if (/^\s*(?:\/\/|\/\*|\*\/|#include|using namespace|class\s|struct\s|public:|private:|for\s*\(|while\s*\(|if\s*\(|else\b|return\b|[{}]|}\s*;)/.test(line)) score += 1;
    if (/[;{}]\s*$/.test(line)) score += 1;
    if (/\b(?:int|long|bool|void|string|vector|unordered_(?:map|set)|priority_queue|queue|stack|map|set)\b.*[;({=]/.test(line)) score += 1;
  }
  return score >= Math.max(2, Math.ceil(lines.length * 0.35));
}

function sectionsFromText(rawText) {
  const cleanedText = rawText.replace(/\r/g, "").replace(/\u000b/g, "\n").trim();
  if (!cleanedText) return [{ title: "Original resource", blocks: [{ kind: "text", text: "Open the attached resource to read this note." }] }];

  const chunks = cleanedText
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.replace(/^\n+|\n+$/g, "").replace(/[ \t]+$/gm, ""))
    .filter((chunk) => chunk.trim().length > 0);
  const sections = [{ title: "Notes", blocks: [] }];
  let current = sections[0];

  for (const chunk of chunks) {
    const heading = sectionHeading(chunk);
    if (heading) {
      current = { title: heading, blocks: [] };
      sections.push(current);
      continue;
    }
    if (/^https?:\/\/\S+$/i.test(chunk)) continue;
    const kind = /^(?:time|space)\s+complexity\b/i.test(chunk)
      ? "complexity"
      : looksLikeCode(chunk)
        ? "code"
        : "text";
    const previous = current.blocks.at(-1);
    if (kind === "code" && previous?.kind === "code") previous.text += `\n${chunk}`;
    else current.blocks.push({ kind, text: chunk });
  }

  const populated = sections.filter((section) => section.blocks.length > 0).map((section) => ({ ...section, blocks: mergeCodeRuns(section.blocks) }));
  return populated.length ? populated : [{ title: "Original resource", blocks: [{ kind: "text", text: "The original note contains only a link or an embedded resource. Use the links and visual resources on this page." }] }];
}

function mergeCodeRuns(blocks) {
  const merged = [];
  let active = null;
  let braceDepth = 0;
  let sawBrace = false;

  const flush = () => {
    if (!active) return;
    merged.push({ kind: "code", text: active.join("\n") });
    active = null;
    braceDepth = 0;
    sawBrace = false;
  };

  for (const block of blocks) {
    if (!active && block.kind !== "code") {
      merged.push(block);
      continue;
    }
    if (!active) active = [];
    active.push(block.text);
    const opens = (block.text.match(/{/g) || []).length;
    const closes = (block.text.match(/}/g) || []).length;
    if (opens || closes) sawBrace = true;
    braceDepth += opens - closes;
    if (sawBrace && braceDepth <= 0) flush();
    else if (!sawBrace && block.kind === "code") flush();
  }
  flush();
  return merged;
}

function stripNumbering(value) {
  return value.replace(/^\s*\d+(?:[.,]\d+)*(?:\s*[-.,])?\s*/, "").replace(/_/g, " ").trim();
}

function topicAndPattern(definition, entryName) {
  const parts = entryName.split("/").filter(Boolean);
  const relative = parts.slice(1, -1);
  if (definition.sourceId === "love-babbar-full-dsa") {
    const moduleName = displayPathPart(relative[0] || "Course notes");
    return { topic: fullDsaTopic(moduleName), pattern: stripNumbering(moduleName) };
  }
  if (definition.sourceId === "striver-sde") {
    const topic = stripNumbering(relative[0] || "Other");
    const normalizedTopic = topic === "Array" ? "Arrays" : topic === "String" ? "Strings" : topic;
    const pattern = relative.length > 1 ? stripNumbering(relative.slice(1).join(" / ")) : "";
    return { topic: normalizedTopic, pattern };
  }
  if (definition.sourceId === "love-babbar-dp") {
    const pattern = definition.edition.startsWith("Pattern") && relative[0] ? stripNumbering(relative[0]) : "";
    return { topic: "Dynamic Programming", pattern };
  }
  return { topic: definition.topic || "Other", pattern: "" };
}

function fullDsaTopic(moduleName) {
  const normalized = moduleName.toLowerCase();
  const number = Number.parseInt(normalized.match(/^\s*(\d+)/)?.[1] || "", 10);
  if (/dynamic|\bdp\b|knapsack|house rob|coins?|derangement|combination sum|min(?:imum)? cost|perfect square|cut rods?|longest common/.test(normalized) || (number >= 102 && number <= 139)) return "Dynamic Programming";
  if (/graph|dijkstra|bellman|kruskal|prim|kosaraju|topological|cycle detection/.test(normalized) || (number >= 85 && number <= 101)) return "Graphs";
  if (/linked list|\bll\b/.test(normalized) || (number >= 44 && number <= 53)) return "Linked List";
  if (/binary search tree|\bbst\b/.test(normalized)) return "Binary Search Tree";
  if (/binary tree|tree/.test(normalized) || (number >= 63 && number <= 73)) return "Binary Tree";
  if (/stack|queue/.test(normalized) || (number >= 54 && number <= 62)) return "Stack and Queue";
  if (/heap/.test(normalized) || (number >= 74 && number <= 77)) return "Heap";
  if (/trie/.test(normalized) || (number >= 79 && number <= 81)) return "Tries";
  if (/backtrack|recursion/.test(normalized) || (number >= 31 && number <= 41) || (number >= 82 && number <= 84)) return "Recursion and Backtracking";
  if (/binary search/.test(normalized) || (number >= 11 && number <= 15)) return "Binary Search";
  if (/sort/.test(normalized) || (number >= 16 && number <= 18)) return "Sorting";
  if (/array|2d/.test(normalized) || (number >= 9 && number <= 24)) return "Arrays";
  if (/greedy/.test(normalized) || number === 140) return "Greedy Algorithm";
  if (/string/.test(normalized)) return "Strings";
  return "C++ Foundations";
}

function displayPathPart(value) {
  return value.replace(/\b0_1\b/gi, "0/1").replace(/_s\b/g, "'s").replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function courseMetadata(definition, entryName) {
  const parts = entryName.split("/").filter(Boolean);
  const relativeParts = parts.slice(1);
  const directories = relativeParts.slice(0, -1);
  const filename = relativeParts.at(-1) || entryName;
  let moduleLabel;
  if (definition.sourceId === "striver-sde") {
    moduleLabel = directories.slice(0, 2).map(displayPathPart).join(" · ") || "SDE Sheet lectures";
  } else if (definition.sourceId === "love-babbar-full-dsa") {
    moduleLabel = directories.slice(0, 2).map(displayPathPart).join(" · ") || "Course introduction";
  } else if (definition.sourceId === "love-babbar-dp" && definition.edition.startsWith("Pattern") && directories[0]) {
    moduleLabel = displayPathPart(directories[0]);
  } else if (definition.sourceId === "striver-graph") moduleLabel = "Graph lectures";
  else if (definition.sourceId === "aditya-verma-sliding-window") moduleLabel = "Sliding Window lectures";
  else if (definition.sourceId === "sorting") moduleLabel = "Sorting lectures";
  else moduleLabel = "Dynamic Programming lectures";

  const rawName = filename.replace(/\.[^.]+$/, "");
  const lectureMatch = rawName.match(/^\s*(\d+(?:(?:\.|,)\d+)*(?:\s*[-,]\s*\d+(?:\.\d+)*)?)(?!_)/);
  return {
    sourceOrder: definition.sourceOrder,
    orderPath: relativeParts.map(displayPathPart).join("/"),
    moduleLabel,
    lectureLabel: lectureMatch ? lectureMatch[1].replace(/,$/, "") : "",
  };
}

function noteStatus(title, entryName) {
  return /pending|not done|skipped/i.test(`${title} ${entryName}`) ? "pending" : "ready";
}

async function resetGeneratedDirectories() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.rm(mediaDir, { recursive: true, force: true });
  await fs.rm(resourcesDir, { recursive: true, force: true });
  await fs.mkdir(mediaDir, { recursive: true });
  await fs.mkdir(resourcesDir, { recursive: true });
}

async function writeIfMissing(filePath, buffer) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, buffer);
  }
}

async function docxRecord(buffer, entryName, definition) {
  const embeddedAssets = [];
  const docHash = sha256(buffer).slice(0, 12);
  let imageIndex = 0;
  const htmlResult = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        const extension = image.contentType?.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const filename = `${docHash}-${++imageIndex}.${extension}`;
        await writeIfMissing(path.join(mediaDir, filename), imageBuffer);
        const asset = { type: "image", path: `/media/${filename}`, label: `Visual reference ${imageIndex}` };
        embeddedAssets.push(asset);
        return { src: asset.path };
      }),
    },
  );
  const rawResult = await mammoth.extractRawText({ buffer });
  const rawText = rawResult.value.trim();
  const title = preferredTitle(cleanTitle(path.basename(entryName)));
  const links = extractLinks(htmlResult.value, rawText);
  const { topic, pattern } = topicAndPattern(definition, entryName);
  const course = courseMetadata(definition, entryName);
  return {
    id: `${definition.sourceId}-${docHash}`,
    title,
    sourceId: definition.sourceId,
    sourceLabel: definition.label,
    sourceTitle: definition.edition,
    sourcePath: entryName,
    ...course,
    topic,
    pattern,
    status: noteStatus(title, entryName),
    links,
    sections: sectionsFromText(rawText),
    assets: embeddedAssets,
    searchableText: rawText.slice(0, 25000),
    contentHash: sha256(Buffer.from(rawText.replace(/\s+/g, "").toLowerCase())),
  };
}

async function resourceRecord(buffer, entryName, definition, extension) {
  const hash = sha256(buffer);
  const safeTitle = cleanTitle(path.basename(entryName));
  const filename = `${hash.slice(0, 12)}-${slugify(safeTitle)}.${extension}`;
  const destination = extension === "pdf" ? resourcesDir : mediaDir;
  await writeIfMissing(path.join(destination, filename), buffer);
  const { topic, pattern } = topicAndPattern(definition, entryName);
  const course = courseMetadata(definition, entryName);
  const assetPath = extension === "pdf" ? `/resources/${filename}` : `/media/${filename}`;
  return {
    id: `${definition.sourceId}-${hash.slice(0, 12)}`,
    title: preferredTitle(safeTitle),
    sourceId: definition.sourceId,
    sourceLabel: definition.label,
    sourceTitle: definition.edition,
    sourcePath: entryName,
    ...course,
    topic,
    pattern,
    status: noteStatus(safeTitle, entryName),
    links: [],
    sections: [{ title: extension === "pdf" ? "PDF reference" : "Visual reference", blocks: [{ kind: "text", text: `This source note is provided as a ${extension.toUpperCase()} resource.` }] }],
    assets: [{ type: extension === "pdf" ? "pdf" : "image", path: assetPath, label: safeTitle }],
    searchableText: safeTitle,
    contentHash: hash,
  };
}

async function textRecord(buffer, entryName, definition) {
  const rawText = buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
  const title = preferredTitle(cleanTitle(path.basename(entryName)));
  const links = extractLinks("", rawText);
  const { topic, pattern } = topicAndPattern(definition, entryName);
  const course = courseMetadata(definition, entryName);
  return {
    id: `${definition.sourceId}-${sha256(buffer).slice(0, 12)}`,
    title,
    sourceId: definition.sourceId,
    sourceLabel: definition.label,
    sourceTitle: definition.edition,
    sourcePath: entryName,
    ...course,
    topic,
    pattern,
    status: noteStatus(title, entryName),
    links,
    sections: sectionsFromText(rawText),
    assets: [],
    searchableText: rawText.slice(0, 25000),
    contentHash: sha256(Buffer.from(rawText.replace(/\s+/g, "").toLowerCase())),
  };
}

function recordKey(record) {
  const url = problemLink(record.links);
  if (url) return `url:${normalizeProblemUrl(url)}`;
  return `title:${canonicalTitleKey(record.title)}`;
}

function buildDatabase(records, sourceFileCount) {
  const parents = records.map((_, index) => index);
  const find = (index) => parents[index] === index ? index : (parents[index] = find(parents[index]));
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };
  const keyOwner = new Map();
  records.forEach((record, index) => {
    const url = problemLink(record.links);
    const keys = record.sourceId === "love-babbar-full-dsa"
      ? [`course:${record.sourceId}:${record.orderPath}`]
      : [`title:${canonicalTitleKey(record.title)}`, ...(url ? [`url:${normalizeProblemUrl(url)}`] : [])];
    for (const key of keys) {
      if (keyOwner.has(key)) union(index, keyOwner.get(key));
      else keyOwner.set(key, index);
    }
  });
  const rawGroups = new Map();
  records.forEach((record, index) => {
    const root = find(index);
    if (!rawGroups.has(root)) rawGroups.set(root, []);
    rawGroups.get(root).push(record);
  });
  const groups = [];
  for (const groupRecords of rawGroups.values()) {
    const seen = new Set();
    const preferredRecords = [...groupRecords].sort((a, b) => Number(b.sourceTitle.startsWith("Pattern")) - Number(a.sourceTitle.startsWith("Pattern")));
    const deduped = preferredRecords.filter((record) => {
      const key = `${record.sourceId}:${record.contentHash}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    groups.push(deduped);
  }

  const usedSlugs = new Set();
  const problems = [];
  const compareCourseOrder = (a, b) => {
    if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder;
    return a.orderPath.localeCompare(b.orderPath, undefined, { numeric: true, sensitivity: "base" });
  };
  const compareVariants = (a, b) => {
    if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder;
    if (a.sourceId === b.sourceId) {
      const groupedBias = Number(b.sourceTitle.startsWith("Pattern")) - Number(a.sourceTitle.startsWith("Pattern"));
      if (groupedBias) return groupedBias;
    }
    return compareCourseOrder(a, b);
  };
  for (const variants of groups) {
    const sortedVariants = [...variants].sort(compareVariants);
    const primary = sortedVariants[0];
    let slug = slugify(primary.title);
    const baseSlug = slug;
    let counter = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${counter++}`;
    usedSlugs.add(slug);
    const links = unique(sortedVariants.flatMap((variant) => variant.links));
    const topics = unique(sortedVariants.map((variant) => variant.topic)).sort();
    const patterns = unique(sortedVariants.map((variant) => variant.pattern))
      .filter((pattern) => canonicalTitleKey(pattern) !== canonicalTitleKey(primary.title))
      .sort();
    problems.push({
      id: slug,
      slug,
      title: primary.title,
      topics,
      patterns,
      status: sortedVariants.some((variant) => variant.status === "ready") ? "ready" : "pending",
      links,
      variants: sortedVariants.map(({ topic, pattern, contentHash, ...variant }) => variant),
    });
  }

  problems.sort((a, b) => compareCourseOrder(a.variants[0], b.variants[0]));
  const topicCounts = new Map();
  const sourceCounts = new Map();
  for (const problem of problems) {
    for (const topic of problem.topics) topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    for (const sourceId of unique(problem.variants.map((variant) => variant.sourceId))) {
      sourceCounts.set(sourceId, (sourceCounts.get(sourceId) || 0) + 1);
    }
  }

  const sourceLabels = Object.fromEntries(archiveDefinitions.map((definition) => [definition.sourceId, definition.label]));
  const sourceOrder = Object.fromEntries(archiveDefinitions.map((definition) => [definition.sourceId, definition.sourceOrder]));
  return {
    generatedAt: new Date().toISOString(),
    sourceFileCount,
    importedVariantCount: records.length,
    problems,
    topics: [...topicCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    sources: [...sourceCounts.entries()].map(([id, count]) => ({ id, label: sourceLabels[id] || id, count })).sort((a, b) => (sourceOrder[a.id] ?? 99) - (sourceOrder[b.id] ?? 99)),
  };
}

async function main() {
  await resetGeneratedDirectories();
  const records = [];
  let sourceFileCount = 0;

  for (const archivePath of archivePaths) {
    await fs.access(archivePath);
    const definition = definitionFor(archivePath);
    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
    sourceFileCount += entries.length;
    process.stdout.write(`Importing ${definition.edition}: ${entries.length} files\n`);

    for (const entry of entries) {
      const extension = path.extname(entry.entryName).slice(1).toLowerCase();
      const buffer = entry.getData();
      if (extension === "docx") records.push(await docxRecord(buffer, entry.entryName, definition));
      else if (extension === "txt") records.push(await textRecord(buffer, entry.entryName, definition));
      else if (["pdf", "png", "jpg", "jpeg", "webp"].includes(extension)) {
        records.push(await resourceRecord(buffer, entry.entryName, definition, extension === "jpeg" ? "jpg" : extension));
      }
    }
  }

  const database = buildDatabase(records, sourceFileCount);
  await fs.writeFile(path.join(dataDir, "notes.json"), JSON.stringify(database));
  const audit = {
    generatedAt: database.generatedAt,
    sourceFileCount,
    importedVariantCount: records.length,
    canonicalProblemCount: database.problems.length,
    duplicateVariantsMerged: records.length - database.problems.length,
    topicCount: database.topics.length,
    pendingProblemCount: database.problems.filter((problem) => problem.status === "pending").length,
    mediaAssetCount: records.reduce((sum, record) => sum + record.assets.filter((asset) => asset.type === "image").length, 0),
    pdfAssetCount: records.reduce((sum, record) => sum + record.assets.filter((asset) => asset.type === "pdf").length, 0),
  };
  await fs.writeFile(path.join(dataDir, "import-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
