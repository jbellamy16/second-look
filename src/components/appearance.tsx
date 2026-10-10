"use client";

import { useEffect, useState } from "react";

export type Appearance = "system" | "light" | "dark";
const storageKey = "second-look-appearance";

function readAppearance(): Appearance {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === "light" || value === "dark") return value;
  } catch {}
  return "system";
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAppearance(readAppearance());
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null)
        setAppearance(readAppearance());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        appearance === "system"
          ? system.matches
            ? "dark"
            : "light"
          : appearance;
      document.documentElement.dataset.theme = theme;
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute("content", theme === "dark" ? "#111416" : "#f5f4f0");
      });
    };
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [appearance, ready]);

  const chooseAppearance = (value: Appearance) => {
    setAppearance(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {}
  };

  return [appearance, chooseAppearance] as const;
}

/** Both images are server-rendered; CSS selects the correct ink before paint. */
export function BrandImage({
  className = "",
  symbol = false,
}: {
  className?: string;
  symbol?: boolean;
}) {
  return (
    <>
      {(["dark", "light"] as const).map((theme) => (
        <img
          key={theme}
          className={`${className} theme-${theme}-logo`}
          src={
            symbol
              ? `/brand/second-look-mark-${theme}.svg`
              : `/brand/second-look-horizontal-${theme}-1600.png`
          }
          width={symbol ? 172 : 1600}
          height={symbol ? 172 : 316}
          alt="Second Look"
        />
      ))}
    </>
  );
}
