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
};

const COLLAPSED_KEY = "chatgiza:sidebar-collapsed";

const PencilIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PanelIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
);

const LibraryIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="18" rx="1" />
    <rect x="14" y="3" width="7" height="18" rx="1" />
  </svg>
);

const ProjectsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const CodeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l-6-6 6-6" />
    <path d="M15 6l6 6-6 6" />
  </svg>
);

const DesignIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.5 2 2 6 2 11c0 3 2 4 4 4h1.5a1.5 1.5 0 0 1 1.5 1.5V18c0 2 2 4 4 4 5.5 0 9-4.5 9-10S17.5 2 12 2Z" />
    <circle cx="7.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="11" cy="6.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

const StockIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-7" />
  </svg>
);

const KycIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5 17c.5-1.7 1.8-3 3-3s2.5 1.3 3 3" />
    <path d="M14 9h6M14 13h6" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const PersonIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.3-3.6 4.4-6 8-6s6.7 2.4 8 6" />
  </svg>
);

const BuildingIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
  </svg>
);

const ImagesIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <circle cx="15" cy="9" r="5" />
    <path d="M11.5 12.5L4 20" />
  </svg>
);

const PinFilledIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="15" cy="9" r="5" fill="currentColor" />
    <path d="M11.5 12.5L4 20" />
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
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
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
    >
      <span className="flex h-5 w-5 items-center justify-center text-muted">{icon}</span>
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
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
    >
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  );
}

function ConversationMenu({
  pinned,
  onShare,
  onRename,
  onTogglePin,
  onArchive,
  onDelete,
}: {
  pinned?: boolean;
  onShare: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [
    { label: "Share", icon: ShareIcon, onClick: onShare },
    { label: "Rename", icon: PencilIcon, onClick: onRename },
    { label: pinned ? "Unpin chat" : "Pin chat", icon: pinned ? PinFilledIcon : PinIcon, onClick: onTogglePin },
    { label: "Archive", icon: ArchiveIcon, onClick: onArchive },
    { label: "Delete", icon: TrashIcon, onClick: onDelete, danger: true },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ top: rect.top, left: rect.right + 4 });
          }
          setOpen((v) => !v);
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
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className="z-50 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                  item.danger ? "text-[#b3413e]" : "text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
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
}) {
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
        className={`block w-full truncate rounded-lg px-2.5 py-2 pr-16 text-left text-sm font-medium text-foreground transition-colors ${
          active ? "bg-surface-2" : "hover:bg-surface-2"
        }`}
      >
        {c.title}
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
          onShare={onShare}
          onRename={onRename}
          onTogglePin={onTogglePin}
          onArchive={onArchive}
          onDelete={onDelete}
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
  onTogglePin,
  onArchive,
  onDelete,
  onShare,
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
  onTogglePin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

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

  const { status } = useSession();
  const signedIn = status === "authenticated";
  const pinnedConversations = signedIn ? conversations.filter((c) => c.pinned) : [];
  const recentConversations = signedIn ? conversations.filter((c) => !c.pinned) : [];

  if (collapsed) {
    return (
      <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-border bg-surface py-4 sm:flex">
        <button
          onClick={toggleCollapsed}
          aria-label="Expand sidebar"
          className="mb-4 flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
        >
          {PanelIcon}
        </button>
        <button
          onClick={onNewChat}
          aria-label="New chat"
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted shadow-sm transition-all hover:bg-surface-2 hover:text-foreground hover:shadow-md"
        >
          {PencilIcon}
        </button>
        <button
          onClick={onOpenSearch}
          aria-label="Search chats"
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
        >
          {SearchIcon}
        </button>
        <button
          onClick={onOpenLibrary}
          aria-label="Library"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
        >
          {LibraryIcon}
        </button>

        <div className="flex-1" />

        <AccountMenu variant="collapsed" onOpenSettings={onOpenSettingsTab} onOpenComingSoon={onOpenComingSoon} onOpenLanguage={onOpenLanguage} onOpenUpgradePlan={onOpenUpgradePlan} />
      </aside>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-surface sm:flex">
      <div className="flex items-center justify-between px-3 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center text-background text-xs font-bold">
            W
          </span>
          ChatGiZa
        </Link>
        <button
          onClick={toggleCollapsed}
          aria-label="Collapse sidebar"
          className="text-muted hover:text-foreground transition-colors"
        >
          {PanelIcon}
        </button>
      </div>

      <div className="px-2">
        <button
          onClick={onNewChat}
          className="mb-2 flex w-full items-center gap-2 rounded-full border border-border px-3 py-2.5 text-sm font-medium shadow-sm transition-all hover:bg-surface-2 hover:shadow-md"
        >
          <span className="flex h-5 w-5 items-center justify-center">{PencilIcon}</span>
          New chat
        </button>
        <NavItem icon={SearchIcon} label="Search chats" onClick={onOpenSearch} />
        <NavItem icon={ProjectsIcon} label="Projects" onClick={onOpenProjects} />
        <NavItem icon={ImagesIcon} label="images" onClick={onOpenLibrary} />
        <NavItem icon={LibraryIcon} label="Library" onClick={onOpenLibrary} />

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
            <SubItem icon={PersonIcon} label="Personal KYC" onClick={() => onOpenComingSoon("Personal KYC")} />
            <SubItem icon={BuildingIcon} label="Company KYC" onClick={onOpenCompanyDashboard} />
          </div>
        )}

        <SectionLabel>Products</SectionLabel>
        <NavItem icon={DesignIcon} label="Design" onClick={() => onOpenComingSoon("Design")} />
        <NavItem icon={StockIcon} label="Stock" onClick={() => onOpenComingSoon("Stock")} />
        <NavItem icon={CodeIcon} label="Code" onClick={onOpenCode} />
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-2">
        {pinnedConversations.length > 0 && (
          <>
            <div className="px-2.5 py-1 text-xs text-muted">Pinned</div>
            <ul className="mb-3 space-y-0.5">
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
                  onSelect={() => onSelect(c.id)}
                  onShare={() => onShare(c.id)}
                  onRename={() => startEditing(c)}
                  onTogglePin={() => onTogglePin(c.id)}
                  onArchive={() => onArchive(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </ul>
          </>
        )}

        {recentConversations.length > 0 && (
          <>
            <div className="px-2.5 py-1 text-xs text-muted">Recents</div>
            <ul className="space-y-0.5">
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
                  onSelect={() => onSelect(c.id)}
                  onShare={() => onShare(c.id)}
                  onRename={() => startEditing(c)}
                  onTogglePin={() => onTogglePin(c.id)}
                  onArchive={() => onArchive(c.id)}
                  onDelete={() => onDelete(c.id)}
                />
              ))}
            </ul>
          </>
        )}

        {!signedIn && status !== "loading" && (
          <p className="px-2.5 py-2 text-xs text-muted">Log in to save and see your chat history.</p>
        )}
      </div>

      <div className="flex items-center border-t border-border px-3 py-3">
        <AccountMenu variant="expanded" onOpenSettings={onOpenSettingsTab} onOpenComingSoon={onOpenComingSoon} onOpenLanguage={onOpenLanguage} onOpenUpgradePlan={onOpenUpgradePlan} />
      </div>
    </aside>
  );
}
