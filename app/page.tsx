import { Dashboard } from "@/components/dashboard";
import { notesDatabase } from "@/lib/data";

export default function HomePage() {
  return <Dashboard database={notesDatabase} />;
}
