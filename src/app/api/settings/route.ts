import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";

type PluginKey =
  | "web_search"
  | "deep_research"
  | "deep_think"
  | "image"
  | "video"
  | "document_writer"
  | "sql_helper"
  | "python_helper"
  | "business_assistant"
  | "ai_agent"
  | "digital_twin";

type PrivacyPrefs = {
  improveModel: boolean;
  includeAudioRecordings: boolean;
  includeVideoRecordings: boolean;
  marketingMeasurement: boolean;
  personalizedMarketing: boolean;
};

type CompanyProfile = {
  name: string;
  description: string;
  employees: { name: string; role: string }[];
};

type CompanyRequest = {
  id: string;
  customerName: string;
  note: string;
  status: "pending" | "approved";
  createdAt: number;
};

type SettingsData = {
  plugins: Record<PluginKey, boolean>;
  notifyOnComplete: boolean;
  notifyImageGen: boolean;
  allNotificationsEnabled: boolean;
  privacy: PrivacyPrefs;
  location: string;
  company: CompanyProfile;
  companyRequests: CompanyRequest[];
};

const DEFAULT_SETTINGS_DATA: SettingsData = {
  plugins: {
    web_search: true,
    deep_research: true,
    deep_think: true,
    image: true,
    video: true,
    document_writer: true,
    sql_helper: true,
    python_helper: true,
    business_assistant: true,
    ai_agent: true,
    digital_twin: true,
  },
  notifyOnComplete: true,
  notifyImageGen: true,
  allNotificationsEnabled: true,
  privacy: {
    improveModel: false,
    includeAudioRecordings: false,
    includeVideoRecordings: false,
    marketingMeasurement: true,
    personalizedMarketing: true,
  },
  location: "",
  company: { name: "", description: "", employees: [] },
  companyRequests: [],
};

const PLUGIN_KEYS: PluginKey[] = [
  "web_search",
  "deep_research",
  "deep_think",
  "image",
  "video",
  "document_writer",
  "sql_helper",
  "python_helper",
  "business_assistant",
  "ai_agent",
  "digital_twin",
];

function settingsKey(userId: string) {
  return `chatgiza:settings-data:${userId}`;
}

// Second sync blob alongside /api/profile — everything here is small
// flags/prefs (plugins, notifications, privacy, location, company info),
// bundled into one KV entry rather than one route each. Same cookie-or-
// bearer auth as every other synced endpoint, so website and native app
// share one source of truth.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const data = await kv.get<SettingsData>(settingsKey(userId));
    return NextResponse.json(data ?? DEFAULT_SETTINGS_DATA);
  } catch (err) {
    console.error("Settings KV get error", err);
    const message = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(req));
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const plugins = { ...DEFAULT_SETTINGS_DATA.plugins };
  if (body.plugins && typeof body.plugins === "object") {
    for (const key of PLUGIN_KEYS) {
      if (typeof body.plugins[key] === "boolean") plugins[key] = body.plugins[key];
    }
  }

  const rawPrivacy = body.privacy && typeof body.privacy === "object" ? body.privacy : {};
  const privacy: PrivacyPrefs = {
    improveModel: typeof rawPrivacy.improveModel === "boolean" ? rawPrivacy.improveModel : DEFAULT_SETTINGS_DATA.privacy.improveModel,
    includeAudioRecordings:
      typeof rawPrivacy.includeAudioRecordings === "boolean" ? rawPrivacy.includeAudioRecordings : DEFAULT_SETTINGS_DATA.privacy.includeAudioRecordings,
    includeVideoRecordings:
      typeof rawPrivacy.includeVideoRecordings === "boolean" ? rawPrivacy.includeVideoRecordings : DEFAULT_SETTINGS_DATA.privacy.includeVideoRecordings,
    marketingMeasurement:
      typeof rawPrivacy.marketingMeasurement === "boolean" ? rawPrivacy.marketingMeasurement : DEFAULT_SETTINGS_DATA.privacy.marketingMeasurement,
    personalizedMarketing:
      typeof rawPrivacy.personalizedMarketing === "boolean" ? rawPrivacy.personalizedMarketing : DEFAULT_SETTINGS_DATA.privacy.personalizedMarketing,
  };

  const rawCompany = body.company && typeof body.company === "object" ? body.company : {};
  const company: CompanyProfile = {
    name: typeof rawCompany.name === "string" ? rawCompany.name : "",
    description: typeof rawCompany.description === "string" ? rawCompany.description : "",
    employees: Array.isArray(rawCompany.employees)
      ? rawCompany.employees
          .filter((e: unknown): e is { name: unknown; role: unknown } => !!e && typeof e === "object")
          .map((e: { name: unknown; role: unknown }) => ({
            name: typeof e.name === "string" ? e.name : "",
            role: typeof e.role === "string" ? e.role : "",
          }))
      : [],
  };

  const companyRequests: CompanyRequest[] = Array.isArray(body.companyRequests)
    ? body.companyRequests
        .filter((r: unknown): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r: Record<string, unknown>) => ({
          id: typeof r.id === "string" ? r.id : "",
          customerName: typeof r.customerName === "string" ? r.customerName : "",
          note: typeof r.note === "string" ? r.note : "",
          status: r.status === "approved" ? "approved" : "pending",
          createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
        }))
        .filter((r: CompanyRequest) => r.id)
    : [];

  const data: SettingsData = {
    plugins,
    notifyOnComplete: typeof body.notifyOnComplete === "boolean" ? body.notifyOnComplete : DEFAULT_SETTINGS_DATA.notifyOnComplete,
    notifyImageGen: typeof body.notifyImageGen === "boolean" ? body.notifyImageGen : DEFAULT_SETTINGS_DATA.notifyImageGen,
    allNotificationsEnabled:
      typeof body.allNotificationsEnabled === "boolean" ? body.allNotificationsEnabled : DEFAULT_SETTINGS_DATA.allNotificationsEnabled,
    privacy,
    location: typeof body.location === "string" ? body.location : "",
    company,
    companyRequests,
  };

  try {
    await kv.set(settingsKey(userId), data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Settings KV set error", err);
    const message = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
