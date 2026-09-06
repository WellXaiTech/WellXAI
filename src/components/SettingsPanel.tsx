"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Theme } from "@/lib/theme";
import type { Contrast } from "@/lib/contrast";
import type { ChatFontSize } from "@/lib/fontSize";
import type { AssistantColor } from "@/lib/assistantColor";
import type { ChatFont } from "@/lib/chatFont";
import type { ReduceMotion } from "@/lib/reduceMotion";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import { checkBirthDate, getMaxBirthDate } from "@/lib/ageGate";
import {
  getStoredVoiceURI,
  setStoredVoiceURI,
  getStoredVoiceSpeed,
  setStoredVoiceSpeed,
  getStoredVoiceLang,
  setStoredVoiceLang,
  getPremiumVoiceEnabled,
  setPremiumVoiceEnabled,
  getStoredPremiumVoiceName,
  setStoredPremiumVoiceName,
  PREMIUM_VOICE_NAMES,
  type VoiceSpeed,
  type PremiumVoiceName,
} from "@/lib/voice";

export type Profile = {
  nickname: string;
  about: string;
  role?: string;
  fullName?: string;
  birthDate?: string;
  country?: string;
  // Public-facing (shown on the ChatGiZa Media profile page).
  link?: string;
};

export type PrivacyPrefs = {
  improveModel: boolean;
  includeAudioRecordings: boolean;
  includeVideoRecordings: boolean;
  marketingMeasurement: boolean;
  personalizedMarketing: boolean;
};

type ConversationLite = {
  id: string;
  title: string;
  shared?: boolean;
  archived?: boolean;
  messages?: {
    id?: string;
    role?: string;
    content?: string;
    createdAt?: number;
    attachments?: {
      id?: string;
      name?: string;
      kind: string;
      dataUrl?: string;
      text?: string;
      pages?: string[];
      sizeBytes?: number;
    }[];
    imageUrl?: string;
    videoUrl?: string;
  }[];
};

type StorageItem = {
  id: string;
  label: string;
  conversationTitle: string;
  bytes?: number;
  thumbnailUrl?: string;
  createdAt?: number;
};

type DeviceSession = { id: string; device: string; os: string; signedInAt: number; ip?: string; location?: string };

type AccountOverview = {
  id: string;
  uid: string;
  createdAt: number | null;
  lastSeenAt: number | null;
  lastLogoutAt: number | null;
  platforms: string[];
  tokensUsed: number;
  deletedConversationsCount: number;
};

type BillingSummary = {
  subscription: { tier: string | null; planName: string; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean } | null;
  invoices: { id: string; date: number; amount: number; currency: string; status: string; hostedUrl: string | null }[];
  paymentMethods: { id: string; brand: string; last4: string; isDefault: boolean }[];
  billingInfo: { email: string | null; name: string | null; address: { city: string | null; country: string | null; line1: string | null; state: string | null; postal_code: string | null } | null } | null;
};

const TABS_GROUP_1 = ["Overview", "General", "Data controls", "Security"] as const;
const TABS_GROUP_2 = ["Account", "Memory", "Dashboard", "Storage", "Billing"] as const;
export type Tab = (typeof TABS_GROUP_1)[number] | (typeof TABS_GROUP_2)[number];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  Overview: "A quick summary of your account",
  General: "Appearance, language, and behavior",
  "Data controls": "Manage your data and privacy",
  Security: "Password, sessions, and login",
  Account: "Profile and personal info",
  Memory: "What ChatGiZa remembers about you",
  Dashboard: "Your usage stats and data, in one place",
  Storage: "Files, images, and space used",
  Billing: "Plan, invoices, and payment methods",
};

const OverviewIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2" />
    <rect x="14" y="2" width="8" height="8" rx="1" />
  </svg>
);

const DataControlsIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 16h.01" />
    <path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    <path d="M21.946 12.013H2.054" />
    <path d="M6 16h.01" />
  </svg>
);

const SecurityLockIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <path d="m7 16.5-4.74-2.85" />
    <path d="m7 16.5 5-3" />
    <path d="M7 16.5v5.17" />
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <path d="m17 16.5-5-3" />
    <path d="m17 16.5 4.74-2.85" />
    <path d="M17 16.5v5.17" />
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <path d="M12 8 7.26 5.15" />
    <path d="m12 8 4.74-2.85" />
    <path d="M12 13.5V8" />
  </svg>
);

const AccountIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.925 20.056a6 6 0 0 0-11.851.001" />
    <circle cx="12" cy="11" r="4" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const MemoryIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </svg>
);

const StorageIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

const BillingIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

// Idea #10: a personal data dashboard -- three bars, not a generic
// gear/chart glyph, so it reads distinctly as "your stats" in the tab list.
const DashboardIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="7" width="4" height="13" rx="1" />
    <rect x="16" y="3" width="4" height="17" rx="1" />
  </svg>
);

const ChevronDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const SearchIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const GearIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Overview: OverviewIcon,
  General: GearIcon,
  "Data controls": DataControlsIcon,
  Security: SecurityLockIcon,
  Account: AccountIcon,
  Memory: MemoryIcon,
  Dashboard: DashboardIcon,
  Storage: StorageIcon,
  Billing: BillingIcon,
};

const SystemIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const SunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

const ContrastIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 18a6 6 0 0 0 0-12v12z" />
  </svg>
);
const TypeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v16" />
    <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
    <path d="M9 20h6" />
  </svg>
);
const PaletteIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);
const LetterTextIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5h6" />
    <path d="M15 12h6" />
    <path d="M3 19h18" />
    <path d="m3 12 3.553-7.724a.5.5 0 0 1 .894 0L11 12" />
    <path d="M3.92 10h6.16" />
  </svg>
);
const WavesIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12q2.5 2 5 0t5 0 5 0 5 0" />
    <path d="M2 19q2.5 2 5 0t5 0 5 0 5 0" />
    <path d="M2 5q2.5 2 5 0t5 0 5 0 5 0" />
  </svg>
);
const BellIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </svg>
);
const ActivityIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </svg>
);
const ImageGenIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

function EditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M0 0h16v16H0z" fill="none" />
      <path
        fill="currentColor"
        d="M14.452 1.548a1.865 1.865 0 0 0-2.644 0L6.979 6.377a2.2 2.2 0 0 0-.578 1.021l-.374 1.498a.89.89 0 0 0 1.079 1.079l1.498-.374a2.2 2.2 0 0 0 1.021-.578l4.829-4.829c.73-.73.73-1.914 0-2.645zm-.707 1.937L8.916 8.314a1.2 1.2 0 0 1-.556.315l-1.32.333l.331-1.322c.053-.21.161-.403.315-.556l4.83-4.829a.866.866 0 0 1 1.23 0a.87.87 0 0 1 0 1.231zM13 7.768l1-1V11.5c0 1.378-1.121 2.5-2.5 2.5h-7A2.503 2.503 0 0 1 2 11.5v-7C2 3.122 3.121 2 4.5 2h4.736l-1 1H4.5C3.673 3 3 3.673 3 4.5v7c0 .827.673 1.5 1.5 1.5h7c.827 0 1.5-.673 1.5-1.5z"
      />
    </svg>
  );
}

const PencilIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>
);

const PLATFORM_LABELS: Record<string, string> = {
  web: "Website",
  desktop: "Desktop app",
  android: "Android app",
  vscode: "VS Code",
};

function maskEmail(email: string): string {
  const [local] = email.split("@");
  if (!local) return email;
  return `${local.slice(0, 3)}***@****`;
}

const MonitorIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);
const ClockIcon = (
  <svg width="13" height="13" viewBox="0 0 1024 1024">
    <path
      fill="currentColor"
      d="M536.1 273H488c-4.4 0-8 3.6-8 8v275.3c0 2.6 1.2 5 3.3 6.5l165.3 120.7c3.6 2.6 8.6 1.9 11.2-1.7l28.6-39c2.7-3.7 1.9-8.7-1.7-11.2L544.1 528.5V281c0-4.4-3.6-8-8-8m219.8 75.2l156.8 38.3c5 1.2 9.9-2.6 9.9-7.7l.8-161.5c0-6.7-7.7-10.5-12.9-6.3L752.9 334.1a8 8 0 0 0 3 14.1m167.7 301.1l-56.7-19.5a8 8 0 0 0-10.1 4.8c-1.9 5.1-3.9 10.1-6 15.1c-17.8 42.1-43.3 80-75.9 112.5a353 353 0 0 1-112.5 75.9a352.2 352.2 0 0 1-137.7 27.8c-47.8 0-94.1-9.3-137.7-27.8a353 353 0 0 1-112.5-75.9c-32.5-32.5-58-70.4-75.9-112.5A353.4 353.4 0 0 1 171 512c0-47.8 9.3-94.2 27.8-137.8c17.8-42.1 43.3-80 75.9-112.5a353 353 0 0 1 112.5-75.9C430.6 167.3 477 158 524.8 158s94.1 9.3 137.7 27.8A353 353 0 0 1 775 261.7c10.2 10.3 19.8 21 28.6 32.3l59.8-46.8C784.7 146.6 662.2 81.9 524.6 82C285 82.1 92.6 276.7 95 516.4C97.4 751.9 288.9 942 524.8 942c185.5 0 343.5-117.6 403.7-282.3c1.5-4.2-.7-8.9-4.9-10.4"
    />
  </svg>
);

function LoginTimeValue({ value }: { value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {MonitorIcon}
      {value}
      {ClockIcon}
    </span>
  );
}

const CopyIcon = (
  // Same glyph used for Copy on chat message bubbles (ChatMessageBubble.tsx),
  // so the copy affordance looks identical everywhere in the app.
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ fill: "currentColor", stroke: "none" }}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m10.8624 1.99989c.0452.00003.0911.00005.1376.00005h5.2413c.805-.00001 1.4693-.00002 2.0105.0442.5621.04592 1.0788.14449 1.5642.39178.7526.38349 1.3645.99541 1.748 1.74806.2473.48534.3459 1.00204.3918 1.56414.0442.54119.0442 1.20554.0442 2.0105v5.24128c0 .0466 0 .0924.0001.1376.0004.7954.0007 1.3861-.1364 1.8977-.3699 1.3804-1.4481 2.4586-2.8284 2.8284-.3096.083-.648.1156-1.0433.1284-.0127.3952-.0454.7337-.1283 1.0432-.3699 1.3804-1.4481 2.4586-2.8284 2.8284-.5117.1371-1.1023.1368-1.8977.1364-.0452 0-.0911-.0001-.1376-.0001h-5.24132c-.80496.0001-1.46932.0001-2.01051-.0441-.56209-.046-1.0788-.1445-1.56413-.3918-.75265-.3835-1.36457-.9954-1.74807-1.7481-.24729-.4853-.34585-1.002-.39178-1.5641-.04421-.5412-.0442-1.2056-.04419-2.0106v-5.2413c0-.0465-.00002-.0923-.00005-.1375-.00043-.7954-.00075-1.38608.13635-1.89773.36987-1.38037 1.44806-2.45856 2.82842-2.82843.30955-.08294.64801-.11559 1.04323-.12834.01276-.39522.0454-.73369.12835-1.04323.36987-1.38037 1.44806-2.45856 2.82842-2.82843.51165-.1371 1.10228-.13678 1.89768-.13635zm-2.85254 4.00005h4.23144c.805-.00001 1.4693-.00002 2.0105.0442.5621.04592 1.0788.14449 1.5642.39178.7526.38349 1.3645.99541 1.748 1.74806.2473.48534.3459 1.00204.3918 1.56414.0442.54118.0442 1.20558.0442 2.01058v4.2314c.2576-.0092.3988-.0265.5176-.0583.6902-.1849 1.2293-.724 1.4143-1.4142.0595-.2223.0681-.5233.0681-1.5177v-5.19996c0-.85658-.0008-1.43887-.0376-1.88896-.0358-.43841-.1007-.66262-.1804-.81902-.1917-.37632-.4977-.68228-.874-.87403-.1564-.07969-.3806-.14461-.819-.18043-.4501-.03678-1.0324-.03756-1.889-.03756h-5.2c-.9944 0-1.29536.00859-1.51764.06815-.69018.18494-1.22928.72403-1.41421 1.41422-.03183.11879-.0491.26006-.05829.51763zm-1.00986 2c-.99435 0-1.29536.00859-1.51764.06815-.69018.18494-1.22928.72403-1.41421 1.41422-.05956.22227-.06815.52329-.06815 1.51759v5.2c0 .8566.00078 1.4389.03755 1.889.03582.4384.10075.6626.18044.819.19174.3763.4977.6823.87403.8741.1564.0796.3806.1446.81902.1804.45009.0368 1.03238.0375 1.88896.0375h5.2c.9944 0 1.2954-.0085 1.5176-.0681.6902-.1849 1.2293-.724 1.4143-1.4142.0595-.2223.0681-.5233.0681-1.5177v-5.2c0-.8565-.0008-1.4388-.0376-1.88892-.0358-.43841-.1007-.66262-.1804-.81902-.1917-.37632-.4977-.68228-.874-.87403-.1564-.07969-.3806-.14461-.819-.18043-.4501-.03678-1.0324-.03756-1.889-.03756z"
    />
  </svg>
);

function RowIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
      {children}
    </span>
  );
}

const CheckIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function OverviewRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs font-light text-muted">{hint}</p>}
      </div>
      <span className="shrink-0 text-sm text-muted">{value}</span>
    </div>
  );
}

function SettingTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border p-3.5 transition-colors hover:bg-surface-2/40">
      <div className="mb-2.5 flex items-center gap-2">
        <RowIcon>{icon}</RowIcon>
        <h3 className="text-sm font-medium">{label}</h3>
      </div>
      {children}
    </div>
  );
}

function ThemePreviewCard({
  label,
  icon,
  selected,
  onSelect,
  variant,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  variant: "light" | "dark" | "split";
}) {
  const barClass = variant === "light" ? "bg-black/10" : "bg-white/20";
  const bubbleClass = variant === "light" ? "bg-black" : "bg-white";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`overflow-hidden rounded-2xl border-2 text-left transition-colors ${
        selected ? "border-foreground" : "border-border hover:border-foreground/40"
      }`}
    >
      <div
        className={`relative h-16 w-full overflow-hidden ${
          variant === "dark" ? "bg-[#0a0a0a]" : variant === "split" ? "bg-gradient-to-br from-white from-45% to-[#0a0a0a] to-55%" : "bg-white"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(165deg, rgba(99,102,241,0.85), rgba(59,130,246,0.55) 55%, transparent 95%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col gap-1 p-2.5">
          <div className={`h-1.5 w-7 rounded-full ${variant === "split" ? "bg-black/15" : barClass}`} />
          <div className={`h-1.5 w-10 rounded-full ${variant === "split" ? "bg-white/25" : barClass}`} />
          <div className="mt-auto flex justify-end">
            <div className={`h-4 w-9 rounded-full ${variant === "split" ? "bg-[#0a0a0a]" : bubbleClass}`} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {icon}
          {label}
        </span>
        {selected && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
            {CheckIcon}
          </span>
        )}
      </div>
    </button>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs font-light text-foreground">{label}</p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label?: string; icon?: React.ReactNode; ariaLabel?: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-label={opt.ariaLabel ?? opt.label}
          aria-pressed={value === opt.value}
          className={`flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {opt.icon ?? opt.label}
        </button>
      ))}
    </div>
  );
}

function SettingsSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-xl border border-border bg-surface px-3 py-2.5 pr-9 text-sm text-foreground outline-none transition-colors hover:bg-surface-2 focus:border-foreground/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        {ChevronDownIcon}
      </span>
    </div>
  );
}

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const ChevronLeftIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const CloseIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const ChevronRightIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// Sizes are in explicit pixel numbers (not Tailwind arbitrary classes) so the
// thumb's sliding `transform` is set as an inline style — Tailwind's
// `translate-x-*` utilities weren't emitting any `transform` at all here
// (computed style came back `transform: none`), leaving the thumb stuck in
// place instead of sliding between the off/on positions.
const TOGGLE_TRACK_W = 40;
const TOGGLE_TRACK_H = 24;
const TOGGLE_THUMB = 20;
const TOGGLE_INSET = 2;

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  const thumbX = checked ? TOGGLE_TRACK_W - TOGGLE_THUMB - TOGGLE_INSET : TOGGLE_INSET;
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
      style={{ width: TOGGLE_TRACK_W, height: TOGGLE_TRACK_H }}
      className={`relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? "bg-[#0a84ff]" : "border border-border bg-surface-2"
      }`}
    >
      <span
        style={{
          width: TOGGLE_THUMB,
          height: TOGGLE_THUMB,
          top: TOGGLE_INSET - 1,
          left: 0,
          transform: `translateX(${thumbX}px)`,
        }}
        className="absolute rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200"
      />
    </button>
  );
}

function Row({
  title,
  description,
  control,
  border = true,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${border ? "border-b border-border" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 max-w-sm text-xs font-light text-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function ComingSoonNote({ text }: { text?: string }) {
  return (
    <p className="mt-1 text-xs font-light text-foreground">
      {text ?? "This isn't built yet — coming soon."}
    </p>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function SettingsPanel({
  onClose,
  theme,
  onThemeChange,
  contrast,
  onContrastChange,
  fontSize,
  onFontSizeChange,
  assistantColor,
  onAssistantColorChange,
  chatFont,
  onChatFontChange,
  reduceMotion,
  onReduceMotionChange,
  notifyOnComplete,
  onToggleNotifyOnComplete,
  notifyImageGen,
  onToggleNotifyImageGen,
  allNotificationsEnabled,
  onToggleAllNotifications,
  privacyPrefs,
  onPrivacyPrefsChange,
  feedbackEmailsOptIn,
  onToggleFeedbackEmailsOptIn,
  onOpenSupport,
  onDeleteAccount,
  onOpenUpgradePlan,
  profile,
  onProfileChange,
  memoryEnabled,
  onToggleMemoryEnabled,
  memory,
  onAddMemory,
  onRemoveMemory,
  digitalTwin,
  digitalTwinUpdatedAt,
  digitalTwinRegenerating,
  onChangeDigitalTwin,
  onRegenerateDigitalTwin,
  historyEnabled,
  onToggleHistoryEnabled,
  onClearHistory,
  conversations,
  onShareConversation,
  onUnshareConversation,
  onUnarchiveConversation,
  onDeleteConversation,
  onExportData,
  onArchiveAllConversations,
  location,
  locationError,
  onRequestLocation,
  onClearLocation,
  initialTab,
}: {
  onClose: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  contrast: Contrast;
  onContrastChange: (c: Contrast) => void;
  fontSize: ChatFontSize;
  onFontSizeChange: (s: ChatFontSize) => void;
  assistantColor: AssistantColor;
  onAssistantColorChange: (c: AssistantColor) => void;
  chatFont: ChatFont;
  onChatFontChange: (f: ChatFont) => void;
  reduceMotion: ReduceMotion;
  onReduceMotionChange: (m: ReduceMotion) => void;
  notifyOnComplete: boolean;
  onToggleNotifyOnComplete: () => void;
  notifyImageGen: boolean;
  onToggleNotifyImageGen: () => void;
  allNotificationsEnabled: boolean;
  onToggleAllNotifications: () => void;
  privacyPrefs: PrivacyPrefs;
  onPrivacyPrefsChange: (p: PrivacyPrefs) => void;
  feedbackEmailsOptIn: boolean;
  onToggleFeedbackEmailsOptIn: () => void;
  onOpenSupport: () => void;
  onDeleteAccount: () => void;
  onOpenUpgradePlan?: () => void;
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  memoryEnabled: boolean;
  onToggleMemoryEnabled: () => void;
  memory: string[];
  onAddMemory: (fact: string) => void;
  onRemoveMemory: (index: number) => void;
  digitalTwin: string;
  digitalTwinUpdatedAt: number;
  digitalTwinRegenerating: boolean;
  onChangeDigitalTwin: (summary: string) => void;
  onRegenerateDigitalTwin: () => void;
  historyEnabled: boolean;
  onToggleHistoryEnabled: () => void;
  onClearHistory: () => void;
  conversations: ConversationLite[];
  onShareConversation: (id: string) => void;
  onUnshareConversation: (id: string) => void;
  onUnarchiveConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onExportData: () => void;
  onArchiveAllConversations: () => void;
  location: string;
  locationError: string | null;
  onRequestLocation: () => void;
  onClearLocation: () => void;
  initialTab?: Tab;
}) {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>(initialTab ?? "Overview");
  const [mobileShowContent, setMobileShowContent] = useState(false);

  function selectTab(t: Tab) {
    setTab(t);
    setMobileShowContent(true);
  }
  const [nickname, setNickname] = useState(profile.nickname);
  const [about, setAbout] = useState(profile.about);
  const [role, setRole] = useState(profile.role ?? "");
  const [fullName, setFullName] = useState(profile.fullName ?? session?.user?.name ?? "");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [link, setLink] = useState(profile.link ?? "");
  const [newFact, setNewFact] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmArchiveAll, setConfirmArchiveAll] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmCancelPlan, setConfirmCancelPlan] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [dataView, setDataView] = useState<"root" | "shared" | "archived">("root");
  const [storageView, setStorageView] = useState<"root" | "files" | "images">("root");
  const [tabSearch, setTabSearch] = useState("");
  const visibleTabsGroup1 = TABS_GROUP_1;
  const visibleTabsGroup2 = TABS_GROUP_2;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState<VoiceSpeed>("normal");
  const [voiceLang, setVoiceLang] = useState("");
  const [premiumVoice, setPremiumVoice] = useState(false);
  const [premiumVoiceName, setPremiumVoiceName] = useState<PremiumVoiceName>("marin");
  const sharedConversations = conversations.filter((c) => c.shared);
  const archivedConversations = conversations.filter((c) => c.archived);

  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpStep, setTotpStep] = useState<"closed" | "link" | "verify" | "disable">("closed");
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpCopied, setTotpCopied] = useState(false);

  // Whether this account has ever set an in-app password (Google-only
  // accounts haven't) -- determines whether "old password" is asked for.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"closed" | "form" | "code">("closed");
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);

  const [accountOverview, setAccountOverview] = useState<AccountOverview | null>(null);
  const [accountOverviewLoading, setAccountOverviewLoading] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [editingOverviewName, setEditingOverviewName] = useState(false);

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [billingView, setBillingView] = useState<"root" | "edit">("root");
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editLine1, setEditLine1] = useState("");
  const [editLine2, setEditLine2] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddTaxId, setEditAddTaxId] = useState(false);
  const [editTaxIdType, setEditTaxIdType] = useState("eu_vat");
  const [editTaxIdValue, setEditTaxIdValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditBillingInfo() {
    setEditEmail(billing?.billingInfo?.email ?? session?.user?.email ?? "");
    setEditName(billing?.billingInfo?.name ?? session?.user?.name ?? "");
    const countryCode = billing?.billingInfo?.address?.country ?? "";
    setEditCountry(COUNTRIES.find((c) => COUNTRY_CODES[c] === countryCode) ?? "");
    setEditLine1(billing?.billingInfo?.address?.line1 ?? "");
    setEditLine2("");
    setEditPostalCode(billing?.billingInfo?.address?.postal_code ?? "");
    setEditCity(billing?.billingInfo?.address?.city ?? "");
    setEditAddTaxId(false);
    setEditTaxIdValue("");
    setEditError(null);
    setBillingView("edit");
  }

  async function saveBillingInfo(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/billing/update-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          name: editName,
          country: COUNTRY_CODES[editCountry] ?? "",
          addressLine1: editLine1,
          addressLine2: editLine2,
          postalCode: editPostalCode,
          city: editCity,
          taxIdType: editAddTaxId ? editTaxIdType : undefined,
          taxIdValue: editAddTaxId ? editTaxIdValue : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save billing information");
      if (data.taxIdError) {
        setEditError(`Billing address saved, but the tax ID couldn't be added: ${data.taxIdError}`);
      } else {
        setBilling(null);
        setBillingView("root");
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Couldn't save billing information");
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    setVoiceURI(getStoredVoiceURI());
    setVoiceSpeed(getStoredVoiceSpeed());
    setVoiceLang(getStoredVoiceLang());
    setPremiumVoice(getPremiumVoiceEnabled());
    setPremiumVoiceName(getStoredPremiumVoiceName());
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (tab !== "Security" || !session?.user || sessions !== null) return;
    setSessionsLoading(true);
    setSessionsError(null);
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { sessions: DeviceSession[]; currentSessionId: string | null }) => {
        setSessions(data.sessions);
        setCurrentSessionId(data.currentSessionId);
      })
      .catch(() => setSessionsError("Couldn't load your sessions."))
      .finally(() => setSessionsLoading(false));
  }, [tab, session?.user, sessions]);

  useEffect(() => {
    if (tab !== "Security" || !session?.user || totpEnabled !== null) return;
    setTotpLoading(true);
    fetch("/api/account/totp")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { enabled: boolean }) => setTotpEnabled(!!data.enabled))
      .catch(() => setTotpEnabled(false))
      .finally(() => setTotpLoading(false));
  }, [tab, session?.user, totpEnabled]);

  useEffect(() => {
    if (tab !== "Security" || !session?.user || hasPassword !== null) return;
    setPasswordLoading(true);
    fetch("/api/account/password")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { hasPassword: boolean }) => setHasPassword(!!data.hasPassword))
      .catch(() => setHasPassword(false))
      .finally(() => setPasswordLoading(false));
  }, [tab, session?.user, hasPassword]);

  function closePasswordFlow() {
    setPasswordStep("closed");
    setOldPasswordInput("");
    setNewPasswordInput("");
    setPasswordCode("");
    setPasswordError(null);
    setPasswordDone(false);
  }

  async function submitPasswordForm() {
    setPasswordBusy(true);
    setPasswordError(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: hasPassword ? oldPasswordInput : undefined,
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send the verification code");
      setPasswordStep("code");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Couldn't send the verification code");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function confirmPasswordCode() {
    setPasswordBusy(true);
    setPasswordError(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: passwordCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't confirm the code");
      setHasPassword(true);
      setPasswordDone(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Couldn't confirm the code");
    } finally {
      setPasswordBusy(false);
    }
  }

  function closeTotpFlow() {
    setTotpStep("closed");
    setTotpSecret(null);
    setTotpUri(null);
    setTotpCode("");
    setTotpDisableCode("");
    setTotpError(null);
    setTotpCopied(false);
  }

  async function startTotpSetup() {
    setTotpBusy(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/account/totp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start 2FA setup -- try again");
      setTotpSecret(data.secret);
      setTotpUri(data.otpauthUri);
      setTotpStep("link");
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : "Couldn't start 2FA setup -- try again");
    } finally {
      setTotpBusy(false);
    }
  }

  function goToTotpVerifyStep() {
    setTotpError(null);
    setTotpStep("verify");
  }

  function backToTotpLinkStep() {
    setTotpError(null);
    setTotpCode("");
    setTotpStep("link");
  }

  async function confirmTotpSetup() {
    if (totpCode.trim().length !== 6) return;
    setTotpBusy(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/account/totp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That code is incorrect or has expired");
      setTotpEnabled(true);
      closeTotpFlow();
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : "That code is incorrect or has expired");
    } finally {
      setTotpBusy(false);
    }
  }

  async function disableTotp() {
    if (totpDisableCode.trim().length !== 6) return;
    setTotpBusy(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/account/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpDisableCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That code is incorrect");
      setTotpEnabled(false);
      closeTotpFlow();
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : "That code is incorrect");
    } finally {
      setTotpBusy(false);
    }
  }

  useEffect(() => {
    if (tab !== "Overview" || !session?.user || accountOverview !== null) return;
    setAccountOverviewLoading(true);
    fetch("/api/account/overview")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: AccountOverview) => setAccountOverview(data))
      .catch(() => {})
      .finally(() => setAccountOverviewLoading(false));
  }, [tab, session?.user, accountOverview]);

  useEffect(() => {
    if (tab !== "Billing" || !session?.user || billing !== null) return;
    setBillingLoading(true);
    setBillingError(null);
    fetch("/api/billing/summary")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: BillingSummary) => setBilling(data))
      .catch(() => setBillingError("Couldn't load your billing details."))
      .finally(() => setBillingLoading(false));
  }, [tab, session?.user, billing]);

  async function revokeSession(id: string) {
    setRevokingId(id);
    try {
      await fetch("/api/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    } catch {
      setSessionsError("Couldn't log that device out. Try again.");
    } finally {
      setRevokingId(null);
    }
  }

  async function logoutAllSessions() {
    await fetch("/api/sessions/revoke-all", { method: "POST" }).catch(() => {});
    signOut({ callbackUrl: "/login" });
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setBillingError("Couldn't open the billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function cancelPlan() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) {
        setBilling((prev) => (prev?.subscription ? { ...prev, subscription: { ...prev.subscription, cancelAtPeriodEnd: true } } : prev));
      }
    } finally {
      setCancelLoading(false);
      setConfirmCancelPlan(false);
    }
  }

  const voiceLanguages = Array.from(new Set(voices.map((v) => v.lang))).sort();
  const filteredVoices = voiceLang ? voices.filter((v) => v.lang === voiceLang) : voices;

  const birthDateCheck = checkBirthDate(birthDate);

  function saveProfile() {
    if (!birthDateCheck.ok) return;
    onProfileChange({ nickname, about, role, fullName, birthDate, country, link });
  }

  function updatePrivacy(patch: Partial<PrivacyPrefs>) {
    onPrivacyPrefsChange({ ...privacyPrefs, ...patch });
  }

  const fileItems: StorageItem[] = [];
  const imageItems: StorageItem[] = [];
  for (const c of conversations) {
    for (const m of c.messages ?? []) {
      if (m.imageUrl) {
        imageItems.push({
          id: m.id ?? `${c.id}-image-${imageItems.length}`,
          label: "Generated image",
          conversationTitle: c.title,
          bytes: m.imageUrl.startsWith("data:") ? Math.round((m.imageUrl.length * 3) / 4) : undefined,
          thumbnailUrl: m.imageUrl,
          createdAt: m.createdAt,
        });
      }
      if (m.videoUrl) {
        imageItems.push({
          id: m.id ?? `${c.id}-video-${imageItems.length}`,
          label: "Generated video",
          conversationTitle: c.title,
          bytes: m.videoUrl.startsWith("data:") ? Math.round((m.videoUrl.length * 3) / 4) : undefined,
          createdAt: m.createdAt,
        });
      }
      for (const a of m.attachments ?? []) {
        // `sizeBytes` is the real uploaded file size (captured from `File.size`
        // at upload time — see lib/attachments.ts). Older conversations saved
        // before that existed won't have it, so fall back to an estimate from
        // whatever content was actually stored for them.
        const estimatedBytes =
          a.kind === "image"
            ? a.dataUrl
              ? Math.round((a.dataUrl.length * 3) / 4)
              : undefined
            : (a.text?.length ?? 0) + (a.pages ? a.pages.join("").length : 0);

        if (a.kind === "image") {
          imageItems.push({
            id: a.id ?? `${c.id}-${imageItems.length}`,
            label: a.name ?? "Uploaded image",
            conversationTitle: c.title,
            bytes: a.sizeBytes ?? estimatedBytes,
            thumbnailUrl: a.dataUrl,
            createdAt: m.createdAt,
          });
        } else {
          fileItems.push({
            id: a.id ?? `${c.id}-${fileItems.length}`,
            label: a.name ?? "Uploaded file",
            conversationTitle: c.title,
            bytes: a.sizeBytes ?? estimatedBytes,
            createdAt: m.createdAt,
          });
        }
      }
    }
  }
  const fileCount = fileItems.length;
  const fileBytes = fileItems.reduce((sum, i) => sum + (i.bytes ?? 0), 0);
  const imageCount = imageItems.length;
  const imageBytes = imageItems.reduce((sum, i) => sum + (i.bytes ?? 0), 0);
  const storageBytesUsed = JSON.stringify(conversations).length;
  const storageCapBytes = 4 * 1024 * 1024 * 1024;
  const storagePct = Math.min(100, Math.round((storageBytesUsed / storageCapBytes) * 100));

  // Idea #10: a personal data dashboard -- transparency into what ChatGiZa
  // actually holds about the user, computed entirely from data already
  // loaded client-side (no extra network round trip needed for this tab).
  const activeConversations = conversations.filter((c) => !c.archived);
  const allMessages = conversations.flatMap((c) => c.messages ?? []);
  const userMessages = allMessages.filter((m) => m.role === "user");
  const assistantMessages = allMessages.filter((m) => m.role === "assistant");
  const wordsWritten = userMessages.reduce((sum, m) => sum + (m.content?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0);
  const attachmentCount = allMessages.reduce((sum, m) => sum + (m.attachments?.length ?? 0), 0);
  const mediaCount = allMessages.filter((m) => m.imageUrl || m.videoUrl).length;
  const timestamps = allMessages.map((m) => m.createdAt).filter((t): t is number => typeof t === "number");
  const firstMessageAt = timestamps.length ? Math.min(...timestamps) : null;
  const lastMessageAt = timestamps.length ? Math.max(...timestamps) : null;
  const activeDayCount = new Set(timestamps.map((t) => new Date(t).toDateString())).size;
  const imagesGenerated = allMessages.filter((m) => m.imageUrl).length;
  const videosGenerated = allMessages.filter((m) => m.videoUrl).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="card flex h-full max-h-full w-full flex-col overflow-hidden rounded-none sm:h-[92vh] sm:max-h-[92vh] sm:w-[96vw] sm:max-w-[1600px] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative hidden shrink-0 px-5 pb-3 pt-4 sm:block">
          <span className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-muted">
            {SearchIcon}
          </span>
          <input
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            placeholder="Search settings"
            className="w-full max-w-xs rounded-full border border-border bg-surface-2 py-1.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-foreground/40 focus:bg-background"
          />
        </div>

        <div className="flex min-h-0 flex-1">
        <div
          className={`no-scrollbar w-full overflow-y-auto p-3 sm:block sm:w-48 sm:shrink-0 ${
            mobileShowContent ? "hidden" : "block"
          }`}
        >
          <div className="mb-4 flex items-center gap-3 sm:hidden">
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2"
            >
              {CloseIcon}
            </button>
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>

          {session?.user && (
            <button
              onClick={onOpenUpgradePlan ?? (() => selectTab("Account"))}
              className="mb-4 flex w-full items-center gap-4 rounded-2xl bg-surface-2 p-4 text-left sm:hidden"
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-14 w-14 shrink-0 rounded-full" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border text-lg">
                  {session.user.name?.[0] ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{session.user.name}</p>
                <p className="truncate text-sm text-muted">Upgrade your plan</p>
              </div>
            </button>
          )}

          <ul className="divide-y divide-border/60 rounded-2xl bg-surface-2 p-1 sm:space-y-0.5 sm:divide-y-0 sm:rounded-none sm:bg-transparent sm:p-0">
            {visibleTabsGroup1.map((t) => (
              <li key={t}>
                <button
                  onClick={() => selectTab(t)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-2 ${
                    tab === t ? "bg-surface-2 sm:bg-surface-2" : "hover:bg-surface sm:hover:bg-surface-2"
                  }`}
                >
                  <span className="text-foreground">{TAB_ICONS[t]}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-base font-medium text-foreground sm:text-sm"
                    >
                      {t}
                    </span>
                    <span className="block text-sm text-muted sm:hidden">{TAB_DESCRIPTIONS[t]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {visibleTabsGroup2.length > 0 && (
            <>
              <div className="my-3 sm:my-2 sm:border-t sm:border-border" />
              <ul className="divide-y divide-border/60 rounded-2xl bg-surface-2 p-1 sm:space-y-0.5 sm:divide-y-0 sm:rounded-none sm:bg-transparent sm:p-0">
                {visibleTabsGroup2.map((t) => (
                  <li key={t}>
                    <button
                      onClick={() => selectTab(t)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-2 ${
                        tab === t ? "bg-surface-2" : "hover:bg-surface sm:hover:bg-surface-2"
                      }`}
                    >
                      <span className="text-foreground">{TAB_ICONS[t]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium text-foreground sm:text-sm">
                          {t}
                        </span>
                        <span className="block text-sm text-muted sm:hidden">{TAB_DESCRIPTIONS[t]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

        </div>

        <div
          className={`no-scrollbar w-full max-h-full overflow-y-auto p-5 sm:block sm:max-h-[80vh] sm:flex-1 ${
            mobileShowContent ? "block" : "hidden"
          }`}
        >
          <button
            onClick={() => setMobileShowContent(false)}
            className="mb-3 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground sm:hidden"
          >
            {ChevronLeftIcon} Settings
          </button>

          {tab === "Overview" && (
            <div>
              {accountOverviewLoading && !accountOverview ? (
                <p className="py-6 text-center text-xs font-light text-foreground">Loading…</p>
              ) : (
                <>
                  <p className="mb-2 px-1 text-base font-semibold text-foreground">Account Info</p>
                  <div className="rounded-2xl border border-border p-6">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        {session?.user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={session.user.image} alt="" className="h-14 w-14 rounded-full" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-lg font-medium">
                            {session?.user?.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span
                          aria-hidden
                          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface text-muted"
                        >
                          <EditIcon size={8} />
                        </span>
                      </div>
                      <div>
                        {editingOverviewName ? (
                          <input
                            autoFocus
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            onBlur={() => {
                              saveProfile();
                              setEditingOverviewName(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-semibold outline-none focus:border-foreground/40"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingOverviewName(true)}
                            className="flex items-center gap-2 text-sm font-semibold"
                          >
                            <span>{fullName || session?.user?.name || "Add your name"}</span>
                            <span className="text-muted">
                              <EditIcon size={16} />
                            </span>
                          </button>
                        )}
                        {session?.user?.email && (
                          <p className="mt-0.5 font-mono text-xs text-muted">{maskEmail(session.user.email)}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-5">
                      <div>
                        <p className="mb-1 text-xs text-muted">UID</p>
                        {accountOverview?.uid && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(accountOverview.uid).then(() => {
                                setUidCopied(true);
                                setTimeout(() => setUidCopied(false), 1500);
                              });
                            }}
                            className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-muted"
                          >
                            <span className="font-mono">{accountOverview.uid}</span>
                            {CopyIcon}
                            {uidCopied && <span className="text-xs font-normal text-muted">Copied</span>}
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted">Last login time:</p>
                        <p className="text-sm font-semibold">
                          <LoginTimeValue
                            value={accountOverview?.lastSeenAt ? formatDateTime(accountOverview.lastSeenAt) : "—"}
                          />
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted">Member since</p>
                        <p className="text-sm font-semibold">
                          {accountOverview?.createdAt ? formatDate(accountOverview.createdAt) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 divide-y divide-border rounded-2xl border border-border">
                    <OverviewRow
                      label="Connected platforms"
                      value={
                        accountOverview?.platforms?.length
                          ? accountOverview.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")
                          : "None yet"
                      }
                      hint="One Gmail can sign in from several phones/devices — they're still this same account, just more platforms connected."
                    />
                  </div>

                  <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Usage</p>
                  <div className="divide-y divide-border rounded-2xl border border-border">
                    <OverviewRow
                      label="Tokens used"
                      value={(accountOverview?.tokensUsed ?? 0).toLocaleString()}
                      hint="Build tool usage only, for now"
                    />
                    <OverviewRow label="Messages sent" value={userMessages.length.toLocaleString()} />
                    <OverviewRow
                      label="Conversations deleted"
                      value={(accountOverview?.deletedConversationsCount ?? 0).toLocaleString()}
                    />
                    <OverviewRow label="Images generated" value={imagesGenerated.toLocaleString()} />
                    <OverviewRow label="Videos generated" value={videosGenerated.toLocaleString()} />
                  </div>

                  <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Plan</p>
                  <div className="rounded-2xl border border-border">
                    <OverviewRow label="Free plan" value="" hint="Paid plans and billing history aren't available yet." />
                  </div>

                  <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Quantara</p>
                  <div className="rounded-2xl border border-border">
                    <OverviewRow label="Available" value="" hint="Same account as the app — open it from Quantara in the sidebar." />
                  </div>

                  {session?.user && (
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="mt-6 w-full rounded-2xl border border-border px-4 py-3 text-center text-sm font-medium text-red-500 transition-colors hover:bg-surface-2"
                    >
                      Sign out
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "General" && (
            <div>
              <h2 className="mb-4 text-base font-semibold">General</h2>

              <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">Theme</p>
              <div className="grid grid-cols-3 gap-3">
                <ThemePreviewCard
                  variant="split"
                  label="System"
                  icon={SystemIcon}
                  selected={theme === "system"}
                  onSelect={() => onThemeChange("system" as Theme)}
                />
                <ThemePreviewCard
                  variant="light"
                  label="Light"
                  icon={SunIcon}
                  selected={theme === "light"}
                  onSelect={() => onThemeChange("light" as Theme)}
                />
                <ThemePreviewCard
                  variant="dark"
                  label="Dark"
                  icon={MoonIcon}
                  selected={theme === "dark"}
                  onSelect={() => onThemeChange("dark" as Theme)}
                />
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Appearance</p>
              <div className="grid grid-cols-2 gap-3">
                <SettingTile icon={ContrastIcon} label="Contrast">
                  <SettingsSelect
                    value={contrast}
                    onChange={onContrastChange}
                    options={[
                      { value: "system" as Contrast, label: "System" },
                      { value: "medium" as Contrast, label: "Medium" },
                      { value: "increased" as Contrast, label: "Increased" },
                    ]}
                  />
                </SettingTile>

                <SettingTile icon={TypeIcon} label="Text size">
                  <SettingsSelect
                    value={fontSize}
                    onChange={onFontSizeChange}
                    options={[
                      { value: "small" as ChatFontSize, label: "Small" },
                      { value: "medium" as ChatFontSize, label: "Default" },
                      { value: "large" as ChatFontSize, label: "Large" },
                      { value: "xlarge" as ChatFontSize, label: "Extra large" },
                    ]}
                  />
                </SettingTile>

                <SettingTile icon={PaletteIcon} label="Reply text color">
                  <SettingsSelect
                    value={assistantColor}
                    onChange={onAssistantColorChange}
                    options={[
                      { value: "default" as AssistantColor, label: "Default" },
                      { value: "warm" as AssistantColor, label: "Warm" },
                    ]}
                  />
                </SettingTile>

                <SettingTile icon={LetterTextIcon} label="Chat font">
                  <SettingsSelect
                    value={chatFont}
                    onChange={onChatFontChange}
                    options={[
                      { value: "nova_light" as ChatFont, label: "Nova Light (Default)" },
                      { value: "nova_regular" as ChatFont, label: "Nova Regular" },
                    ]}
                  />
                </SettingTile>

                <SettingTile icon={WavesIcon} label="Motion">
                  <SegmentedControl
                    value={reduceMotion}
                    onChange={onReduceMotionChange}
                    options={[
                      { value: "system" as ReduceMotion, label: "System" },
                      { value: "reduced" as ReduceMotion, label: "Reduced" },
                    ]}
                  />
                </SettingTile>
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Notifications</p>
              <div className="rounded-3xl border border-border shadow-sm">
                <div className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-surface-2/40">
                  <div className="flex items-center gap-3">
                    <RowIcon>{BellIcon}</RowIcon>
                    <div>
                      <p className="text-sm font-medium">Allow notifications</p>
                      <p className="mt-0.5 text-xs font-light text-muted">
                        Critical security alerts are always sent, regardless of this setting.
                      </p>
                    </div>
                  </div>
                  <Toggle checked={allNotificationsEnabled} onChange={onToggleAllNotifications} />
                </div>

                {allNotificationsEnabled && (
                  <div className="divide-y divide-border border-t border-border">
                    <div className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-surface-2/40">
                      <div className="flex items-center gap-3">
                        <RowIcon>{ActivityIcon}</RowIcon>
                        <div>
                          <p className="text-sm font-medium">Activity &amp; Tasks</p>
                          <p className="mt-0.5 text-xs font-light text-muted">
                            Get notified when ChatGiZa finishes a response.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={notifyOnComplete}
                        onChange={() => {
                          if (
                            !notifyOnComplete &&
                            typeof Notification !== "undefined" &&
                            Notification.permission === "default"
                          ) {
                            Notification.requestPermission();
                          }
                          onToggleNotifyOnComplete();
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-surface-2/40">
                      <div className="flex items-center gap-3">
                        <RowIcon>{ImageGenIcon}</RowIcon>
                        <p className="text-sm font-medium">Image generation</p>
                      </div>
                      <Toggle
                        checked={notifyImageGen}
                        onChange={() => {
                          if (
                            !notifyImageGen &&
                            typeof Notification !== "undefined" &&
                            Notification.permission === "default"
                          ) {
                            Notification.requestPermission();
                          }
                          onToggleNotifyImageGen();
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "Memory" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Memory</h3>
                  <p className="text-xs font-light text-foreground">Facts ChatGiZa remembers about you across chats.</p>
                </div>
                <Toggle checked={memoryEnabled} onChange={onToggleMemoryEnabled} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newFact.trim()) return;
                  onAddMemory(newFact.trim());
                  setNewFact("");
                }}
                className="mb-3 flex gap-2"
              >
                <input
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="Add something to remember…"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <button
                  type="submit"
                  disabled={!newFact.trim()}
                  className="btn-primary rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </form>

              {memory.length === 0 ? (
                <p className="py-6 text-center text-xs font-light text-foreground">Nothing saved yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {memory.map((fact, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
                    >
                      <span className="flex-1">{fact}</span>
                      <button
                        onClick={() => onRemoveMemory(i)}
                        aria-label="Remove"
                        className="shrink-0 text-muted hover:text-foreground"
                      >
                        {TrashIcon}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 border-t border-border pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Digital Twin</h3>
                    <p className="text-xs font-light text-foreground">
                      A synthesized profile of your voice, interests, and values — used by &quot;Digital Twin&quot; mode to
                      answer as you.
                    </p>
                  </div>
                </div>
                <textarea
                  value={digitalTwin}
                  onChange={(e) => onChangeDigitalTwin(e.target.value)}
                  placeholder="Nothing generated yet — tap Regenerate to build one from your chat history, or write your own."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-light text-foreground">
                    {digitalTwinUpdatedAt > 0
                      ? `Last updated ${new Date(digitalTwinUpdatedAt).toLocaleDateString()}`
                      : "Never generated"}
                  </span>
                  <button
                    onClick={onRegenerateDigitalTwin}
                    disabled={digitalTwinRegenerating}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-40"
                  >
                    {digitalTwinRegenerating ? "Generating…" : "Regenerate from my chats"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "Data controls" && dataView === "root" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Data controls</h3>

              <Row
                title="Save chat history"
                description="When off, new conversations won't be kept after you close the tab."
                control={<Toggle checked={historyEnabled} onChange={onToggleHistoryEnabled} />}
              />

              <Row
                title="Improve the model for everyone"
                description="Allow your content to help improve ChatGiZa for you and everyone who uses it. We take steps to protect your privacy."
                control={<Toggle checked={privacyPrefs.improveModel} onChange={() => updatePrivacy({ improveModel: !privacyPrefs.improveModel })} />}
              />
              <div className="border-b border-border pb-3.5">
                <button onClick={onOpenSupport} className="text-xs font-light text-foreground underline hover:text-foreground">
                  Go to Help Center
                </button>
              </div>

              <div className="border-b border-border py-3.5">
                <h4 className="mb-1 text-sm font-semibold">Voice</h4>
                <p className="mb-2 text-xs font-light text-foreground">
                  ChatGiZa doesn&apos;t have a live Voice Mode (real-time audio/video conversation) yet — these
                  controls will apply once it does.
                </p>
                <Row title="Include your audio recordings" border={false} control={<Toggle checked={false} disabled onChange={() => {}} />} />
                <Row title="Include your video recordings" border={false} control={<Toggle checked={false} disabled onChange={() => {}} />} />
              </div>

              <Row
                title="Location"
                description={`When enabled, your approximate location helps ChatGiZa give more relevant answers — like local weather or recommendations.${
                  location ? ` Currently: ${location}.` : ""
                }${locationError ? ` ${locationError}` : ""}`}
                control={
                  <button
                    onClick={location ? onClearLocation : onRequestLocation}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    {location ? "Turn off" : "Turn on"}
                  </button>
                }
              />

              <Row
                title="Shared links"
                control={
                  <button
                    onClick={() => setDataView("shared")}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Manage
                  </button>
                }
              />

              <Row
                title="Archived chats"
                control={
                  <button
                    onClick={() => setDataView("archived")}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Manage
                  </button>
                }
              />

              <Row
                title="Archive all chats"
                control={
                  confirmArchiveAll ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmArchiveAll(false)}
                        className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onArchiveAllConversations();
                          setConfirmArchiveAll(false);
                        }}
                        className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-85 transition-opacity"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmArchiveAll(true)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                    >
                      Archive all
                    </button>
                  )
                }
              />

              <Row
                title="Delete all chats"
                control={
                  confirmClear ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onClearHistory();
                          setConfirmClear(false);
                        }}
                        className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                    >
                      Delete all
                    </button>
                  )
                }
              />

              <Row
                title="Export data"
                border={false}
                control={
                  <button
                    onClick={onExportData}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Export
                  </button>
                }
              />

              <div className="my-2 border-t border-border" />
              <h3 className="mb-1 mt-3 text-sm font-semibold">Marketing privacy</h3>

              <Row
                title="Marketing measurement"
                description="These help us measure the effectiveness of our marketing."
                control={
                  <Toggle
                    checked={privacyPrefs.marketingMeasurement}
                    onChange={() => updatePrivacy({ marketingMeasurement: !privacyPrefs.marketingMeasurement })}
                  />
                }
              />
              <Row
                title="Personalized marketing"
                description="This helps us personalize and measure ChatGiZa's own marketing on third-party platforms."
                border={false}
                control={
                  <Toggle
                    checked={privacyPrefs.personalizedMarketing}
                    onChange={() => updatePrivacy({ personalizedMarketing: !privacyPrefs.personalizedMarketing })}
                  />
                }
              />
            </div>
          )}

          {tab === "Data controls" && dataView === "shared" && (
            <div>
              <button
                onClick={() => setDataView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Shared links
              </button>
              <p className="mb-3 text-xs font-light text-foreground">
                Conversations you&apos;ve shared. ChatGiZa shares by sending the transcript through your
                device&apos;s share sheet or copying it to your clipboard — no public link is hosted.
              </p>
              {sharedConversations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs font-light text-foreground">
                  You haven&apos;t shared any chats yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {sharedConversations.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => onShareConversation(c.id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                        >
                          Copy again
                        </button>
                        <button
                          onClick={() => onUnshareConversation(c.id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Data controls" && dataView === "archived" && (
            <div>
              <button
                onClick={() => setDataView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Archived chats
              </button>
              <p className="mb-3 text-xs font-light text-foreground">Chats you&apos;ve archived out of Recents.</p>
              {archivedConversations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs font-light text-foreground">
                  No archived chats.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {archivedConversations.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => onUnarchiveConversation(c.id)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                        >
                          Unarchive
                        </button>
                        <button
                          onClick={() => onDeleteConversation(c.id)}
                          aria-label="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
                        >
                          {TrashIcon}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Security" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Security</h3>

              <div className="border-b border-border py-3.5">
                <p className="text-sm font-medium">Security keys &amp; passkeys</p>
                <p className="mt-0.5 text-xs font-light text-foreground">See all the active security keys and passkeys.</p>
                <ComingSoonNote />
              </div>

              <Row
                title="Password"
                description={
                  passwordLoading
                    ? "Loading…"
                    : hasPassword
                      ? "Change the password used to sign in with email."
                      : "Set a password so you can also sign in with email, not just Google."
                }
                border={passwordStep === "closed"}
                control={
                  <button
                    onClick={() => {
                      setPasswordError(null);
                      setPasswordStep("form");
                    }}
                    disabled={passwordLoading}
                    className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface-2 transition-colors disabled:opacity-50"
                  >
                    {hasPassword ? "Change" : "Set password"}
                  </button>
                }
              />
              {passwordStep === "form" && (
                <div className="space-y-3 border-b border-border py-3.5">
                  <p className="text-sm font-medium">{hasPassword ? "Change your password" : "Set a password"}</p>
                  {hasPassword && (
                    <input
                      type="password"
                      value={oldPasswordInput}
                      onChange={(e) => setOldPasswordInput(e.target.value)}
                      placeholder="Current password"
                      autoFocus
                      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                    />
                  )}
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="New password (6-16 characters)"
                    autoFocus={!hasPassword}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                  />
                  {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={closePasswordFlow}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitPasswordForm}
                      disabled={
                        passwordBusy ||
                        newPasswordInput.length < 6 ||
                        newPasswordInput.length > 16 ||
                        (hasPassword ? oldPasswordInput.length === 0 : false)
                      }
                      className="rounded-full bg-[#0a84ff] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {passwordBusy ? "Sending…" : "Send code"}
                    </button>
                  </div>
                </div>
              )}
              {passwordStep === "code" && !passwordDone && (
                <div className="space-y-3 border-b border-border py-3.5">
                  <p className="text-sm font-medium">Enter the 6-digit code</p>
                  <p className="text-xs font-light text-foreground">Check your email for the verification code.</p>
                  <input
                    value={passwordCode}
                    onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm tracking-widest"
                    placeholder="000000"
                  />
                  {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setPasswordStep("form")}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={confirmPasswordCode}
                      disabled={passwordBusy || passwordCode.length !== 6}
                      className="rounded-full bg-[#0a84ff] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {passwordBusy ? "Confirming…" : "Confirm"}
                    </button>
                  </div>
                </div>
              )}
              {passwordStep === "code" && passwordDone && (
                <div className="space-y-3 border-b border-border py-3.5">
                  <p className="text-sm font-medium">Password updated</p>
                  <p className="text-xs font-light text-foreground">
                    You can now sign in with email using this password.
                  </p>
                  <button
                    onClick={closePasswordFlow}
                    className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              <Row
                title="Authenticator app"
                description="Use one-time codes from an authenticator app."
                border={totpStep === "closed"}
                control={
                  <Toggle
                    checked={!!totpEnabled}
                    disabled={totpLoading || totpBusy}
                    onChange={() => {
                      if (totpEnabled) {
                        setTotpError(null);
                        setTotpDisableCode("");
                        setTotpStep("disable");
                      } else {
                        startTotpSetup();
                      }
                    }}
                  />
                }
              />
              {totpStep === "closed" && totpError && (
                <p className="border-b border-border pb-3 text-xs text-red-500">{totpError}</p>
              )}
              {totpStep === "link" && totpSecret && (
                <div className="space-y-3 border-b border-border py-3.5">
                  <p className="text-sm font-medium">Link an authenticator app</p>
                  <p className="text-xs font-light text-foreground">
                    Open your authenticator app (Google Authenticator, Authy, etc.) and add a new entry using this key.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
                      {totpSecret}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(totpSecret).then(() => {
                          setTotpCopied(true);
                          setTimeout(() => setTotpCopied(false), 2000);
                        });
                      }}
                      className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                    >
                      {totpCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {totpUri && (
                    <a
                      href={totpUri}
                      className="block truncate text-xs font-light text-foreground underline decoration-dotted"
                      title={totpUri}
                    >
                      Open in authenticator app
                    </a>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={closeTotpFlow}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={goToTotpVerifyStep}
                      className="rounded-full bg-[#0a84ff] px-4 py-2 text-xs font-medium text-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              {totpStep === "verify" && (
                <div className="space-y-3 border-b border-border py-3.5">
                  <p className="text-sm font-medium">Enter the 6-digit code</p>
                  <p className="text-xs font-light text-foreground">Enter the code your authenticator app is now showing for ChatGiZa.</p>
                  <input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm tracking-widest"
                    placeholder="000000"
                  />
                  {totpError && <p className="text-xs text-red-500">{totpError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={backToTotpLinkStep}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={confirmTotpSetup}
                      disabled={totpBusy || totpCode.length !== 6}
                      className="rounded-full bg-[#0a84ff] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {totpBusy ? "Verifying…" : "Enable 2FA"}
                    </button>
                  </div>
                </div>
              )}
              {totpStep === "disable" && (
                <div className="space-y-3 border-b border-border py-3.5">
                  <p className="text-sm font-medium">Turn off authenticator app 2FA</p>
                  <p className="text-xs font-light text-foreground">Enter your current 6-digit code to confirm.</p>
                  <input
                    value={totpDisableCode}
                    onChange={(e) => setTotpDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm tracking-widest"
                    placeholder="000000"
                  />
                  {totpError && <p className="text-xs text-red-500">{totpError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={closeTotpFlow}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={disableTotp}
                      disabled={totpBusy || totpDisableCode.length !== 6}
                      className="rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {totpBusy ? "Turning off…" : "Turn off"}
                    </button>
                  </div>
                </div>
              )}
              <Row
                title="Text message"
                description="Get 6-digit verification codes by SMS or WhatsApp."
                control={<Toggle checked={false} disabled onChange={() => {}} />}
              />

              <h3 className="mb-1 mt-5 text-base font-semibold">Sessions</h3>
              <p className="mb-3 text-xs font-light text-foreground">
                Devices signed into your account. Log out any you don&apos;t recognize.
              </p>

              {sessionsLoading && <p className="py-4 text-center text-xs font-light text-foreground">Loading…</p>}
              {sessionsError && <p className="py-2 text-xs text-red-500">{sessionsError}</p>}
              {!sessionsLoading && sessions && sessions.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs font-light text-foreground">
                  No recorded sessions yet — this only tracks sign-ins from now on.
                </p>
              )}
              {sessions && sessions.length > 0 && (
                <ul className="space-y-1.5">
                  {sessions.map((s) => (
                    <li key={s.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.device} · {s.os}
                          </p>
                          <p className="text-xs font-light text-foreground">{formatDateTime(s.signedInAt)}</p>
                          {(s.location || s.ip) && (
                            <p className="text-xs font-light text-foreground">
                              {s.location ? s.location : null}
                              {s.location && s.ip ? " · " : null}
                              {s.ip ? s.ip : null}
                            </p>
                          )}
                          {s.id === currentSessionId && (
                            <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                              Current session
                            </span>
                          )}
                        </div>
                        {s.id !== currentSessionId && (
                          <button
                            onClick={() => revokeSession(s.id)}
                            disabled={revokingId === s.id}
                            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors disabled:opacity-50"
                          >
                            {revokingId === s.id ? "Logging out…" : "Log out"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-border pt-4">
                <h4 className="mb-1 text-sm font-semibold">Log out of all sessions</h4>
                <p className="mb-2 text-xs font-light text-foreground">
                  Log out of all active sessions across all devices, including your current session.
                </p>
                {confirmLogoutAll ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmLogoutAll(false)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={logoutAllSessions}
                      className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLogoutAll(true)}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Log out of all
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "Account" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Account</h2>
                {status !== "loading" && !session?.user && (
                  <button
                    onClick={() => signIn("google", undefined, { prompt: "select_account" })}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                  >
                    Sign in with Google
                  </button>
                )}
              </div>

              <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">Personal info</p>
              <div className="divide-y divide-border rounded-2xl border border-border p-4">
                <div className="pb-3.5">
                  <label className="mb-1.5 block text-xs font-light text-muted">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                </div>

                <div className="py-3.5">
                  <label className="mb-1.5 block text-xs font-light text-muted">Date of birth</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onBlur={saveProfile}
                    max={getMaxBirthDate()}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  {!birthDateCheck.ok && <p className="mt-1 text-xs text-red-500">{birthDateCheck.reason}</p>}
                </div>

                <div className="py-3.5">
                  <label className="mb-1.5 block text-xs font-light text-muted">Country</label>
                  <SettingsSelect
                    value={country}
                    onChange={(c) => {
                      setCountry(c);
                      if (birthDateCheck.ok) onProfileChange({ nickname, about, role, fullName, birthDate, country: c, link });
                    }}
                    options={[
                      { value: "", label: "Select…" },
                      ...COUNTRIES.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </div>

                <div className="py-3.5">
                  <label className="mb-1.5 block text-xs font-light text-muted">What should GiZa call you?</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="Nickname"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                </div>

                <div className="py-3.5">
                  <label className="mb-1.5 block text-xs font-light text-muted">What best describes your work?</label>
                  <SettingsSelect
                    value={role}
                    onChange={(v) => {
                      setRole(v);
                      if (birthDateCheck.ok) onProfileChange({ nickname, about, role: v, fullName, birthDate, country, link });
                    }}
                    options={[
                      { value: "", label: "Select…" },
                      { value: "Student", label: "Student" },
                      { value: "Software / Engineering", label: "Software / Engineering" },
                      { value: "Business / Management", label: "Business / Management" },
                      { value: "Marketing / Sales", label: "Marketing / Sales" },
                      { value: "Design / Creative", label: "Design / Creative" },
                      { value: "Education", label: "Education" },
                      { value: "Healthcare", label: "Healthcare" },
                      { value: "Finance", label: "Finance" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>

                <div className="pt-3.5">
                  <label className="mb-1.5 block text-xs font-light text-muted">Link (shown on your Quantara profile)</label>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="yoursite.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                </div>
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Instructions for GiZa</p>
              <div className="rounded-2xl border border-border p-4">
                <p className="mb-3 text-xs font-light text-foreground">GiZa will keep these in mind across every conversation.</p>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  onBlur={saveProfile}
                  rows={4}
                  placeholder="e.g. I run a bakery called Sunrise Bread and prefer short, direct answers."
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Voice</p>
              <div className="divide-y divide-border rounded-2xl border border-border">
                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <h3 className="text-sm font-medium">Voice language</h3>
                  <div className="w-40 shrink-0">
                    <SettingsSelect
                      value={voiceLang}
                      onChange={(lang) => {
                        setVoiceLang(lang);
                        setStoredVoiceLang(lang);
                      }}
                      options={[
                        { value: "", label: "Auto Detect" },
                        ...voiceLanguages.map((lang) => ({ value: lang, label: lang })),
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div>
                    <h3 className="text-sm font-medium">Premium Voice</h3>
                    <p className="mt-0.5 text-xs font-light text-muted">Real AI-generated speech instead of your browser&apos;s built-in voice.</p>
                  </div>
                  <Toggle
                    checked={premiumVoice}
                    onChange={() => {
                      const next = !premiumVoice;
                      setPremiumVoice(next);
                      setPremiumVoiceEnabled(next);
                    }}
                  />
                </div>

                {premiumVoice && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <h3 className="text-sm font-medium">Premium voice</h3>
                    <div className="w-40 shrink-0">
                      <SettingsSelect
                        value={premiumVoiceName}
                        onChange={(name) => {
                          setPremiumVoiceName(name);
                          setStoredPremiumVoiceName(name);
                        }}
                        options={PREMIUM_VOICE_NAMES.map((name) => ({
                          value: name,
                          label: name.charAt(0).toUpperCase() + name.slice(1),
                        }))}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <h3 className="text-sm font-medium">Voice</h3>
                  <div className="w-52 shrink-0">
                    {filteredVoices.length === 0 ? (
                      <p className="text-right text-xs font-light text-foreground">No voices found</p>
                    ) : (
                      <SettingsSelect
                        value={voiceURI}
                        onChange={(uri) => {
                          setVoiceURI(uri);
                          setStoredVoiceURI(uri);
                        }}
                        options={[
                          { value: "", label: "Browser default" },
                          ...filteredVoices.map((v) => ({ value: v.voiceURI, label: v.name })),
                        ]}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <h3 className="text-sm font-medium">Speed</h3>
                  <div className="w-40 shrink-0">
                    <SettingsSelect
                      value={voiceSpeed}
                      onChange={(speed) => {
                        setVoiceSpeed(speed);
                        setStoredVoiceSpeed(speed);
                      }}
                      options={[
                        { value: "slow" as VoiceSpeed, label: "Slow" },
                        { value: "normal" as VoiceSpeed, label: "Normal" },
                        { value: "fast" as VoiceSpeed, label: "Fast" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">GiZa Builder Profile</p>
              <div className="rounded-2xl border border-border p-4">
                <p className="mb-2 text-xs font-light text-foreground">
                  Personalize your builder profile to connect with users of your GiZas. These settings apply to
                  publicly shared GiZas.
                </p>
                <ComingSoonNote text="ChatGiZa doesn't have a public GiZa builder/marketplace yet — coming soon." />
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">Preferences</p>
              <div className="rounded-2xl border border-border">
                <Row
                  title="Receive feedback emails"
                  description="Occasional emails asking how ChatGiZa is working for you."
                  border={false}
                  control={<Toggle checked={feedbackEmailsOptIn} onChange={onToggleFeedbackEmailsOptIn} />}
                />
              </div>

              <p className="mb-2 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-[#b3413e]">Danger zone</p>
              <div className="rounded-2xl border border-[#b3413e]/30 p-4">
                <h3 className="mb-1 text-sm font-semibold text-[#b3413e]">Delete account</h3>
                <p className="mb-2 text-xs font-light text-foreground">
                  Permanently deletes your ChatGiZa account data. Chat history stored only in this browser is not
                  affected until you also clear it.
                </p>
                {confirmDeleteAccount ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeleteAccount(false)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onDeleteAccount}
                      className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors"
                    >
                      Confirm delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteAccount(true)}
                    disabled={!session?.user}
                    className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors disabled:opacity-40"
                  >
                    Delete account
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "Dashboard" && (
            <div>
              <h3 className="mb-1 border-b border-border pb-3 text-sm font-semibold">Your data dashboard</h3>
              <p className="mb-4 mt-3 text-xs font-light text-foreground">
                A transparent look at what ChatGiZa actually holds about you — computed from your own account, not sent anywhere else.
              </p>

              <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <StatTile label="Conversations" value={String(activeConversations.length)} />
                <StatTile label="Messages you sent" value={String(userMessages.length)} />
                <StatTile label="Replies received" value={String(assistantMessages.length)} />
                <StatTile label="Words written" value={wordsWritten.toLocaleString()} />
                <StatTile label="Active days" value={String(activeDayCount)} />
                <StatTile label="Files & images shared" value={String(attachmentCount + mediaCount)} />
              </div>

              <div className="mb-5 space-y-1.5 rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">First message</span>
                  <span>{firstMessageAt ? new Date(firstMessageAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Most recent message</span>
                  <span>{lastMessageAt ? new Date(lastMessageAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Memory facts saved</span>
                  <span>{memory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Digital Twin profile</span>
                  <span>{digitalTwin.trim() ? `Generated · ${new Date(digitalTwinUpdatedAt).toLocaleDateString()}` : "Not generated yet"}</span>
                </div>
              </div>

              <h4 className="mb-2 text-sm font-semibold">Manage your data</h4>
              <button
                onClick={onExportData}
                className="mb-2 flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-surface-2"
              >
                <span>Export everything as a file</span>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>
              <button
                onClick={() => setTab("Data controls")}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-surface-2"
              >
                <span>Data controls & delete account</span>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>
            </div>
          )}

          {tab === "Storage" && storageView === "root" && (
            <div>
              <h3 className="mb-3 border-b border-border pb-3 text-sm font-semibold">Storage</h3>

              <p className="mb-2 text-sm font-medium">
                {formatBytes(storageBytesUsed)} of {formatBytes(storageCapBytes)} used
              </p>
              <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full min-w-[3px] rounded-full bg-foreground" style={{ width: `${storagePct}%` }} />
              </div>

              <h4 className="text-sm font-semibold">Manage storage</h4>
              <p className="mb-2 text-xs font-light text-foreground">Manage your library to free up storage.</p>

              <button
                onClick={() => setStorageView("files")}
                className="flex w-full items-center justify-between gap-3 border-t border-border py-3 text-left transition-colors hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">Files</p>
                  <p className="text-xs font-light text-foreground">
                    {formatBytes(fileBytes)} • {fileCount} file{fileCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>

              <button
                onClick={() => setStorageView("images")}
                className="flex w-full items-center justify-between gap-3 border-t border-border py-3 text-left transition-colors hover:bg-surface-2"
              >
                <div>
                  <p className="text-sm font-medium">Images</p>
                  <p className="text-xs font-light text-foreground">
                    {formatBytes(imageBytes)} • {imageCount} image{imageCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-muted">{ChevronRightIcon}</span>
              </button>
            </div>
          )}

          {tab === "Storage" && storageView === "files" && (
            <div>
              <button
                onClick={() => setStorageView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Files
              </button>
              {fileItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs font-light text-foreground">
                  No files uploaded yet — PDFs and text files you attach in chat will show up here.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {fileItems.map((item) => (
                    <li key={item.id} className="rounded-xl border border-border p-2.5">
                      <p className="truncate text-sm">{item.label}</p>
                      <p className="truncate text-xs font-light text-foreground">
                        {item.conversationTitle}
                        {item.bytes ? ` · ${formatBytes(item.bytes)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Storage" && storageView === "images" && (
            <div>
              <button
                onClick={() => setStorageView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Images
              </button>
              {imageItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs font-light text-foreground">
                  No images or videos yet — uploads and anything ChatGiZa generates will show up here.
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {imageItems.map((item) => (
                    <li key={item.id} className="overflow-hidden rounded-lg border border-border">
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt={item.label} className="h-20 w-full object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-surface-2 text-xs font-light text-foreground">
                          Video
                        </div>
                      )}
                      <p className="truncate px-1.5 py-1 text-[11px] text-muted">{item.conversationTitle}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Billing" && billingView === "root" && (
            <div>
              <h3 className="mb-3 border-b border-border pb-3 text-lg font-semibold">Billing</h3>

              {!session?.user ? (
                <p className="text-xs font-light text-foreground">Sign in to view billing.</p>
              ) : billingLoading ? (
                <p className="py-4 text-center text-xs font-light text-foreground">Loading…</p>
              ) : billingError ? (
                <p className="text-xs text-red-500">{billingError}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-border py-3.5">
                    <div>
                      <h2 className="text-base font-semibold">
                        ChatGiZa {billing?.subscription ? billing.subscription.planName : "Plan"}
                      </h2>
                      <p className="mt-1 text-xs font-light text-foreground">
                        {billing?.subscription?.cancelAtPeriodEnd ? "Your plan ends on " : "Your plan auto-renews on "}
                        {formatDate(billing?.subscription?.currentPeriodEnd ?? Date.now())}
                      </p>
                    </div>
                    {onOpenUpgradePlan && (
                      <button
                        onClick={onOpenUpgradePlan}
                        className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Compare plans
                      </button>
                    )}
                  </div>

                  <h4 className="mb-2 mt-4 text-sm font-semibold">Billing history</h4>
                  {!billing || billing.invoices.length === 0 ? (
                    <p className="mb-4 rounded-xl border border-dashed border-border p-4 text-center text-xs font-light text-foreground">
                      No invoices yet.
                    </p>
                  ) : (
                    <ul className="mb-4 space-y-1.5">
                      {billing.invoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-2.5 text-sm">
                          <span className="text-muted">{formatDate(inv.date)}</span>
                          <span>
                            {inv.currency.toUpperCase()} {(inv.amount / 100).toFixed(2)}
                          </span>
                          <span className="capitalize text-muted">{inv.status}</span>
                          {inv.hostedUrl ? (
                            <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                              View
                            </a>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="text-sm font-semibold">Billing information</h4>
                    <button
                      onClick={openEditBillingInfo}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="border-b border-border py-3 text-sm">
                    <p className="text-xs font-light text-foreground">Billing email</p>
                    <p className="mb-2">{billing?.billingInfo?.email ?? session.user.email}</p>
                    {billing?.billingInfo?.name && (
                      <>
                        <p className="text-xs font-light text-foreground">Name</p>
                        <p className="mb-2">{billing.billingInfo.name}</p>
                      </>
                    )}
                    {billing?.billingInfo?.address?.line1 && (
                      <>
                        <p className="text-xs font-light text-foreground">Address</p>
                        <p>
                          {billing.billingInfo.address.line1}, {billing.billingInfo.address.city}
                          {billing.billingInfo.address.postal_code ? `, ${billing.billingInfo.address.postal_code}` : ""}
                        </p>
                        <p>{billing.billingInfo.address.country}</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-b border-border py-3">
                    <h4 className="text-sm font-semibold">Payment methods</h4>
                    <button
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors disabled:opacity-50"
                    >
                      Add new
                    </button>
                  </div>
                  {!billing || billing.paymentMethods.length === 0 ? (
                    <p className="border-b border-border py-3 text-xs font-light text-foreground">No cards on file.</p>
                  ) : (
                    <ul className="space-y-1.5 border-b border-border py-3">
                      {billing.paymentMethods.map((pm) => (
                        <li key={pm.id} className="flex items-center justify-between rounded-xl border border-border p-2.5 text-sm">
                          <span className="capitalize">
                            {pm.brand} •••• {pm.last4}
                          </span>
                          {pm.isDefault && <span className="text-xs font-light text-foreground">Default</span>}
                        </li>
                      ))}
                    </ul>
                  )}

                  {billing?.subscription && !billing.subscription.cancelAtPeriodEnd && (
                    <div className="pt-4">
                      <h4 className="mb-1 text-sm font-semibold">Cancel plan</h4>
                      <p className="mb-2 text-xs font-light text-foreground">
                        If you cancel, you&apos;ll keep full access to your plan features until the end of your
                        billing period.
                      </p>
                      {confirmCancelPlan ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmCancelPlan(false)}
                            className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                          >
                            Keep plan
                          </button>
                          <button
                            onClick={cancelPlan}
                            disabled={cancelLoading}
                            className="rounded-full border border-[#b3413e] px-4 py-1.5 text-sm font-medium text-[#b3413e] hover:bg-[#b3413e]/10 transition-colors disabled:opacity-50"
                          >
                            {cancelLoading ? "Cancelling…" : "Confirm cancel"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelPlan(true)}
                          className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                        >
                          Cancel plan
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "Billing" && billingView === "edit" && (
            <div>
              <button
                onClick={() => setBillingView("root")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {ChevronLeftIcon}
                Billing information
              </button>

              <form onSubmit={saveBillingInfo}>
                <label className="mb-1 block text-xs font-light text-foreground">Billing email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <label className="mb-1 block text-xs font-light text-foreground">Full name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <label className="mb-1 block text-xs font-light text-foreground">Country or region</label>
                <div className="mb-4">
                  <SettingsSelect
                    value={editCountry}
                    onChange={setEditCountry}
                    options={[{ value: "", label: "Select…" }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                  />
                </div>

                <label className="mb-1 block text-xs font-light text-foreground">Address line 1</label>
                <input
                  value={editLine1}
                  onChange={(e) => setEditLine1(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <label className="mb-1 block text-xs font-light text-foreground">Address line 2</label>
                <input
                  value={editLine2}
                  onChange={(e) => setEditLine2(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-light text-foreground">Postal code</label>
                    <input
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-light text-foreground">City</label>
                    <input
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                    />
                  </div>
                </div>

                <label className="mb-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editAddTaxId}
                    onChange={(e) => setEditAddTaxId(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Add tax ID
                </label>

                {editAddTaxId && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-light text-foreground">Tax ID type</label>
                      <SettingsSelect
                        value={editTaxIdType}
                        onChange={setEditTaxIdType}
                        options={[
                          { value: "eu_vat", label: "EU VAT" },
                          { value: "gb_vat", label: "UK VAT" },
                          { value: "us_ein", label: "US EIN" },
                          { value: "in_gst", label: "India GST" },
                          { value: "za_vat", label: "South Africa VAT" },
                          { value: "ae_trn", label: "UAE TRN" },
                          { value: "au_abn", label: "Australia ABN" },
                          { value: "ca_bn", label: "Canada BN" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-light text-foreground">Tax ID value</label>
                      <input
                        value={editTaxIdValue}
                        onChange={(e) => setEditTaxIdValue(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                      />
                    </div>
                  </div>
                )}

                {editError && <p className="mb-3 text-xs text-red-500">{editError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingView("root")}
                    className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="btn-primary rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
