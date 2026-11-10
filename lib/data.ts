import notesJson from "@/data/notes.json";
import type { NotesDatabase, Problem } from "@/types";

export const notesDatabase = notesJson as NotesDatabase;

export function getProblem(slug: string): Problem | undefined {
  return notesDatabase.problems.find((problem) => problem.slug === slug);
}

export function getRelatedProblems(problem: Problem, limit = 5): Problem[] {
  return notesDatabase.problems
    .filter((candidate) => candidate.slug !== problem.slug && candidate.topics.some((topic) => problem.topics.includes(topic)))
    .sort((a, b) => {
      const aOverlap = a.patterns.filter((pattern) => problem.patterns.includes(pattern)).length;
      const bOverlap = b.patterns.filter((pattern) => problem.patterns.includes(pattern)).length;
      return bOverlap - aOverlap || a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}
