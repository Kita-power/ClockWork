"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeModeClassSync() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const isSystem = theme === "system";

    root.classList.toggle("theme-system", isSystem);
    root.classList.toggle("theme-system-dark", isSystem && resolvedTheme === "dark");
    root.classList.toggle("theme-system-light", isSystem && resolvedTheme === "light");
  }, [theme, resolvedTheme]);

  return null;
}