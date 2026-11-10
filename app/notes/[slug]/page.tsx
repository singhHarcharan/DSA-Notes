import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteReader } from "@/components/note-reader";
import { getProblem, getRelatedProblems, notesDatabase } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return notesDatabase.problems.map((problem) => ({ slug: problem.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const problem = getProblem(slug);
  return problem ? { title: problem.title, description: `Revision notes for ${problem.title}.` } : {};
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) notFound();
  const index = notesDatabase.problems.findIndex((item) => item.slug === slug);
  return <NoteReader problem={problem} related={getRelatedProblems(problem)} previous={notesDatabase.problems[index - 1]} next={notesDatabase.problems[index + 1]} />;
}
