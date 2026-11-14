// Small line icons (24 × 24, drawn with currentColor).

import type { BubbleType } from "@/types/page";

function Icon({ children, className = "h-4 w-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const BUBBLE_PATHS: Record<BubbleType, React.ReactNode> = {
  speech: <path d="M12 4c5 0 9 2.7 9 6s-4 6-9 6c-.8 0-1.6-.1-2.3-.2L5 19l1.2-4.1C4.2 13.8 3 12 3 10c0-3.3 4-6 9-6z" />,
  thought: (
    <>
      <path d="M7 13.5a3 3 0 0 1-.5-5.9 3.5 3.5 0 0 1 6-2 3.5 3.5 0 0 1 5.5 2.4 3 3 0 0 1-1 5.8 3.5 3.5 0 0 1-5 .7 3.5 3.5 0 0 1-5-1z" />
      <circle cx="6" cy="17" r="1.3" />
      <circle cx="4" cy="20" r="0.8" />
    </>
  ),
  shout: <path d="M12 3l1.8 3.5L17.5 4l-.6 4 4.1 1-3.3 2.5L20.5 15l-4-.3-.7 4L12 16.5 9 20l-.6-4.2-4.4.7 2.5-3.3L3 10.5l4-1.3L6 5l3.7 1.8z" />,
  narration: <rect x="3" y="7" width="18" height="10" rx="0.5" />,
};

export const BubbleTypeIcon = ({ type }: { type: BubbleType }) => <Icon>{BUBBLE_PATHS[type]}</Icon>;

export const PanelIcon = () => (
  <Icon>
    <rect x="4" y="5" width="16" height="14" rx="1" />
  </Icon>
);

export const SfxIcon = () => (
  <Icon>
    <path d="M12 2.5l2 4.2 4.4-1.6-1.3 4.5 4.4 1.6-4 2.5 2.4 4-4.6-.5-.6 4.6L12 18.5 9.3 21.8l-.6-4.6-4.6.5 2.4-4-4-2.5 4.4-1.6L5.6 5.1 10 6.7z" />
  </Icon>
);

export const EyeIcon = ({ off }: { off?: boolean }) => (
  <Icon>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.5" />
    {off && <path d="M4 20L20 4" />}
  </Icon>
);

export const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Icon>
);

export const GripIcon = () => (
  <Icon className="h-3.5 w-3.5">
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={2.6} />
  </Icon>
);

export const AlignIcon = ({ align }: { align: "left" | "center" | "right" }) => (
  <Icon>
    {align === "left" && <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />}
    {align === "center" && <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />}
    {align === "right" && <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />}
  </Icon>
);

export const SidebarIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M15 4v16" />
  </Icon>
);
