"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import AccountMenu, { type SettingsTab } from "@/components/AccountMenu";
import CreateProjectModal from "@/components/CreateProjectModal";

export type ConversationSummary = {
  id: string;
  title: string;
  pinned?: boolean;
  updatedAt?: number;
  projectId?: string;
};

const COLLAPSED_KEY = "chatgiza:sidebar-collapsed";


const PencilIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.943 1.25H13.5a.75.75 0 0 1 0 1.5H12c-2.378 0-4.086.002-5.386.176c-1.279.172-2.05.5-2.62 1.069c-.569.57-.896 1.34-1.068 2.619c-.174 1.3-.176 3.008-.176 5.386s.002 4.086.176 5.386c.172 1.279.5 2.05 1.069 2.62c.57.569 1.34.896 2.619 1.068c1.3.174 3.008.176 5.386.176s4.086-.002 5.386-.176c1.279-.172 2.05-.5 2.62-1.069c.569-.57.896-1.34 1.068-2.619c.174-1.3.176-3.008.176-5.386v-1.5a.75.75 0 0 1 1.5 0v1.557c0 2.309 0 4.118-.19 5.53c-.194 1.444-.6 2.584-1.494 3.479c-.895.895-2.035 1.3-3.48 1.494c-1.411.19-3.22.19-5.529.19h-.114c-2.309 0-4.118 0-5.53-.19c-1.444-.194-2.584-.6-3.479-1.494c-.895-.895-1.3-2.035-1.494-3.48c-.19-1.411-.19-3.22-.19-5.529v-.114c0-2.309 0-4.118.19-5.53c.194-1.444.6-2.584 1.494-3.479c.895-.895 2.035-1.3 3.48-1.494c1.411-.19 3.22-.19 5.529-.19m4.827 1.026a3.503 3.503 0 0 1 4.954 4.953l-6.648 6.649c-.371.37-.604.604-.863.806a5.3 5.3 0 0 1-.987.61c-.297.141-.61.245-1.107.411l-2.905.968a1.492 1.492 0 0 1-1.887-1.887l.968-2.905c.166-.498.27-.81.411-1.107q.252-.526.61-.987c.202-.26.435-.492.806-.863zm3.893 1.06a2.003 2.003 0 0 0-2.832 0l-.376.377q.032.145.098.338c.143.413.415.957.927 1.469a3.9 3.9 0 0 0 1.807 1.025l.376-.376a2.003 2.003 0 0 0 0-2.832m-1.558 4.391a5.4 5.4 0 0 1-1.686-1.146a5.4 5.4 0 0 1-1.146-1.686L11.218 9.95c-.417.417-.58.582-.72.76a4 4 0 0 0-.437.71c-.098.203-.172.423-.359.982l-.431 1.295l1.032 1.033l1.295-.432c.56-.187.779-.261.983-.358q.378-.18.71-.439c.177-.139.342-.302.759-.718z"
    />
  </svg>
);

const SearchIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const AutomationIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 1 2.64 6.36" />
    <path d="M3 18v-4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
);

const QuantaraIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
    <line x1="8" x2="16" y1="12" y2="12" />
  </svg>
);

const BookIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const GearIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const PanelIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h1M9 2h7a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H9M9 2v20" />
    <path d="M17 15c-.7-1.26-1.74-2.3-3-3c1.26-.7 2.3-1.74 3-3" />
  </svg>
);

const StreakBadgeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m20 20l-4.05-4.05m0 0a7 7 0 1 0-9.9-9.9a7 7 0 0 0 9.9 9.9" />
  </svg>
);

const MenuIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="16" x2="14" y2="16" />
  </svg>
);

const LibraryIcon = (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 5.96v6.64c0 .84 0 1.26-.163 1.58a1.5 1.5 0 0 1-.656.656C7.86 15 7.44 15 6.601 15h-.2c-.84 0-1.26 0-1.58-.164a1.5 1.5 0 0 1-.319-.218a1.5 1.5 0 0 1-.319.218C3.862 15 3.442 15 2.603 15h-.2c-.84 0-1.26 0-1.58-.164a1.5 1.5 0 0 1-.656-.656c-.163-.321-.163-.741-.163-1.58V3.4c0-.84 0-1.26.163-1.58c.144-.282.373-.512.656-.656c.321-.163.741-.163 1.58-.163h.2c.84 0 1.26 0 1.58.163q.174.09.319.218q.145-.13.319-.218c.321-.163.741-.163 1.58-.163h.2c.84 0 1.26 0 1.58.163c.25.128.459.323.604.562c.268-.208.672-.317 1.43-.519l.193-.052c.811-.217 1.22-.326 1.57-.25c.31.065.591.227.803.463c.241.268.35.673.567 1.48l2.38 8.89c.217.812.326 1.22.251 1.57c-.066.31-.228.591-.464.803c-.268.241-.673.35-1.48.567l-.193.052c-.812.217-1.22.326-1.57.251a1.5 1.5 0 0 1-.803-.464c-.241-.268-.35-.673-.567-1.48l-1.9-7.08zm1.66-3.84l-.193.052c-.422.113-.68.183-.869.25a1.3 1.3 0 0 0-.2.089l-.006.005a.5.5 0 0 0-.155.268l-.001.008v.033c0 .035.006.092.023.184c.036.197.104.456.217.877l2.38 8.89c.113.422.183.68.25.868a1.3 1.3 0 0 0 .088.2l.005.006a.5.5 0 0 0 .268.154h.002l.007.001h.033c.035 0 .092-.006.184-.023c.197-.036.456-.104.877-.217l.193-.051c.422-.113.68-.183.869-.25a1.3 1.3 0 0 0 .199-.09l.007-.004a.5.5 0 0 0 .154-.268v-.009q.002-.008.001-.032a1 1 0 0 0-.023-.184a13 13 0 0 0-.217-.877l-2.38-8.89a13 13 0 0 0-.25-.87a1.3 1.3 0 0 0-.089-.199l-.005-.006a.5.5 0 0 0-.268-.155l-.008-.002h-.033a1 1 0 0 0-.184.023c-.197.036-.456.104-.877.217zM2.6 1.999h-.2c-.437 0-.704 0-.904.017a1.3 1.3 0 0 0-.216.034l-.007.003a.5.5 0 0 0-.222.226l-.009.032a1 1 0 0 0-.025.184c-.016.2-.017.467-.017.904v9.2c0 .436 0 .704.017.904a1.3 1.3 0 0 0 .034.216l.004.007a.5.5 0 0 0 .218.218l.007.004l.032.009c.034.008.09.017.184.025c.2.016.467.017.904.017h.2c.437 0 .704 0 .904-.017a1.3 1.3 0 0 0 .216-.034l.007-.004a.5.5 0 0 0 .222-.225l.009-.032a1 1 0 0 0 .025-.184c.016-.2.017-.467.017-.904v-9.2c0-.437 0-.704-.017-.904a1.3 1.3 0 0 0-.034-.216l-.004-.008a.5.5 0 0 0-.225-.22l-.032-.01a1 1 0 0 0-.184-.025C3.304 2 3.037 2 2.6 2M5 12.6V3.4c0-.437 0-.704.017-.904a1.3 1.3 0 0 1 .034-.216l.003-.007a.5.5 0 0 1 .226-.222l.032-.009a1 1 0 0 1 .184-.025C5.696 2 5.963 2 6.4 2h.2c.437 0 .704 0 .904.017a1.3 1.3 0 0 1 .216.034l.007.004a.5.5 0 0 1 .222.225l.009.032c.008.034.017.09.025.184c.016.2.017.467.017.904v9.2c0 .436 0 .704-.017.904a1.3 1.3 0 0 1-.034.216l-.004.008a.5.5 0 0 1-.218.217l-.007.004l-.032.009a1 1 0 0 1-.184.025c-.2.016-.467.017-.904.017h-.2c-.437 0-.704 0-.904-.017a1.3 1.3 0 0 1-.216-.034l-.008-.004a.5.5 0 0 1-.218-.218v-.002l-.003-.005l-.009-.032a1 1 0 0 1-.025-.184c-.016-.2-.017-.467-.017-.904"
    />
  </svg>
);

// Same folder glyph the Android app uses for Projects.
const ProjectsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.33984,3.09961C9.12165,3.09969 9.88333,3.3478 10.5156,3.80762L11.793,4.73633C12.1176,4.97244 12.5087,5.09953 12.9102,5.09961H18.2002C20.2435,5.09971 21.9003,6.75651 21.9004,8.7998V17.2002C21.9003,19.2435 20.2435,20.9003 18.2002,20.9004H5.7998C3.75651,20.9003 2.09972,19.2435 2.09961,17.2002V6.7998C2.09972,4.75651 3.75651,3.09971 5.7998,3.09961H8.33984ZM3.90039,11.9004V17.2002C3.9005,18.2494 4.75062,19.0995 5.7998,19.0996H18.2002C19.2494,19.0995 20.0995,18.2494 20.0996,17.2002V11.9004H3.90039ZM5.7998,4.90039C4.75062,4.9005 3.9005,5.75062 3.90039,6.7998V10.0996H20.0996V8.7998C20.0995,7.75062 19.2494,6.9005 18.2002,6.90039H12.9102C12.1284,6.90031 11.3667,6.6522 10.7344,6.19238L9.45703,5.26367C9.13238,5.02756 8.74127,4.90047 8.33984,4.90039H5.7998Z" />
  </svg>
);

const PlusIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// Shown next to the empty-state hint under "Projects" ("Pin projects to
// keep them here").
const PinIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

// Small icons for the project row's "..." menu (Unpin / Edit details /
// Archive / Delete), matching the reference's icon-per-row layout.
const PinOffIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
    <path d="m2 2 20 20" />
    <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
  </svg>
);

const SmallPencilIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
);

const ArchiveIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="5" x="2" y="3" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

const SmallTrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Right side of the "Chats and tasks" header -- sort, matching the
// reference layout (currently opens the same "coming soon" toast every
// other not-yet-built control in this sidebar uses, e.g. Search chats'
// neighbors -- no sort order to switch between yet).
const SortIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
);

// App-mode toolbar icons (only shown when hideWordmark -- the installed
// PWA or the Electron desktop app -- replacing the "ChatGiZa" wordmark).
const AppToolbarMenuIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
const AppToolbarSidebarIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);
const AppToolbarSearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const AppToolbarBackIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const AppToolbarForwardIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const CodeIcon = (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 8l-4 4l4 4m10-8l4 4l-2.5 2.5M14 4l-1.201 4.805m-.802 3.207l-2 7.988M3 3l18 18" />
  </svg>
);

const CodePillIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="m7.375 16.781l1.25-1.562L4.601 12l4.024-3.219l-1.25-1.562l-5 4a1 1 0 0 0 0 1.562zm9.25-9.562l-1.25 1.562L19.399 12l-4.024 3.219l1.25 1.562l5-4a1 1 0 0 0 0-1.562zm-1.649-4.003l-4 18l-1.953-.434l4-18z"
    />
  </svg>
);

const AskPillIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 9c0 3.87-3.36 7-7.5 7l-.93 1.12l-.55.66c-.47.56-1.37.44-1.68-.23L5 14.6C3.18 13.32 2 11.29 2 9c0-3.87 3.36-7 7.5-7c3.02 0 5.63 1.67 6.8 4.07c.45.89.7 1.88.7 2.93" />
    <path d="M22 12.86c0 2.29-1.18 4.32-3 5.6l-1.34 2.95c-.31.67-1.21.8-1.68.23l-1.48-1.78c-2.42 0-4.58-1.07-5.93-2.74L9.5 16c4.14 0 7.5-3.13 7.5-7c0-1.05-.25-2.04-.7-2.93c3.27.75 5.7 3.51 5.7 6.79M7 9h5" />
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

// Hover-only shortcut next to "Projects" -- opens the same full Projects
// overview as clicking the "Projects" label itself.
const OpenProjectsIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
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

const MediaFeedIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 15l4.5-4.5a2 2 0 0 1 2.8 0L15 15" />
    <circle cx="16.5" cy="8.5" r="1.5" />
    <path d="M14 15l1.5-1.5a2 2 0 0 1 2.8 0L21 16" />
  </svg>
);

const LiveVisionIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 7l-7 5 7 5V7Z" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);

const MoreDotsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
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
      className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">{icon}</span>
      {label}
      {trailing && <span className="ml-auto">{trailing}</span>}
    </button>
  );
}

function SubItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">{icon}</span>
      {label}
    </button>
  );
}

type MenuCoords = { left: number; top?: number; bottom?: number };

function computeMenuCoords(rect: DOMRect, estimatedHeight: number, menuWidth = 240): MenuCoords {
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
  id,
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
  onOpenComingSoon,
  getAnchor,
}: {
  id: string;
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
  onOpenComingSoon: (title: string) => void;
  getAnchor: () => DOMRect | null;
}) {
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [openInOpen, setOpenInOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moveTriggerRef = useRef<HTMLButtonElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const [moveCoords, setMoveCoords] = useState<MenuCoords | null>(null);
  const openInTriggerRef = useRef<HTMLButtonElement>(null);
  const openInMenuRef = useRef<HTMLDivElement>(null);
  const [openInCoords, setOpenInCoords] = useState<MenuCoords | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  // Adjusted during render (rather than an effect) since it's a pure reset
  // keyed off `open` itself.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setMoveOpen(false);
      setOpenInOpen(false);
      setConfirmDelete(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    // Recompute on every open (not just the trigger button's own click) so a
    // long-press-triggered open still lands at the right anchor. Clamped so
    // the fixed-width panel never overflows off the right edge of narrow
    // (mobile) viewports. Reads live layout via getAnchor()/window, so it
    // must stay an effect rather than a render-time computation.
    const anchor = getAnchor();
    if (anchor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCoords(computeMenuCoords(anchor, 300, 176));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function close() {
      onOpenChange(false);
      setMoveOpen(false);
      setOpenInOpen(false);
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        moveMenuRef.current &&
        !moveMenuRef.current.contains(target) &&
        openInMenuRef.current &&
        !openInMenuRef.current.contains(target)
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
              className="z-50 w-44 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
            >
            {confirmDelete ? (
              <div className="p-1">
                <p className="px-1 pb-0.5 text-xs font-medium text-foreground">Delete this chat?</p>
                <p className="px-1 pb-1.5 text-[11px] text-muted">This can&apos;t be undone.</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="flex-1 rounded-lg border border-border px-2 py-1 text-xs transition-colors hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      onOpenChange(false);
                    }}
                    className="flex-1 rounded-lg bg-[#b3413e] px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  ref={openInTriggerRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!openInOpen && openInTriggerRef.current) {
                      const rect = openInTriggerRef.current.getBoundingClientRect();
                      setOpenInCoords(computeMenuCoords(rect, 160, 176));
                    }
                    setOpenInOpen((v) => !v);
                  }}
                  className="menu-item"
                >
                  <span className="flex-1 truncate">Open in</span>
                  <span className="text-muted">{ChevronRightIcon}</span>
                </button>

                <div className="my-1 border-t border-border" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin();
                    onOpenChange(false);
                  }}
                  className="menu-item"
                >
                  <span className="flex-1 truncate">{pinned ? "Unpin chat" : "Pin chat"}</span>
                  <span className="text-xs text-muted">P</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename();
                    onOpenChange(false);
                  }}
                  className="menu-item"
                >
                  <span className="flex-1 truncate">Rename</span>
                  <span className="text-xs text-muted">R</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare();
                    onOpenChange(false);
                  }}
                  className="menu-item"
                >
                  <span className="flex-1 truncate">Share</span>
                  <span className="text-xs text-muted">S</span>
                </button>

                <div className="my-1 border-t border-border" />

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
                  <span className="flex-1 truncate">Move to project</span>
                  <span className="text-muted">{ChevronRightIcon}</span>
                </button>

                <div className="my-1 border-t border-border" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                    onOpenChange(false);
                  }}
                  className="menu-item"
                >
                  <span className="flex-1 truncate">Archive</span>
                  <span className="text-xs text-muted">A</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="menu-item delete"
                >
                  <span className="flex-1 truncate">Delete</span>
                  <span className="text-xs opacity-70">D</span>
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
      {openInOpen &&
        openInCoords &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpenInOpen(false)}
            />
            <div
              ref={openInMenuRef}
              style={{
                position: "fixed",
                left: openInCoords.left,
                ...(openInCoords.top !== undefined ? { top: openInCoords.top } : { bottom: openInCoords.bottom }),
              }}
              className="z-50 w-44 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`${window.location.origin}${window.location.pathname}?c=${id}`, "_blank");
                  setOpenInOpen(false);
                  onOpenChange(false);
                }}
                className="menu-item"
              >
                <span className="flex-1 truncate">New Window</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComingSoon("VS Code");
                  setOpenInOpen(false);
                  onOpenChange(false);
                }}
                className="menu-item"
              >
                <span className="flex-1 truncate">VS Code</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComingSoon("Explorer");
                  setOpenInOpen(false);
                  onOpenChange(false);
                }}
                className="menu-item"
              >
                <span className="flex-1 truncate">Explorer</span>
              </button>
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
  generating,
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
  onOpenComingSoon,
  menuOpen,
  onMenuOpenChange,
}: {
  c: ConversationSummary;
  active: boolean;
  generating: boolean;
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
  onOpenComingSoon: (title: string) => void;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const rowRef = useRef<HTMLLIElement>(null);

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
    <li ref={rowRef} className="group relative">
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
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {generating && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-75" />
            )}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${generating ? "bg-foreground" : "bg-muted"}`} />
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-foreground">{c.title}</span>
        </span>
      </button>
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        <ConversationMenu
          id={c.id}
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
          onOpenComingSoon={onOpenComingSoon}
          getAnchor={() => rowRef.current?.getBoundingClientRect() ?? null}
        />
      </div>
    </li>
  );
}

// Trimmed version of ConversationMenu -- Unpin / Edit details / Archive /
// Delete, matching the reference's project-row menu (rows shown here are
// always pinned already, since only pinned projects appear in this list, so
// there's no separate "Pin" state to branch on).
function ProjectRowMenu({
  open,
  onOpenChange,
  onUnpin,
  onRename,
  onArchive,
  onDelete,
  getAnchor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnpin: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
  getAnchor: () => DOMRect | null;
}) {
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setConfirmDelete(false);
  }

  useEffect(() => {
    if (!open) return;
    const anchor = getAnchor();
    if (anchor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCoords(computeMenuCoords(anchor, 170, 128));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function close() {
      onOpenChange(false);
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target) && menuRef.current && !menuRef.current.contains(target)) {
        close();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

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

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        aria-label="Project options"
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
            <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: coords.left,
                ...(coords.top !== undefined ? { top: coords.top } : { bottom: coords.bottom }),
              }}
              className="z-50 w-32 rounded-xl border border-border bg-surface p-1 shadow-lg"
            >
              {confirmDelete ? (
                <div className="p-1">
                  <p className="px-1 pb-0.5 text-xs font-medium text-foreground">Delete this project?</p>
                  <p className="px-1 pb-1.5 text-[11px] text-muted">This can&apos;t be undone.</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(false);
                      }}
                      className="flex-1 rounded-lg border border-border px-2 py-1 text-xs transition-colors hover:bg-surface-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        onOpenChange(false);
                      }}
                      className="flex-1 rounded-lg bg-[#b3413e] px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin();
                      onOpenChange(false);
                    }}
                    className="menu-item compact"
                  >
                    <span className="icon">{PinOffIcon}</span>
                    <span className="flex-1 truncate">Unpin</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename();
                      onOpenChange(false);
                    }}
                    className="menu-item compact"
                  >
                    <span className="icon">{SmallPencilIcon}</span>
                    <span className="flex-1 truncate">Edit details</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive();
                      onOpenChange(false);
                    }}
                    className="menu-item compact"
                  >
                    <span className="icon">{ArchiveIcon}</span>
                    <span className="flex-1 truncate">Archive</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(true);
                    }}
                    className="menu-item delete compact"
                  >
                    <span className="icon">{SmallTrashIcon}</span>
                    <span className="flex-1 truncate">Delete</span>
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

function ProjectRow({
  project,
  editing,
  editValue,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onOpen,
  onUnpin,
  onRename,
  onArchive,
  onDelete,
  menuOpen,
  onMenuOpenChange,
}: {
  project: { id: string; name: string };
  editing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onOpen: () => void;
  onUnpin: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);

  if (editing) {
    return (
      <li>
        <input
          autoFocus
          onFocus={(e) => e.target.select()}
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
    <li ref={rowRef} className="group relative">
      <button
        onClick={onOpen}
        className="flex h-9 w-full items-center gap-2 rounded-xl px-2.5 pr-9 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted">{ProjectsIcon}</span>
        <span className="truncate">{project.name}</span>
      </button>
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <ProjectRowMenu
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onUnpin={onUnpin}
          onRename={onRename}
          onArchive={onArchive}
          onDelete={onDelete}
          getAnchor={() => rowRef.current?.getBoundingClientRect() ?? null}
        />
      </div>
    </li>
  );
}

export default function ChatSidebar({
  hideWordmark,
  conversations,
  activeId,
  streamingId,
  currentProjectId,
  onSelect,
  onNewChat,
  onRename,
  onOpenLibrary,
  onOpenMedia,
  onOpenEbook,
  onOpenLiveVision,
  onOpenCode,
  onOpenSearch,
  onOpenComingSoon,
  onOpenSettingsTab,
  onOpenCompanyDashboard,
  onOpenLanguage,
  onOpenSupport,
  onOpenScheduled,
  onOpenProjects,
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onTogglePinProject,
  onTogglePin,
  onArchive,
  onDelete,
  onShare,
  projects,
  onMoveToProject,
}: {
  // Hides the "ChatGiZa" wordmark in the sidebar header when running
  // inside the installed app (PWA or the Electron desktop app) -- the OS
  // window/taskbar already shows the app's identity there, so repeating
  // it in-content just duplicates it.
  hideWordmark?: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  // Non-null while the active conversation's assistant reply is still
  // streaming -- used to pulse that row's dot in the sidebar so a
  // still-running generation stays visible even if you scroll away.
  streamingId?: string | null;
  // The project whose nested chat list should show expanded -- either the
  // one whose own page is open, or the one owning the active chat.
  currentProjectId?: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onOpenLibrary: () => void;
  onOpenMedia: () => void;
  onOpenEbook: () => void;
  onOpenLiveVision: () => void;
  onOpenCode: () => void;
  onOpenSearch: () => void;
  onOpenComingSoon: (title: string) => void;
  onOpenSettingsTab: (tab: SettingsTab) => void;
  onOpenCompanyDashboard: () => void;
  onOpenLanguage: () => void;
  onOpenSupport: () => void;
  onOpenScheduled: () => void;
  onOpenProjects: () => void;
  onOpenProject: (id: string) => void;
  onCreateProject: (id: string, name: string, description?: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onTogglePinProject: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  projects: { id: string; name: string; pinned?: boolean }[];
  onMoveToProject: (conversationId: string, projectId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectValue, setEditingProjectValue] = useState("");
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  // The "Projects" and "Chats and tasks" section headers each fold their
  // own list away independently -- separate from any per-project chat
  // nesting (that one auto-follows the current project; these two are
  // plain manual show/hide for the whole section).
  const [projectsSectionOpen, setProjectsSectionOpen] = useState(true);
  const [chatsSectionOpen, setChatsSectionOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration escape hatch: localStorage isn't available during SSR, so
    // this can't be a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Lets the app-mode toolbar (rendered outside this component, in
  // chatgiza/page.tsx's standalone top bar) trigger the same
  // collapse/expand this component already owns, without lifting the
  // state up -- a plain window event is enough for this one action.
  useEffect(() => {
    window.addEventListener("chatgiza:toggle-sidebar", toggleCollapsed);
    return () => window.removeEventListener("chatgiza:toggle-sidebar", toggleCollapsed);
  }, []);

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

  function startEditingProject(p: { id: string; name: string }) {
    setEditingProjectId(p.id);
    setEditingProjectValue(p.name);
  }

  function commitProjectEdit() {
    if (editingProjectId && editingProjectValue.trim()) {
      onRenameProject(editingProjectId, editingProjectValue.trim());
    }
    setEditingProjectId(null);
  }

  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  // Chats that belong to a project show nested under that project's own row
  // instead -- keeping them here too would show every project chat twice.
  const pinnedConversations = signedIn ? conversations.filter((c) => c.pinned && !c.projectId) : [];
  const recentConversations = signedIn ? conversations.filter((c) => !c.pinned && !c.projectId) : [];
  const pinnedProjects = projects.filter((p) => p.pinned);

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

      <AccountMenu variant="collapsed" onOpenSettings={onOpenSettingsTab} onOpenLanguage={onOpenLanguage} onOpenSupport={onOpenSupport} />
    </>
  );

  function renderExpandedBody(onHeaderClose: () => void, headerCloseLabel: string) {
    return (
      <>
        <div className={`flex items-center justify-between px-3 ${hideWordmark ? "pb-4 pt-2" : "py-4"}`}>
          <button
            onClick={closeMobileThen(() => onOpenSettingsTab("Account"))}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:hidden"
          >
            {mobileHeaderAvatar}
            <span className="min-w-0 truncate text-base font-semibold">
              {session?.user?.name ?? session?.user?.email}
            </span>
          </button>
          {hideWordmark ? (
            // Spread across the sidebar's full width (up to its right
            // border) instead of bunching at the left with dead space
            // after -- and sit close to the top of the window/titlebar,
            // not with a large gap above it.
            <div className="hidden w-full items-center justify-between text-muted sm:flex">
              <button
                onClick={toggleCollapsed}
                aria-label="Menu"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {AppToolbarMenuIcon}
              </button>
              <button
                onClick={toggleCollapsed}
                aria-label="Toggle sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {AppToolbarSidebarIcon}
              </button>
              <button
                onClick={closeMobileThen(onOpenSearch)}
                aria-label="Search chats"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {AppToolbarSearchIcon}
              </button>
              <button
                onClick={() => window.history.back()}
                aria-label="Back"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {AppToolbarBackIcon}
              </button>
              <button
                onClick={() => window.history.forward()}
                aria-label="Forward"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {AppToolbarForwardIcon}
              </button>
            </div>
          ) : (
            <button onClick={onNewChat} className="hidden items-center gap-2 text-sm font-bold sm:flex">
              <span className="glow-badge rounded-full px-1.5 py-0.5">ChatGiZa</span>
            </button>
          )}
          {!hideWordmark && (
            <div className="flex items-center gap-1">
              <span className="flex items-center justify-center text-muted">{StreakBadgeIcon}</span>
              <button
                onClick={onHeaderClose}
                aria-label={headerCloseLabel}
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:flex"
              >
                {PanelIcon}
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto px-2">
          <button
            onClick={closeMobileThen(onOpenScheduled)}
            className="mb-3 flex h-12 w-full items-center gap-3 rounded-xl bg-surface-2 px-3 text-base font-medium transition-colors hover:bg-surface sm:hidden"
          >
            <span className="text-muted">{AutomationIcon}</span>
            Automations
          </button>


          {/* Was only shown in standalone/installed-app mode -- now
              always shown, replacing the separate "Code" row further
              down in the nav list with this pill instead. */}
          <div className="mb-2 hidden items-center gap-1 rounded-xl bg-[#212121] p-1 sm:flex">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface px-2 py-1 text-center text-sm font-medium text-foreground shadow-sm">
              {AskPillIcon}
              Ask
            </span>
            <Link
              href="/chatgiza/build"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-center text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {CodePillIcon}
              Code
            </Link>
          </div>

          <button
            onClick={closeMobileThen(onNewChat)}
            className="mb-2 hidden h-10 w-full items-center gap-2 rounded-xl border border-border px-2 text-sm font-medium shadow-sm transition-all hover:bg-surface-2 hover:shadow-md sm:flex"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{PencilIcon}</span>
            New chat
          </button>
          <div className="hidden sm:block">
            <NavItem icon={SearchIcon} label="Search chats" onClick={closeMobileThen(onOpenSearch)} />
            <NavItem icon={AutomationIcon} label="Automations" onClick={closeMobileThen(onOpenScheduled)} />
            <NavItem icon={BookIcon} label="E-book" onClick={closeMobileThen(onOpenEbook)} />
            <NavItem icon={QuantaraIcon} label="Quantara" onClick={closeMobileThen(onOpenMedia)} />
          </div>

        <div className="mt-3 pt-1">
          {/* Own section, always visible (not gated on having any pinned
              projects yet) -- the "+" opens CreateProjectModal to ask for
              a real name/goal up front, rather than ProjectsPanel's own
              "New project" button, which creates the project immediately
              under that literal placeholder name. The empty state below
              tells you this is where pinned projects would show up, same
              shape as the Chats section below it. */}
          <div className="group flex items-center justify-between px-2.5 py-1">
            <div className="flex items-center gap-1">
              <button
                onClick={closeMobileThen(onOpenProjects)}
                className="text-xs text-muted transition-colors hover:text-foreground"
              >
                Projects
              </button>
              <button
                onClick={() => setProjectsSectionOpen((v) => !v)}
                aria-label={projectsSectionOpen ? "Collapse projects" : "Expand projects"}
                className={`flex h-4 w-4 items-center justify-center text-muted transition-transform hover:text-foreground ${
                  projectsSectionOpen ? "rotate-90" : ""
                }`}
              >
                {ChevronRightIcon}
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              {/* Only shows on hover of this row -- same destination as
                  clicking the "Projects" label itself. */}
              <button
                onClick={closeMobileThen(onOpenProjects)}
                aria-label="Open Projects"
                className="hidden h-5 w-5 items-center justify-center rounded-md text-muted opacity-0 transition-colors hover:bg-surface-2 hover:text-foreground group-hover:flex group-hover:opacity-100"
              >
                {OpenProjectsIcon}
              </button>
              <button
                onClick={closeMobileThen(() => setCreateProjectOpen(true))}
                aria-label="New project"
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {PlusIcon}
              </button>
            </div>
          </div>
          {/* Only pinned projects show here -- a project that merely
              exists (e.g. an old "New project" nobody ever pinned)
              shouldn't crowd this out. New projects created via
              CreateProjectModal default to pinned, so they show up here
              right away without an extra step. */}
          {projectsSectionOpen && (
          <>
          {pinnedProjects.length === 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted">
              <span className="shrink-0">{PinIcon}</span>
              <span>Pin projects to keep them here</span>
            </div>
          ) : (
            <ul className="mb-2 space-y-0">
              {pinnedProjects.map((p) => {
                const projectChats = conversations.filter((c) => c.projectId === p.id);
                const isCurrent = currentProjectId === p.id;
                return (
                  <li key={p.id}>
                    <ProjectRow
                      project={p}
                      editing={editingProjectId === p.id}
                      editValue={editingProjectValue}
                      onEditValueChange={setEditingProjectValue}
                      onCommitEdit={commitProjectEdit}
                      onCancelEdit={() => setEditingProjectId(null)}
                      onOpen={closeMobileThen(() => onOpenProject(p.id))}
                      onUnpin={() => onTogglePinProject(p.id)}
                      onRename={() => startEditingProject(p)}
                      onArchive={() => onOpenComingSoon("Archive project")}
                      onDelete={() => onDeleteProject(p.id)}
                      menuOpen={openProjectMenuId === p.id}
                      onMenuOpenChange={(open) => setOpenProjectMenuId(open ? p.id : null)}
                    />
                    {/* Chats created inside this project nest directly
                        underneath it (matching the reference's own sidebar)
                        instead of also appearing in "Chats and tasks" below,
                        which already excludes anything with a projectId.
                        Clicking the project row itself opens the project's
                        own page (Instructions/Memory/Context) -- clicking a
                        chat here opens that chat instead. Only the
                        "current" project shows its list; leaving it folds
                        this back up automatically -- no separate toggle. */}
                    {projectChats.length > 0 && (
                      <div
                        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
                          isCurrent ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <ul className="space-y-0 overflow-hidden pl-4">
                          {projectChats.map((c) => (
                            <ConversationRow
                              key={c.id}
                              c={c}
                              active={c.id === activeId}
                              generating={c.id === activeId && Boolean(streamingId)}
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
                              onOpenComingSoon={onOpenComingSoon}
                              menuOpen={openMenuId === c.id}
                              onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                            />
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          </>
          )}

          {(pinnedConversations.length > 0 || recentConversations.length > 0) && (
            <div className="mt-3">
              <div className="flex items-center justify-between px-2.5 py-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted">Chats and tasks</span>
                  <button
                    onClick={() => setChatsSectionOpen((v) => !v)}
                    aria-label={chatsSectionOpen ? "Collapse chats" : "Expand chats"}
                    className={`flex h-4 w-4 items-center justify-center text-muted transition-transform hover:text-foreground ${
                      chatsSectionOpen ? "rotate-90" : ""
                    }`}
                  >
                    {ChevronRightIcon}
                  </button>
                </div>
                <button
                  onClick={closeMobileThen(() => onOpenComingSoon("Sort"))}
                  aria-label="Sort"
                  className="flex h-5 w-5 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {SortIcon}
                </button>
              </div>

              {chatsSectionOpen && pinnedConversations.length > 0 && (
                <ul className="mb-2 space-y-0">
                  {pinnedConversations.map((c) => (
                    <ConversationRow
                      key={c.id}
                      c={c}
                      active={c.id === activeId}
                      generating={c.id === activeId && Boolean(streamingId)}
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
                      onOpenComingSoon={onOpenComingSoon}
                      menuOpen={openMenuId === c.id}
                      onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                    />
                  ))}
                </ul>
              )}

              {chatsSectionOpen && recentConversations.length > 0 && (
                <ul className="space-y-0">
                  {recentConversations.map((c) => (
                    <ConversationRow
                      key={c.id}
                      c={c}
                      active={c.id === activeId}
                      generating={c.id === activeId && Boolean(streamingId)}
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
                      onOpenComingSoon={onOpenComingSoon}
                      menuOpen={openMenuId === c.id}
                      onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        </div>

        <div className="hidden items-center border-t border-border px-3 py-3 sm:flex">
          <AccountMenu variant="expanded" onOpenSettings={onOpenSettingsTab} onOpenLanguage={onOpenLanguage} onOpenSupport={onOpenSupport} />
        </div>

        <div className="flex items-center gap-3 border-t border-border px-3 py-3 sm:hidden">
          <button
            onClick={closeMobileThen(onOpenSearch)}
            className="flex flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-3 text-base text-muted transition-colors hover:bg-surface-2 [&>svg]:h-6 [&>svg]:w-6"
          >
            {SearchIcon}
            <span>Search</span>
          </button>
          <button
            onClick={closeMobileThen(() => onOpenSettingsTab("General"))}
            aria-label="Settings"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground [&>svg]:h-6 [&>svg]:w-6"
          >
            {GearIcon}
          </button>
          <button
            onClick={closeMobileThen(onNewChat)}
            aria-label="New chat"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground [&>svg]:h-6 [&>svg]:w-6"
          >
            {PencilIcon}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {createProjectOpen && (
        <CreateProjectModal
          onClose={() => setCreateProjectOpen(false)}
          onCreate={(name, description) => onCreateProject(crypto.randomUUID(), name, description)}
          onOpenComingSoon={onOpenComingSoon}
        />
      )}

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
