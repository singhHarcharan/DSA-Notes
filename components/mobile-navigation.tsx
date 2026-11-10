"use client";

import { useRef } from "react";
import { MenuIcon } from "@/components/icons";

export function MobileNavigation({ children }: { children: React.ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeAfterNavigation(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) detailsRef.current?.removeAttribute("open");
  }

  return <details ref={detailsRef} className="mobile-menu">
    <summary aria-label="Open navigation"><MenuIcon /></summary>
    <div className="mobile-menu-panel" onClick={closeAfterNavigation}>{children}</div>
  </details>;
}
