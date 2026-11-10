"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { NotesDatabase } from "@/types";
import { ArrowIcon, BookIcon, CheckIcon, SearchIcon } from "@/components/icons";

type ProgressMap = Record<string, "done" | "review">;

export function Dashboard({ database }: { database: NotesDatabase }) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setProgress(JSON.parse(localStorage.getItem("dsa-progress") || "{}"));
      setRecent(JSON.parse(localStorage.getItem("dsa-recent") || "[]"));
    } catch { /* Ignore malformed local state. */ }
  }, []);

  const completed = Object.values(progress).filter((value) => value === "done").length;
  const review = Object.values(progress).filter((value) => value === "review").length;
  const recentProblems = useMemo(() => recent.map((slug) => database.problems.find((problem) => problem.slug === slug)).filter(Boolean).slice(0, 4), [recent, database.problems]);
  const featuredTopics = database.topics.slice(0, 8);

  return <div className="page dashboard-page">
    <section className="hero">
      <div className="eyebrow">YOUR INTERVIEW REVISION LIBRARY</div>
      <h1>Everything you need to<br /><span>remember the pattern.</span></h1>
      <p>Search across Striver, Love Babbar, and Aditya Verma notes. Compare approaches, copy code, and keep track of what needs another pass.</p>
      <div className="hero-actions">
        <Link className="button button-primary" href="/notes"><SearchIcon />Explore all notes</Link>
        <Link className="button button-secondary course-cta" href="/notes/?source=love-babbar-full-dsa">Start Love Babbar course<ArrowIcon /></Link>
      </div>
    </section>

    <section className="stats-grid" aria-label="Library statistics">
      <article><BookIcon /><div><strong>{database.problems.length}</strong><span>Canonical notes</span></div></article>
      <article><span className="stat-symbol">↗</span><div><strong>{database.sourceFileCount}</strong><span>Source files preserved</span></div></article>
      <article><CheckIcon /><div><strong>{completed}</strong><span>Marked complete</span></div></article>
      <article><span className="stat-symbol">↻</span><div><strong>{review}</strong><span>Need revision</span></div></article>
    </section>

    {recentProblems.length > 0 && <section className="section-block">
      <div className="section-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recently opened</h2></div><Link href="/notes">View all <ArrowIcon /></Link></div>
      <div className="note-grid compact-grid">{recentProblems.map((problem) => problem && <Link className="note-card" key={problem.slug} href={`/notes/${problem.slug}/`}><div className="card-top"><span className="topic-pill">{problem.topics[0]}</span><span className={`status-dot ${problem.status}`} /></div><h3>{problem.title}</h3><p>{problem.variants.length} source {problem.variants.length === 1 ? "note" : "variants"}</p><ArrowIcon className="card-arrow" /></Link>)}</div>
    </section>}

    <section className="section-block">
      <div className="section-heading"><div><span className="section-kicker">BROWSE BY CONCEPT</span><h2>Core topics</h2></div><Link href="/notes">All topics <ArrowIcon /></Link></div>
      <div className="topic-grid">{featuredTopics.map((topic, index) => <Link key={topic.name} href={`/notes/?topic=${encodeURIComponent(topic.name)}`} className="topic-card"><span className="topic-number">{String(index + 1).padStart(2, "0")}</span><h3>{topic.name}</h3><p>{topic.count} notes</p><ArrowIcon /></Link>)}</div>
    </section>

    <section className="collections-section">
      <div><span className="section-kicker">COMPLETE LEARNING PATHS</span><h2>Study by course</h2><p>Start with the full Love Babbar beginner course, or follow any sheet in its original lecture order.</p></div>
      <div className="collection-list">{database.sources.map((source) => <Link href={`/notes/?source=${source.id}`} key={source.id}><span>{source.label}</span><small>{source.count} notes</small><ArrowIcon /></Link>)}</div>
    </section>
  </div>;
}
