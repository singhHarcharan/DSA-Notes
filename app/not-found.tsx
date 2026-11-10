import Link from "next/link";

export default function NotFound() {
  return <div className="page empty-state not-found"><span>404</span><h1>That note was not found.</h1><p>It may have been merged into another canonical problem.</p><Link href="/notes" className="button button-primary">Browse all notes</Link></div>;
}
