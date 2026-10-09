import {
  Activity as LucideActivity,
  ArrowRight as LucideArrowRight,
  ArrowUpRight as LucideArrowUpRight,
  ChartNoAxesColumnIncreasing,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronRight as LucideChevronRight,
  CircleHelp as LucideCircleHelp,
  Clock3 as LucideClock3,
  Crosshair as LucideCrosshair,
  Focus as LucideFocus,
  LayoutGrid as LucideLayoutGrid,
  ListVideo as LucideListVideo,
  Pause as LucidePause,
  Play as LucidePlay,
  RotateCcw as LucideRotateCcw,
  Settings2 as LucideSettings2,
  ShieldCheck,
  TrendingUp as LucideTrendingUp,
  Users as LucideUsers,
  X as LucideX,
  ArrowLeftRight,
  Flag,
  CircleAlert,
  CircleDot,
  MoveRight,
  List,
  ChartNoAxesCombined,
  Trophy,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { ReactNode } from "react";
import type { EventType } from "@/lib/match";

// One entry point for all interface glyphs. Brand marks and data plots are separate.
export type IconSize = 16 | 20 | 24 | 32;
export type IconProps = Omit<
  LucideProps,
  "size" | "strokeWidth" | "absoluteStrokeWidth" | "fill" | "children"
> & { size?: IconSize };
function systemIcon(Glyph: LucideIcon) {
  return function SystemIcon({
    size = 20,
    className = "",
    ...props
  }: IconProps) {
    return (
      <Glyph
        {...props}
        size={size}
        strokeWidth={2}
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={`sl-icon ${className}`}
      />
    );
  };
}
export const Activity = systemIcon(LucideActivity);
export const ArrowRight = systemIcon(LucideArrowRight);
export const ArrowUpRight = systemIcon(LucideArrowUpRight);
export const BarChart3 = systemIcon(ChartNoAxesColumnIncreasing);
export const Check = systemIcon(LucideCheck);
export const ChevronDown = systemIcon(LucideChevronDown);
export const ChevronRight = systemIcon(LucideChevronRight);
export const CircleHelp = systemIcon(LucideCircleHelp);
export const Clock3 = systemIcon(LucideClock3);
export const Crosshair = systemIcon(LucideCrosshair);
export const Focus = systemIcon(LucideFocus);
export const LayoutGrid = systemIcon(LucideLayoutGrid);
export const ListVideo = systemIcon(LucideListVideo);
export const Pause = systemIcon(LucidePause);
export const Play = systemIcon(LucidePlay);
export const RotateCcw = systemIcon(LucideRotateCcw);
export const Settings2 = systemIcon(LucideSettings2);
export const Shield = systemIcon(ShieldCheck);
export const TrendingUp = systemIcon(LucideTrendingUp);
export const Users = systemIcon(LucideUsers);
export const X = systemIcon(LucideX);
export const Substitution = systemIcon(ArrowLeftRight);
export const MatchEvents = systemIcon(List);
export const Momentum = systemIcon(ChartNoAxesCombined);
export const Competition = systemIcon(Trophy);
const Corner = systemIcon(Flag);
const Foul = systemIcon(CircleAlert);
const Possession = systemIcon(CircleDot);
const Carry = systemIcon(MoveRight);

function FootballGlyph({
  size = 20,
  className = "",
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`sl-icon ${className}`}
    >
      {children}
    </svg>
  );
}
// Original football extension: the same canvas, stroke, caps and optical footprint.
export function Goal(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 8 4 3-1.5 4.5h-5L8 11Zm0 0V3m4 8 4.5-2m-6 6.5 3 4m-8-4-3 4M8 11 3.5 9" />
    </FootballGlyph>
  );
}
export function Shot(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <circle cx="6" cy="18" r="3" />
      <path d="m12 12 8-8m-7 0h7v7M3 9l3-3m3 15 3-3" />
    </FootballGlyph>
  );
}
export function Pass(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <circle cx="5" cy="16" r="2" />
      <path d="M10 16h2a6 6 0 0 0 6-6V4m-4 4 4-4 4 4" />
    </FootballGlyph>
  );
}
export function Tackle(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 4v5l4 3m14 8v-5l-4-3M3 20l4-4M21 4l-4 4" />
    </FootballGlyph>
  );
}
export function Interception(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <path d="M3 7h6m6 0h6M9 4l3 3-3 3m9 10v-5a3 3 0 0 0-3-3h-3m3-3-3 3 3 3" />
      <circle cx="6" cy="18" r="3" />
    </FootballGlyph>
  );
}
export function Recovery(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M4 8a9 9 0 1 1-1 7M3 3v5h5" />
    </FootballGlyph>
  );
}
export function Tactics(props: IconProps) {
  return (
    <FootballGlyph {...props}>
      <circle cx="5" cy="18" r="2" />
      <path d="M5 12V9a4 4 0 0 1 4-4h6m-3-3 3 3-3 3m4 7 5 5m0-5-5 5" />
    </FootballGlyph>
  );
}
export const EVENT_ICONS = {
  goal: Goal,
  shot: Shot,
  pass: Pass,
  carry: Carry,
  tackle: Tackle,
  interception: Interception,
  recovery: Recovery,
  substitution: Substitution,
  corner: Corner,
  foul: Foul,
  possession: Possession,
} satisfies Record<EventType, (props: IconProps) => ReactNode>;
export function EventIcon({ type, ...props }: IconProps & { type: EventType }) {
  const Glyph = EVENT_ICONS[type];
  return <Glyph {...props} />;
}
