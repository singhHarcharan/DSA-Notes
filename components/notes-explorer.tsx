"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { NotesDatabase, NoteVariant, Problem } from "@/types";
import { ArrowIcon, BookmarkIcon, SearchIcon } from "@/components/icons";

export function NotesExplorer({ database }: { database: NotesDatabase }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const topic = searchParams.get("topic") || "all";
  const source = searchParams.get("source") || "all";
  const status = searchParams.get("status") || "all";

  useEffect(() => {
    try { setBookmarks(JSON.parse(localStorage.getItem("dsa-bookmarks") || "[]")); } catch { /* Ignore malformed local state. */ }
  }, []);

  function updateFilter(key: "topic" | "source" | "status", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    router.replace(pathname, { scroll: false });
  }

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = database.problems.filter((problem) => {
      if (topic !== "all" && !problem.topics.includes(topic)) return false;
      if (source !== "all" && !problem.variants.some((variant) => variant.sourceId === source)) return false;
      if (status === "pending" && problem.status !== "pending") return false;
      if (status === "bookmarked" && !bookmarks.includes(problem.slug)) return false;
      if (!normalizedQuery) return true;
      const haystack = [problem.title, ...problem.topics, ...problem.patterns, ...problem.variants.map((variant) => variant.searchableText)].join(" ").toLowerCase();
      return normalizedQuery.split(/\s+/).every((term) => haystack.includes(term));
    });
    const variantFor = (problem: Problem): NoteVariant => {
      const candidates = source === "all" ? problem.variants : problem.variants.filter((variant) => variant.sourceId === source);
      return [...candidates].sort(compareVariantPreference)[0] || problem.variants[0];
    };
    return filtered
      .map((problem) => ({ problem, variant: variantFor(problem) }))
      .sort((left, right) => compareCourseOrder(left.variant, right.variant));
  }, [database.problems, query, topic, source, status, bookmarks]);

  const moduleGroups = useMemo(() => {
    const groups = new Map<string, { key: string; sourceLabel: string; moduleLabel: string; entries: typeof results }>();
    for (const entry of results) {
      const key = `${entry.variant.sourceId}::${entry.variant.moduleLabel}`;
      const group = groups.get(key);
      if (group) group.entries.push(entry);
      else groups.set(key, { key, sourceLabel: entry.variant.sourceLabel, moduleLabel: entry.variant.moduleLabel, entries: [entry] });
    }
    return [...groups.values()];
  }, [results]);

  return <div className="page explorer-page">
    <header className="page-header"><span className="section-kicker">COMPLETE LIBRARY</span><h1>Browse notes</h1><p>Search by question, algorithm, code, or a phrase you remember from the original notes.</p></header>
    <div className="search-panel">
      <label className="search-input"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Dijkstra, sliding window, memoization…" autoFocus /><kbd>⌘ K</kbd></label>
      <div className="filter-row">
        <label>Topic<select value={topic} onChange={(event) => updateFilter("topic", event.target.value)}><option value="all">All topics</option>{database.topics.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.count})</option>)}</select></label>
        <label>Course<select value={source} onChange={(event) => updateFilter("source", event.target.value)}><option value="all">All courses</option>{database.sources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">All notes</option><option value="pending">Pending in source</option><option value="bookmarked">Bookmarked</option></select></label>
        {(query || topic !== "all" || source !== "all" || status !== "all") && <button className="clear-button" onClick={clearFilters}>Clear filters</button>}
      </div>
    </div>
    <div className="results-heading"><strong>{results.length}</strong> {results.length === 1 ? "note" : "notes"}<span>Original course order</span></div>
    {results.length > 0 ? <div className="course-groups">{moduleGroups.map((group) => <section className="module-group" key={group.key}>
      <header className="module-heading"><div><span>{group.sourceLabel}</span><h2>{group.moduleLabel}</h2></div><small>{group.entries.length} {group.entries.length === 1 ? "lecture" : "lectures"}</small></header>
      <div className="note-list">{group.entries.map(({ problem, variant }) => <Link href={`/notes/${problem.slug}/`} className="list-card" key={`${group.key}-${problem.slug}`}>
        <div className="lecture-marker">{variant.lectureLabel ? <><span>Lecture</span><strong>{variant.lectureLabel}</strong></> : <span>Note</span>}</div>
        <div className="list-card-main"><div className="card-meta"><span className="topic-pill">{problem.topics[0]}</span>{problem.status === "pending" && <span className="pending-pill">Pending</span>}{bookmarks.includes(problem.slug) && <BookmarkIcon filled />}</div><h2>{problem.title}</h2><p>{problem.patterns.slice(0, 2).join(" · ") || variant.sourceTitle}</p></div>
        <div className="list-card-side"><span>{problem.variants.length} {problem.variants.length === 1 ? "note" : "variants"}</span><ArrowIcon /></div>
      </Link>)}</div>
    </section>)}</div> : <div className="empty-state"><SearchIcon /><h2>No matching notes</h2><p>Try a shorter phrase or clear one of the filters.</p></div>}
  </div>;
}

function compareCourseOrder(left: NoteVariant, right: NoteVariant) {
  if (left.sourceOrder !== right.sourceOrder) return left.sourceOrder - right.sourceOrder;
  return left.orderPath.localeCompare(right.orderPath, undefined, { numeric: true, sensitivity: "base" });
}

function compareVariantPreference(left: NoteVariant, right: NoteVariant) {
  if (left.sourceOrder !== right.sourceOrder) return left.sourceOrder - right.sourceOrder;
  if (left.sourceId === right.sourceId) {
    const groupedBias = Number(right.sourceTitle.startsWith("Pattern")) - Number(left.sourceTitle.startsWith("Pattern"));
    if (groupedBias) return groupedBias;
  }
  return compareCourseOrder(left, right);
}
