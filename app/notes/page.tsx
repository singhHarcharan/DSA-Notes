import type { Metadata } from "next";
import { Suspense } from "react";
import { NotesExplorer } from "@/components/notes-explorer";
import { notesDatabase } from "@/lib/data";

export const metadata: Metadata = { title: "Browse notes" };

export default function NotesPage() {
  return <Suspense fallback={<div className="page explorer-loading"><span className="section-kicker">LOADING COURSE PATHS</span><h1>Opening your notes…</h1></div>}><NotesExplorer database={notesDatabase} /></Suspense>;
}
