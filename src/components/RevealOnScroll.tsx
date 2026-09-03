"use client";

import { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

/** Content is revealed regardless after this long, whatever the observer did. */
const SAFETY_REVEAL_MS = 1200;

/**
 * Fade-up reveal that triggers once, the first time the element scrolls
 * into view.
 *
 * Three things this has to get right, because the failure mode is
 * invisible content:
 *
 *  - `IntersectionObserver` may not exist (old browsers, some embedded
 *    webviews). Without a guard the effect throws and the element stays at
 *    opacity 0 forever.
 *  - An element already in view on load must reveal immediately, and the
 *    negative rootMargin starts the animation slightly before the element
 *    reaches the fold so it is finished by the time it is read.
 *  - A safety timer reveals everything after 1.2s no matter what. A
 *    decorative animation must never be the reason a paragraph cannot be
 *    read — this is also what keeps the content visible to a crawler or a
 *    screenshot tool that does not scroll.
 *
 * Reduced motion is handled globally in globals.css, which pins .reveal to
 * its visible state.
 */
export function RevealOnScroll({ children, delayMs = 0, className = "" }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let revealTimer: number | undefined;
    const reveal = () => {
      revealTimer = window.setTimeout(() => setVisible(true), delayMs);
    };

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        reveal();
        observer.unobserve(element);
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(element);
    const safety = window.setTimeout(() => setVisible(true), SAFETY_REVEAL_MS + delayMs);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
    };
  }, [delayMs]);

  return (
    <div ref={ref} className={`reveal h-full ${visible ? "in-view" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
