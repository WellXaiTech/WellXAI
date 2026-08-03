"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AccountMenu, { type SettingsTab } from "@/components/AccountMenu";

export type ConversationSummary = {
  id: string;
  title: string;
  pinned?: boolean;
  updatedAt?: number;
};

const COLLAPSED_KEY = "chatgiza:sidebar-collapsed";

// Today shows a time, this week shows the weekday, this year shows "26 Jul",
// anything older shows "15 Jul 25" — same convention as most chat apps' history lists.
function formatConversationDate(ts?: number): string {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString([], { day: "numeric", month: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "2-digit" });
}

const PencilIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

const SearchIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const GearIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const PanelIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
);

const MenuIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="16" x2="14" y2="16" />
  </svg>
);

const LibraryIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="18" rx="1" />
    <rect x="14" y="3" width="7" height="18" rx="1" />
  </svg>
);

const ProjectsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const CodeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l-6-6 6-6" />
    <path d="M15 6l6 6-6 6" />
  </svg>
);

const DesignIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.5 2 2 6 2 11c0 3 2 4 4 4h1.5a1.5 1.5 0 0 1 1.5 1.5V18c0 2 2 4 4 4 5.5 0 9-4.5 9-10S17.5 2 12 2Z" />
    <circle cx="7.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="11" cy="6.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

const StockIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-7" />
  </svg>
);

const KycIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5 17c.5-1.7 1.8-3 3-3s2.5 1.3 3 3" />
    <path d="M14 9h6M14 13h6" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ChevronRightIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const PersonIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.3-3.6 4.4-6 8-6s6.7 2.4 8 6" />
  </svg>
);

const BuildingIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
  </svg>
);

const ImagesIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const MoreDotsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

const ShareIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
);

const PinIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <g transform="rotate(45 12 12)">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </g>
  </svg>
);

const PinFilledIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <g transform="rotate(45 12 12)">
      <path d="M12 17v5" />
      <path
        d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
        fill="currentColor"
      />
    </g>
  </svg>
);

const ArchiveIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
    <path d="M10 13h4" />
  </svg>
);

const TrashIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3.5h6" />
    <path d="M5 5h10" />
    <path d="M7 5v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5" />
    <path d="M8.5 8v5" />
    <path d="M11.5 8v5" />
  </svg>
);

function NavItem({
  icon,
  label,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-base font-medium text-foreground transition-colors hover:bg-surface-2"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">{icon}</span>
      {label}
      {trailing && <span className="ml-auto">{trailing}</span>}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pb-1 pt-3 text-xs text-muted">{children}</div>;
}

function SubItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-base font-medium text-foreground transition-colors hover:bg-surface-2"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">{icon}</span>
      {label}
    </button>
  );
}

type MenuCoords = { left: number; top?: number; bottom?: number };

function computeMenuCoords(rect: DOMRect, estimatedHeight: number): MenuCoords {
  const menuWidth = 240;
  const left = Math.min(rect.right + 4, window.innerWidth - menuWidth - 8);
  const spaceBelow = window.innerHeight - rect.top;
  // Flip the menu to open upward when there isn't enough room below the
  // trigger — otherwise it silently runs off the bottom of the screen for
  // rows near the end of a long history list.
  if (spaceBelow < estimatedHeight && rect.bottom - estimatedHeight > 0) {
    return { left, bottom: window.innerHeight - rect.bottom };
  }
  return { left, top: rect.top };
}

function ConversationMenu({
  pinned,
  projects,
  open,
  onOpenChange,
  onShare,
  onRename,
  onTogglePin,
  onArchive,
  onDelete,
  onMoveToProject,
  getAnchor,
}: {
  pinned?: boolean;
  projects: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMoveToProject: (projectId: string) => void;
  getAnchor: () => DOMRect | null;
}) {
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moveTriggerRef = useRef<HTMLButtonElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const [moveCoords, setMoveCoords] = useState<MenuCoords | null>(null);

  useEffect(() => {
    if (!open) {
      setMoveOpen(false);
      setConfirmDelete(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Recompute on every open (not just the trigger button's own click) so a
    // long-press-triggered open still lands at the right anchor. Clamped so
    // the fixed-width panel never overflows off the right edge of narrow
    // (mobile) viewports.
    const anchor = getAnchor();
    if (anchor) {
      const menuWidth = 240;
      const left = Math.min(anchor.right + 4, window.innerWidth - menuWidth - 8);
      setCoords({ top: anchor.top, left });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function close() {
      onOpenChange(false);
      setMoveOpen(false);
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        moveMenuRef.current &&
        !moveMenuRef.current.contains(target)
      ) {
        close();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    // A fixed-position portal doesn't move with the scrollable conversation
    // list, so it visually detaches from its trigger row on scroll/resize —
    // just close it rather than let it drift.
    function handleScrollOrResize() {
      close();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const items: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
    { label: "Share", icon: ShareIcon, onClick: onShare },
    { label: "Rename", icon: PencilIcon, onClick: onRename },
    { label: pinned ? "Unpin chat" : "Pin chat", icon: pinned ? PinFilledIcon : PinIcon, onClick: onTogglePin },
    { label: "Archive", icon: ArchiveIcon, onClick: onArchive },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setMoveOpen(false);
          onOpenChange(!open);
        }}
        aria-label="Chat options"
        className={`rounded-md p-1.5 text-muted transition-colors hover:text-foreground ${
          open ? "block" : "hidden group-hover:block"
        }`}
      >
        {MoreDotsIcon}
      </button>
      {open &&
        coords &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                onOpenChange(false);
                setMoveOpen(false);
              }}
            />
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: coords.left,
                ...(coords.top !== undefined ? { top: coords.top } : { bottom: coords.bottom }),
              }}
              className="z-50 w-60 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
            >
            {confirmDelete ? (
              <div className="p-2">
                <p className="px-1 pb-1 text-sm font-medium text-foreground">Delete this chat?</p>
                <p className="px-1 pb-3 text-xs text-muted">This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      onOpenChange(false);
                    }}
                    className="flex-1 rounded-lg bg-[#b3413e] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                {items.slice(0, 2).map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      onOpenChange(false);
                    }}
                    className="menu-item"
                  >
                    <span className="icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                <button
                  ref={moveTriggerRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!moveOpen && moveTriggerRef.current) {
                      const rect = moveTriggerRef.current.getBoundingClientRect();
                      setMoveCoords(computeMenuCoords(rect, 200));
                    }
                    setMoveOpen((v) => !v);
                  }}
                  className="menu-item"
                >
                  <span className="icon">{ProjectsIcon}</span>
                  <span className="flex-1">Move to project</span>
                  <span className="text-muted">{ChevronRightIcon}</span>
                </button>

                {items.slice(2, 4).map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      onOpenChange(false);
                    }}
                    className="menu-item"
                  >
                    <span className="icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="menu-item delete"
                >
                  <span className="icon">{TrashIcon}</span>
                  <span>Delete</span>
                </button>
              </>
            )}
            </div>
          </>,
          document.body
        )}
      {moveOpen &&
        moveCoords &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMoveOpen(false)}
            />
            <div
              ref={moveMenuRef}
              style={{
                position: "fixed",
                left: moveCoords.left,
                ...(moveCoords.top !== undefined ? { top: moveCoords.top } : { bottom: moveCoords.bottom }),
              }}
              className="z-50 w-60 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
            >
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">No projects yet</p>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToProject(p.id);
                      setMoveOpen(false);
                      onOpenChange(false);
                    }}
                    className="menu-item"
                  >
                    <span className="icon">{ProjectsIcon}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

function ConversationRow({
  c,
  active,
  editing,
  editValue,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onSelect,
  onShare,
  onRename,
  onTogglePin,
  onArchive,
  onDelete,
  projects,
  onMoveToProject,
  menuOpen,
  onMenuOpenChange,
  getAnchor,
}: {
  c: ConversationSummary;
  active: boolean;
  editing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  onShare: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  projects: { id: string; name: string }[];
  onMoveToProject: (projectId: string) => void;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  getAnchor: () => DOMRect | null;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handleTouchStart() {
    longPressFired.current = false;
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      onMenuOpenChange(true);
    }, 450);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    clearPressTimer();
    if (longPressFired.current) {
      e.preventDefault();
    }
  }

  if (editing) {
    return (
      <li>
        <input
          autoFocus
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommitEdit();
            }
            if (e.key === "Escape") onCancelEdit();
          }}
          className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none"
        />
      </li>
    );
  }

  return (
    <li className="group relative">
      <button
        onClick={onSelect}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={clearPressTimer}
        onTouchCancel={clearPressTimer}
        className={`flex min-h-9 w-full flex-col justify-center gap-0.5 rounded-xl px-2 py-1.5 pr-16 text-left transition-colors ${
          active ? "bg-surface-2" : "hover:bg-surface-2"
        }`}
      >
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{c.title}</span>
        {c.updatedAt && <span className="min-w-0 truncate text-xs text-muted">{formatConversationDate(c.updatedAt)}</span>}
      </button>
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          aria-label={c.pinned ? "Unpin chat" : "Pin chat"}
          className={`rounded-md p-1.5 text-muted transition-colors hover:text-foreground ${
            c.pinned ? "flex" : "hidden group-hover:flex"
          }`}
        >
          {c.pinned ? PinFilledIcon : PinIcon}
        </button>
        <ConversationMenu
          pinned={c.pinned}
          projects={projects}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onShare={onShare}
          onRename={onRename}
          onTogglePin={onTogglePin}
          onArchive={onArchive}
          onDelete={onDelete}
          onMoveToProject={onMoveToProject}
          getAnchor={getAnchor}
        />
      </div>
    </li>
  );
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onOpenLibrary,
  onOpenProjects,
  onOpenCode,
  onOpenSearch,
  onOpenComingSoon,
  onOpenSettingsTab,
  onOpenCompanyDashboard,
  onOpenLanguage,
  onOpenUpgradePlan,
  onOpenSupport,
  streak,
  onTogglePin,
  onArchive,
  onDelete,
  onShare,
  projects,
  onMoveToProject,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onOpenLibrary: () => void;
  onOpenProjects: () => void;
  onOpenCode: () => void;
  onOpenSearch: () => void;
  onOpenComingSoon: (title: string) => void;
  onOpenSettingsTab: (tab: SettingsTab) => void;
  onOpenCompanyDashboard: () => void;
  onOpenLanguage: () => void;
  onOpenUpgradePlan: () => void;
  onOpenSupport: () => void;
  streak: number;
  onTogglePin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  projects: { id: string; name: string }[];
  onMoveToProject: (conversationId: string, projectId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const historyAnchorRef = useRef<HTMLDivElement>(null);
  const getMenuAnchor = () => historyAnchorRef.current?.getBoundingClientRect() ?? null;
  const [collapsed, setCollapsed] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    function handleResize() {
      if (window.innerWidth >= 640) setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileOpen]);

  // Swipe to open/close the mobile history drawer, the same gesture as
  // swiping between photos — swipe right from the screen's left edge to
  // open it, swipe left anywhere to close it while it's open.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function handleTouchStart(e: TouchEvent) {
      if (window.innerWidth >= 640) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = mobileOpen || startX < 24;
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (!mobileOpen && dx > 0) setMobileOpen(true);
      else if (mobileOpen && dx < 0) setMobileOpen(false);
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mobileOpen]);

  function closeMobileThen(fn: () => void) {
    return () => {
      setMobileOpen(false);
      fn();
    };
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  function startEditing(c: ConversationSummary) {
    setEditingId(c.id);
    setEditValue(c.title);
  }

  function commitEdit() {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  }

  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  const pinnedConversations = signedIn ? conversations.filter((c) => c.pinned) : [];
  const recentConversations = signedIn ? conversations.filter((c) => !c.pinned) : [];

  const mobileHeaderAvatar = session?.user?.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={session.user.image} alt="" className="h-10 w-10 shrink-0 rounded-full" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-sm">
      {session?.user?.name?.[0] ?? "?"}
    </span>
  );

  const collapsedBody = (
    <>
      <button
        onClick={toggleCollapsed}
        aria-label="Expand sidebar"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
      >
        {PanelIcon}
      </button>
      <button
        onClick={onNewChat}
        aria-label="New chat"
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted shadow-sm transition-all hover:bg-surface-2 hover:text-foreground hover:shadow-md"
      >
        {PencilIcon}
      </button>
      <button
        onClick={onOpenSearch}
        aria-label="Search chats"
        className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
      >
        {SearchIcon}
      </button>
      <button
        onClick={onOpenLibrary}
        aria-label="Library"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
      >
        {LibraryIcon}
      </button>

      <div className="flex-1" />

      <AccountMenu variant="collapsed" onOpenSettings={onOpenSettingsTab} onOpenLanguage={onOpenLanguage} onOpenUpgradePlan={onOpenUpgradePlan} onOpenSupport={onOpenSupport} />
    </>
  );

  function renderExpandedBody(onHeaderClose: () => void, headerCloseLabel: string) {
    return (
      <>
        <div className="flex items-center justify-between px-3 py-4">
          {signedIn ? (
            <button
              onClick={closeMobileThen(() => onOpenSettingsTab("Account"))}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:hidden"
            >
              {mobileHeaderAvatar}
              <span className="min-w-0 truncate text-base font-semibold">
                {session?.user?.name ?? session?.user?.email}
              </span>
            </button>
          ) : (
            <Link href="/login" className="flex min-w-0 flex-1 items-center gap-2.5 text-base text-muted sm:hidden">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-sm">
                ?
              </span>
              Log in
            </Link>
          )}
          <button onClick={onNewChat} className="hidden items-center gap-2 text-lg font-extrabold sm:flex">
            <span className="glow-badge rounded-full px-2 py-0.5">ChatGiZa</span>
          </button>
          <div className="flex items-center gap-1">
            {streak >= 2 && (
              <span
                title={`Siku ${streak} mfululizo`}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted"
              >
                🔥 {streak}
              </span>
            )}
            <button
              onClick={onHeaderClose}
              aria-label={headerCloseLabel}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:flex"
            >
              {PanelIcon}
            </button>
          </div>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto px-2">
          <button
            onClick={closeMobileThen(onNewChat)}
            className="mb-2 flex h-10 w-full items-center gap-2 rounded-xl border border-border px-2 text-base font-medium shadow-sm transition-all hover:bg-surface-2 hover:shadow-md"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{PencilIcon}</span>
            New chat
          </button>
          <div className="hidden sm:block">
            <NavItem icon={SearchIcon} label="Search chats" onClick={closeMobileThen(onOpenSearch)} />
            <NavItem icon={ProjectsIcon} label="Projects" onClick={closeMobileThen(onOpenProjects)} />
            <NavItem icon={ImagesIcon} label="images" onClick={closeMobileThen(onOpenLibrary)} />
            <NavItem icon={LibraryIcon} label="Library" onClick={closeMobileThen(onOpenLibrary)} />

            <NavItem
              icon={KycIcon}
              label="KYC"
              onClick={() => setKycOpen((v) => !v)}
              trailing={
                <span className={`transition-transform ${kycOpen ? "rotate-180" : ""}`}>{ChevronDownIcon}</span>
              }
            />
            {kycOpen && (
              <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                <SubItem icon={PersonIcon} label="Personal KYC" onClick={closeMobileThen(() => onOpenComingSoon("Personal KYC"))} />
                <SubItem icon={BuildingIcon} label="Company KYC" onClick={closeMobileThen(onOpenCompanyDashboard)} />
              </div>
            )}

            <SectionLabel>Products</SectionLabel>
            <NavItem icon={DesignIcon} label="Design" onClick={closeMobileThen(() => onOpenComingSoon("Design"))} />
            <NavItem icon={StockIcon} label="Stock" onClick={closeMobileThen(() => onOpenComingSoon("Stock"))} />
            <NavItem icon={CodeIcon} label="Code" onClick={closeMobileThen(onOpenCode)} />
          </div>

        <div
          ref={historyAnchorRef}
          className={
            pinnedConversations.length > 0 || recentConversations.length > 0 ? "mt-3 border-t border-border pt-1" : ""
          }
        >
          {pinnedConversations.length > 0 && (
            <>
              <div className="px-2.5 py-1 text-xs text-muted">Pinned</div>
              <ul className="mb-2 space-y-0">
                {pinnedConversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    c={c}
                    active={c.id === activeId}
                    editing={editingId === c.id}
                    editValue={editValue}
                    onEditValueChange={setEditValue}
                    onCommitEdit={commitEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onSelect={closeMobileThen(() => onSelect(c.id))}
                    onShare={() => onShare(c.id)}
                    onRename={() => startEditing(c)}
                    onTogglePin={() => onTogglePin(c.id)}
                    onArchive={() => onArchive(c.id)}
                    onDelete={() => onDelete(c.id)}
                    projects={projects}
                    onMoveToProject={(projectId) => onMoveToProject(c.id, projectId)}
                    menuOpen={openMenuId === c.id}
                    onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                    getAnchor={getMenuAnchor}
                  />
                ))}
              </ul>
            </>
          )}

          {recentConversations.length > 0 && (
            <>
              <div className="px-2.5 py-1 text-xs text-muted">Recents</div>
              <ul className="space-y-0">
                {recentConversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    c={c}
                    active={c.id === activeId}
                    editing={editingId === c.id}
                    editValue={editValue}
                    onEditValueChange={setEditValue}
                    onCommitEdit={commitEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onSelect={closeMobileThen(() => onSelect(c.id))}
                    onShare={() => onShare(c.id)}
                    onRename={() => startEditing(c)}
                    onTogglePin={() => onTogglePin(c.id)}
                    onArchive={() => onArchive(c.id)}
                    onDelete={() => onDelete(c.id)}
                    projects={projects}
                    onMoveToProject={(projectId) => onMoveToProject(c.id, projectId)}
                    menuOpen={openMenuId === c.id}
                    onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                    getAnchor={getMenuAnchor}
                  />
                ))}
              </ul>
            </>
          )}

          {!signedIn && status !== "loading" && (
            <p className="px-2.5 py-2 text-xs text-muted">Log in to save and see your chat history.</p>
          )}
        </div>
        </div>

        <div className="hidden items-center px-3 py-3 sm:flex">
          <AccountMenu variant="expanded" onOpenSettings={onOpenSettingsTab} onOpenLanguage={onOpenLanguage} onOpenUpgradePlan={onOpenUpgradePlan} onOpenSupport={onOpenSupport} />
        </div>

        <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 sm:hidden">
          <button
            onClick={closeMobileThen(onOpenSearch)}
            className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2"
          >
            {SearchIcon}
            <span>Search</span>
          </button>
          <button
            onClick={closeMobileThen(() => onOpenSettingsTab("General"))}
            aria-label="Settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {GearIcon}
          </button>
          <button
            onClick={closeMobileThen(onNewChat)}
            aria-label="New chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {PencilIcon}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {mounted &&
        createPortal(
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-sidebar text-foreground shadow-md sm:hidden"
          >
            {MenuIcon}
          </button>,
          document.body
        )}

      {mounted &&
        mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-40 flex sm:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="relative z-10 flex h-full w-full flex-col bg-sidebar shadow-xl">
              {renderExpandedBody(() => setMobileOpen(false), "Close menu")}
            </aside>
          </div>,
          document.body
        )}

      {collapsed ? (
        <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-border bg-sidebar py-4 sm:flex">
          {collapsedBody}
        </aside>
      ) : (
        <aside className="hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-sidebar sm:flex">
          {renderExpandedBody(toggleCollapsed, "Collapse sidebar")}
        </aside>
      )}
    </>
  );
}
