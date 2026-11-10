"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import type { Problem } from "@/types";
import { BookmarkIcon, CheckIcon, CopyIcon, ExternalIcon } from "@/components/icons";

type RevisionStatus = "none" | "review" | "done";

function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"')\]]+)/g);
  return <>{parts.map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a> : <Fragment key={index}>{part}</Fragment>)}</>;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return <div className="code-block"><div className="code-toolbar"><span><i />C++</span><button onClick={copy}><CopyIcon />{copied ? "Copied" : "Copy"}</button></div><Highlight theme={themes.nightOwl} code={code.trimEnd()} language="cpp">{({ className, style, tokens, getLineProps, getTokenProps }) => <pre className={className} style={{ ...style, background: "transparent" }}>{tokens.map((line, lineIndex) => {
    const lineProps = getLineProps({ line });
    return <div key={`line-${lineIndex}`} {...lineProps} className={`code-line ${lineProps.className || ""}`}><span className="code-line-number">{lineIndex + 1}</span><span className="code-line-content">{line.map((token, tokenIndex) => <span key={`token-${lineIndex}-${tokenIndex}`} {...getTokenProps({ token })} />)}</span></div>;
  })}</pre>}</Highlight></div>;
}

function hostLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("leetcode")) return "LeetCode";
    if (host.includes("geeksforgeeks")) return "GeeksforGeeks";
    if (host.includes("takeuforward")) return "Take U Forward";
    if (host.includes("codingninjas")) return "Coding Ninjas";
    return host;
  } catch { return "Open link"; }
}

export function NoteReader({ problem, related, previous, next }: { problem: Problem; related: Problem[]; previous?: Problem; next?: Problem }) {
  const [activeVariantId, setActiveVariantId] = useState(problem.variants[0]?.id || "");
  const [revisionStatus, setRevisionStatus] = useState<RevisionStatus>("none");
  const [bookmarked, setBookmarked] = useState(false);
  const variant = useMemo(() => problem.variants.find((item) => item.id === activeVariantId) || problem.variants[0], [problem.variants, activeVariantId]);

  useEffect(() => {
    try {
      const progress = JSON.parse(localStorage.getItem("dsa-progress") || "{}");
      setRevisionStatus(progress[problem.slug] || "none");
      const bookmarks: string[] = JSON.parse(localStorage.getItem("dsa-bookmarks") || "[]");
      setBookmarked(bookmarks.includes(problem.slug));
      const recent: string[] = JSON.parse(localStorage.getItem("dsa-recent") || "[]");
      localStorage.setItem("dsa-recent", JSON.stringify([problem.slug, ...recent.filter((slug) => slug !== problem.slug)].slice(0, 12)));
    } catch { /* Ignore malformed local state. */ }
  }, [problem.slug]);

  function updateStatus(status: RevisionStatus) {
    setRevisionStatus(status);
    const progress = JSON.parse(localStorage.getItem("dsa-progress") || "{}");
    if (status === "none") delete progress[problem.slug];
    else progress[problem.slug] = status;
    localStorage.setItem("dsa-progress", JSON.stringify(progress));
  }

  function toggleBookmark() {
    const bookmarks: string[] = JSON.parse(localStorage.getItem("dsa-bookmarks") || "[]");
    const nextBookmarks = bookmarked ? bookmarks.filter((slug) => slug !== problem.slug) : [...new Set([...bookmarks, problem.slug])];
    localStorage.setItem("dsa-bookmarks", JSON.stringify(nextBookmarks));
    setBookmarked(!bookmarked);
  }

  return <div className="page reader-page">
    <nav className="breadcrumbs"><Link href="/notes">All notes</Link><span>/</span><Link href={`/notes/?topic=${encodeURIComponent(problem.topics[0])}`}>{problem.topics[0]}</Link><span>/</span><strong>{problem.title}</strong></nav>
    <header className="reader-header">
      <div className="reader-title"><div className="reader-badges">{problem.topics.map((topic) => <span className="topic-pill" key={topic}>{topic}</span>)}{problem.status === "pending" && <span className="pending-pill">Pending in source</span>}</div><h1>{variant.lectureLabel && <span className="reader-lecture-number">{variant.lectureLabel}.</span>}{problem.title}</h1>{problem.patterns.length > 0 && <p>{problem.patterns.join(" · ")}</p>}</div>
      <button onClick={toggleBookmark} className={`bookmark-button ${bookmarked ? "active" : ""}`}><BookmarkIcon filled={bookmarked} />{bookmarked ? "Bookmarked" : "Bookmark"}</button>
    </header>

    <section className="reader-actions">
      <div className="revision-control"><span>Revision status</span><div><button className={revisionStatus === "review" ? "active review" : ""} onClick={() => updateStatus(revisionStatus === "review" ? "none" : "review")}>↻ Needs review</button><button className={revisionStatus === "done" ? "active done" : ""} onClick={() => updateStatus(revisionStatus === "done" ? "none" : "done")}><CheckIcon />Completed</button></div></div>
      {problem.links.length > 0 && <div className="external-links">{problem.links.slice(0, 4).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{hostLabel(url)}<ExternalIcon /></a>)}</div>}
    </section>

    {problem.variants.length > 1 && <section className="source-tabs" aria-label="Source variants"><span>Source note</span><div>{problem.variants.map((item, index) => <button key={item.id} className={item.id === variant.id ? "active" : ""} onClick={() => setActiveVariantId(item.id)}>{item.sourceLabel}{problem.variants.filter((candidate) => candidate.sourceId === item.sourceId).length > 1 ? ` · ${index + 1}` : ""}</button>)}</div></section>}

    <div className="source-provenance"><span>{variant.sourceTitle}</span><span>Original file: {variant.sourcePath.split("/").at(-1)}</span></div>

    <article className="note-content">
      {variant.sections.map((section, sectionIndex) => <details className="note-section" key={`${section.title}-${sectionIndex}`} open={sectionIndex === 0}>
        <summary><span><small>{String(sectionIndex + 1).padStart(2, "0")}</small>{section.title}</span><i>+</i></summary>
        <div className="section-content">{section.blocks.map((block, blockIndex) => block.kind === "code" ? <CodeBlock key={blockIndex} code={block.text} /> : block.kind === "complexity" ? <div className="complexity-callout" key={blockIndex}><LinkedText text={block.text} /></div> : <div className="prose-block" key={blockIndex}><LinkedText text={block.text} /></div>)}</div>
      </details>)}
      {variant.assets.length > 0 && <details className="note-section" open><summary><span><small>{String(variant.sections.length + 1).padStart(2, "0")}</small>Visual resources</span><i>+</i></summary><div className="section-content asset-stack">{variant.assets.map((asset) => asset.type === "image" ? <figure key={asset.path}><img src={asset.path} alt={asset.label} /><figcaption>{asset.label}</figcaption></figure> : <div className="pdf-resource" key={asset.path}><object data={asset.path} type="application/pdf"><a href={asset.path} target="_blank">Open {asset.label}</a></object><a className="button button-secondary" href={asset.path} target="_blank">Open PDF in a new tab <ExternalIcon /></a></div>)}</div></details>}
    </article>

    {related.length > 0 && <section className="related-section"><span className="section-kicker">KEEP THE PATTERN FRESH</span><h2>Related notes</h2><div>{related.map((item) => <Link key={item.slug} href={`/notes/${item.slug}/`}><span>{item.title}<small>{item.topics[0]}</small></span><span>→</span></Link>)}</div></section>}

    <nav className="reader-pagination">{previous ? <Link href={`/notes/${previous.slug}/`}><small>← Previous</small><span>{previous.title}</span></Link> : <span />}{next ? <Link className="next" href={`/notes/${next.slug}/`}><small>Next →</small><span>{next.title}</span></Link> : <span />}</nav>
  </div>;
}
