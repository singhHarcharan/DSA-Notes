import Link from "next/link";
import { notesDatabase } from "@/lib/data";
import { BookIcon, SearchIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavigation } from "@/components/mobile-navigation";

function NavContents() {
  return <>
    <nav className="primary-nav" aria-label="Primary navigation">
      <Link href="/"><BookIcon />Overview</Link>
      <Link href="/notes"><SearchIcon />Browse all notes</Link>
    </nav>
    <div className="nav-section course-navigation">
      <p className="nav-label">Courses &amp; sheets</p>
      {notesDatabase.sources.map((source) => <Link className={source.id === "love-babbar-full-dsa" ? "featured-course-link" : ""} key={source.id} href={`/notes/?source=${source.id}`}><span>{source.label}{source.id === "love-babbar-full-dsa" && <em>Beginner path</em>}</span><small>{source.count}</small></Link>)}
    </div>
    <div className="nav-section">
      <p className="nav-label">Browse by topic</p>
      {notesDatabase.topics.map((topic) => <Link key={topic.name} href={`/notes/?topic=${encodeURIComponent(topic.name)}`}><span>{topic.name}</span><small>{topic.count}</small></Link>)}
    </div>
  </>;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">D</span><span>DSA Notes<small>Interview revision</small></span></Link>
      <NavContents />
      <div className="sidebar-footer"><span>{notesDatabase.problems.length} canonical notes</span><ThemeToggle /></div>
    </aside>
    <header className="mobile-header">
      <Link href="/" className="brand"><span className="brand-mark">D</span><span>DSA Notes</span></Link>
      <div className="mobile-actions"><ThemeToggle /><MobileNavigation><NavContents /></MobileNavigation></div>
    </header>
    <main className="main-content">{children}</main>
  </div>;
}
