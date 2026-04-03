export function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PrismLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer gem shape */}
      <path d="M10 1.5L18 7.5L10 18.5L2 7.5L10 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
      {/* Horizontal facet line */}
      <path d="M2 7.5H18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      {/* Left upper facet */}
      <path d="M6.5 7.5L10 1.5" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.35" />
      {/* Right upper facet */}
      <path d="M13.5 7.5L10 1.5" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.35" />
      {/* Center vertical */}
      <path d="M10 7.5L10 18.5" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2" strokeOpacity="0.25" />
    </svg>
  );
}

export function BotIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4.5" width="12" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 4.5V3.5C5 2.395 5.895 1.5 7 1.5C8.105 1.5 9 2.395 9 3.5V4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="4.75" cy="8.25" r="1" fill="currentColor" />
      <circle cx="9.25" cy="8.25" r="1" fill="currentColor" />
      <path d="M5.5 11H8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 9L16 2L9 16L7.5 10.5L2 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M7.5 10.5L16 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.36 3.64L11.3 4.7M4.7 11.3L3.64 12.36M12.36 12.36L11.3 11.3M4.7 4.7L3.64 3.64" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function PersonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="5.5" r="2.5" fill="currentColor" fillOpacity="0.9" />
      <path d="M2.5 14C2.5 11.515 5.015 9.5 8 9.5C10.985 9.5 13.5 11.515 13.5 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 3L13 8L4 13V3Z" fill="currentColor" />
    </svg>
  );
}

export function StopIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

export function GitPRIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Source node */}
      <circle cx="3.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      {/* Target (merged) node */}
      <circle cx="3.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      {/* Feature branch node */}
      <circle cx="12.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      {/* Vertical line (source to target) */}
      <path d="M3.5 5V11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      {/* Branch curve */}
      <path d="M5 3.5C7 3.5 11 3.5 11 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      {/* Merge curve */}
      <path d="M11 7C11 10.5 7 12.5 5 12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function CommitIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vertical line through the commit node */}
      <path d="M8 1.5V5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M8 10.5V14.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      {/* Commit circle */}
      <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function CheckmarkIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 5L3.5 7L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// — Status icons —

export function HourglassIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 21H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 3C6 3 7 8 12 12C7 16 6 21 6 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 3C18 3 17 8 12 12C17 16 18 21 18 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SyncIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C4 7.58 7.58 4 12 4C15.04 4 17.7 5.62 19.14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 12C20 16.42 16.42 20 12 20C8.96 20 6.3 18.38 4.86 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 4.5L19.14 8L15.64 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19.5L4.86 16L8.36 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// — Finding severity icons —

export function DangerousIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.07" />
      <path d="M9 5.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="12.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function WarningTriangleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2.5L16 15H2L9 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.07" />
      <path d="M9 7.5V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="13" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function LightbulbIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2C6.24 2 4 4.24 4 7C4 8.9 5.04 10.54 6.58 11.42L6.58 13H11.42L11.42 11.42C12.96 10.54 14 8.9 14 7C14 4.24 11.76 2 9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.07" />
      <path d="M7 13.5H11M7.5 15.5H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SuccessCircleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
      <path d="M5.5 9L7.5 11L12.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// — Agent icons —

function LogicIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="3.5" r="1.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5.25V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 8L5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 8L13 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="5" cy="13.5" r="1.75" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13" cy="13.5" r="1.75" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SecurityIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2L15 4.5V9C15 12.5 12 15.5 9 16.5C6 15.5 3 12.5 3 9V4.5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
      <path d="M6.5 9L8.5 11L11.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PerformanceIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 2.5L5 10H9.5L7.5 15.5L14 7.5H9.5L10.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
    </svg>
  );
}

function PatternIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.5" cy="13.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="13.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 4.5H11.5M6.5 13.5H11.5M4.5 6.5V11.5M13.5 6.5V11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}

export type AgentType = "logic" | "security" | "performance" | "pattern";

export function AgentIcon({ type, size = 18 }: { type: AgentType; size?: number }) {
  if (type === "logic") return <LogicIcon size={size} />;
  if (type === "security") return <SecurityIcon size={size} />;
  if (type === "performance") return <PerformanceIcon size={size} />;
  return <PatternIcon size={size} />;
}
