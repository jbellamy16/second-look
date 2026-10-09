"use client";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const query = "(prefers-reduced-motion: reduce)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
}

// CSS is the source of truth for both CSS and imperative animation timing.
export function motionTiming(element: Element, token = "standard") {
  const style = getComputedStyle(element);
  return {
    duration: parseFloat(style.getPropertyValue(`--motion-${token}`)) || 0,
    easing: style.getPropertyValue("--ease-out").trim() || "ease-out",
  };
}

export function Reveal({
  change,
  children,
  className = "",
}: {
  change: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const animation = el.animate(
      [{ transform: "translateY(4px)" }, { transform: "translateY(0)" }],
      motionTiming(el),
    );
    return () => animation.cancel();
  }, [change, reduced]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function Metric({
  value,
  important = false,
}: {
  value: number | string;
  important?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const changed = previous.current !== value;
    const increased = Number(value) > Number(previous.current);
    previous.current = value;
    const el = ref.current;
    if (!el || !changed || reduced) return;
    const animation = el.animate(
      important && increased
        ? [
            { opacity: 0.95, transform: "translateY(4px) scale(.94)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ]
        : [{ opacity: 0.95 }, { opacity: 1 }],
      motionTiming(el, important ? "visual" : "micro"),
    );
    return () => animation.cancel();
  }, [value, important, reduced]);
  return (
    <span className="motion-metric" ref={ref}>
      {value}
    </span>
  );
}

// One moving indicator; measure only on selection/resize, never each frame.
export function SelectionGroup({
  children,
  className,
  label,
  navigation = false,
  value,
}: {
  children: ReactNode;
  className: string;
  label: string;
  navigation?: boolean;
  value: string;
}) {
  const ref = useRef<HTMLDivElement & HTMLElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const selected = el.querySelector<HTMLElement>(
        '[aria-current="page"], [aria-pressed="true"]',
      );
      if (selected)
        setPosition({
          x: selected.offsetLeft,
          y: selected.offsetTop,
          width: selected.offsetWidth,
          height: selected.offsetHeight,
        });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);
  const Tag = navigation ? "nav" : "div";
  return (
    <Tag
      ref={ref}
      className={`${className} selection-group`}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="selection-indicator"
        style={{
          width: position.width,
          height: position.height,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      />
      {children}
    </Tag>
  );
}

export function usePageVisibility() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}
