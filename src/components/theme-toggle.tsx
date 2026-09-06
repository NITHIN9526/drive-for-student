"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("drive-theme");
    return saved === "dark";
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("drive-theme");
    const enabled = saved === "dark";
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("drive-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      title={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
