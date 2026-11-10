import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: { default: "DSA Notes", template: "%s · DSA Notes" },
  description: "A searchable, structured library of DSA interview notes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body><SiteShell>{children}</SiteShell></body></html>;
}
