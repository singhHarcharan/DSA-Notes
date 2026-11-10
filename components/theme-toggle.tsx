"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dsa-theme");
    const shouldUseDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";
    setDark(shouldUseDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("dsa-theme", next ? "dark" : "light");
  }

  return <button className="icon-button" onClick={toggle} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <SunIcon /> : <MoonIcon />}</button>;
}
