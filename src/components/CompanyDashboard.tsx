"use client";

import { useState } from "react";
import { PLAN_DETAILS } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";

export type CompanyProfile = { name: string; description: string; employees: { name: string; role: string }[] };
export type CompanyRequest = {
  id: string;
  customerName: string;
  note: string;
  status: "pending" | "approved";
  createdAt: number;
};

const SUB_TABS = ["Dashboard", "Requests", "Profile"] as const;
type SubTab = (typeof SUB_TABS)[number];

const BackIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const InboxIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12h4l2 3h4l2-3h4" />
    <path d="M4 12l1.5-7A2 2 0 0 1 7.5 3h9a2 2 0 0 1 2 2l1.5 7v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z" />
  </svg>
);

const ClockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const CheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
);

const PeopleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="3" />
    <path d="M2 20c.8-3.5 3.3-5.5 7-5.5s6.2 2 7 5.5" />
    <circle cx="17" cy="8" r="2.5" />
    <path d="M17 5.5c1.7 0 3 1.3 3 3" />
  </svg>
);

const UpArrowIcon = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const DownArrowIcon = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

function StatCard({
  icon,
  value,
  label,
  trend,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  trend?: { pct: number; up: boolean } | null;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground">{icon}</span>
        {trend && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              trend.up ? "bg-surface-2 text-foreground" : "border border-border text-muted"
            }`}
          >
            {trend.up ? UpArrowIcon : DownArrowIcon}
            {trend.pct}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function trendFor(current: number, previous: number): { pct: number; up: boolean } | null {
  if (current === 0 && previous === 0) return null;
  if (previous === 0) return { pct: 100, up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

function LineChart({ data }: { data: number[] }) {
  const w = 320;
  const h = 120;
  const pad = 10;
  const max = Math.max(1, ...data);
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - pad * 2);
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
      <path d={areaPath} fill="var(--surface-2)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--foreground)" />
      ))}
    </svg>
  );
}

function DonutChart({ pending, approved }: { pending: number; approved: number }) {
  const total = pending + approved;
  const size = 112;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const approvedFrac = total ? approved / total : 0;
  const approvedLen = c * approvedFrac;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-28 w-28 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      {total > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={stroke}
          strokeDasharray={`${approvedLen} ${c - approvedLen}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="600" fill="var(--foreground)">
        {total}
      </text>
    </svg>
  );
}

export default function CompanyDashboard({
  onClose,
  company,
  onCompanyChange,
  plan,
  onOpenUpgradePlan,
  companyRequests,
  onAddCompanyRequest,
  onUpdateCompanyRequestStatus,
  onRemoveCompanyRequest,
}: {
  onClose: () => void;
  company: CompanyProfile;
  onCompanyChange: (c: CompanyProfile) => void;
  plan: PlanTier | null;
  onOpenUpgradePlan: () => void;
  companyRequests: CompanyRequest[];
  onAddCompanyRequest: (customerName: string, note: string) => void;
  onUpdateCompanyRequestStatus: (id: string, status: CompanyRequest["status"]) => void;
  onRemoveCompanyRequest: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("Dashboard");
  const [companyName, setCompanyName] = useState(company.name);
  const [companyDescription, setCompanyDescription] = useState(company.description);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeRole, setNewEmployeeRole] = useState("");
  const [newRequestName, setNewRequestName] = useState("");
  const [newRequestNote, setNewRequestNote] = useState("");
  const [chartRange, setChartRange] = useState<"day" | "week" | "month" | "year">("week");

  function saveCompanyBasics() {
    onCompanyChange({ ...company, name: companyName, description: companyDescription });
  }

  function addEmployee() {
    if (!newEmployeeName.trim()) return;
    onCompanyChange({
      ...company,
      name: companyName,
      description: companyDescription,
      employees: [...company.employees, { name: newEmployeeName.trim(), role: newEmployeeRole.trim() }],
    });
    setNewEmployeeName("");
    setNewEmployeeRole("");
  }

  function removeEmployee(index: number) {
    onCompanyChange({ ...company, employees: company.employees.filter((_, i) => i !== index) });
  }

  function submitRequest() {
    if (!newRequestName.trim()) return;
    onAddCompanyRequest(newRequestName.trim(), newRequestNote.trim());
    setNewRequestName("");
    setNewRequestNote("");
  }

  const pendingRequests = companyRequests.filter((r) => r.status === "pending");
  const approvedRequests = companyRequests.filter((r) => r.status === "approved");

  // Bucket boundaries per range: [count of buckets, ms per bucket]
  const bucketConfig: Record<typeof chartRange, { count: number; msPerBucket: number }> = {
    day: { count: 12, msPerBucket: 60 * 60 * 1000 * 2 }, // last 24h in 2h steps
    week: { count: 7, msPerBucket: 24 * 60 * 60 * 1000 },
    month: { count: 30, msPerBucket: 24 * 60 * 60 * 1000 },
    year: { count: 12, msPerBucket: 30 * 24 * 60 * 60 * 1000 },
  };
  const { count, msPerBucket } = bucketConfig[chartRange];
  const now = Date.now();
  const chartData = Array.from({ length: count }, (_, i) => {
    const bucketEnd = now - (count - 1 - i) * msPerBucket;
    const bucketStart = bucketEnd - msPerBucket;
    return companyRequests.filter((r) => r.createdAt > bucketStart && r.createdAt <= bucketEnd).length;
  });
  const currentPeriodCount = chartData[chartData.length - 1] ?? 0;
  const previousPeriodCount = chartData[chartData.length - 2] ?? 0;
  const totalTrend = trendFor(currentPeriodCount, previousPeriodCount);

  const recentRequests = [...companyRequests].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Close Company KYC"
            className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {BackIcon}
          </button>
          <h1 className="font-serif text-2xl">Company KYC</h1>
        </div>
        {plan && (
          <span className="text-xs text-muted">
            Plan: <span className="font-medium text-foreground">{PLAN_DETAILS[plan].name}</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        {!plan ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <h2 className="mb-1 text-sm font-semibold">Upgrade to unlock Company KYC</h2>
            <p className="mb-4 text-xs text-muted">
              Company KYC — profile, customer requests, and analytics — is included with any ChatGiZa plan.
            </p>
            <button onClick={onOpenUpgradePlan} className="btn-primary rounded-full px-4 py-2 text-sm font-medium">
              View plans
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex w-fit gap-1 rounded-full border border-border p-1">
              {SUB_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSubTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    subTab === t ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {subTab === "Dashboard" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">General report</h2>
                  <div className="flex gap-1 rounded-full border border-border p-1">
                    {(["day", "week", "month", "year"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setChartRange(r)}
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                          chartRange === r ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard icon={InboxIcon} value={companyRequests.length} label="Total requests" />
                  <StatCard
                    icon={ClockIcon}
                    value={currentPeriodCount}
                    label={`New this ${chartRange}`}
                    trend={totalTrend}
                  />
                  <StatCard icon={CheckIcon} value={approvedRequests.length} label="Approved" />
                  <StatCard icon={PeopleIcon} value={company.employees.length} label="Team members" />
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-border p-4 lg:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Requests over time</h3>
                      <span className="text-xs text-muted">Pending {pendingRequests.length}</span>
                    </div>
                    {companyRequests.length === 0 ? (
                      <p className="py-10 text-center text-xs text-muted">
                        Add customer requests to see activity here.
                      </p>
                    ) : (
                      <LineChart data={chartData} />
                    )}
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Status breakdown</h3>
                    <div className="flex items-center gap-4">
                      <DonutChart pending={pendingRequests.length} approved={approvedRequests.length} />
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-foreground" />
                          Approved ({approvedRequests.length})
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-surface-2 ring-1 ring-inset ring-border" />
                          Pending ({pendingRequests.length})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Recent requests</h3>
                    {recentRequests.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted">Nothing logged yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {recentRequests.map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{r.customerName}</p>
                              <p className="truncate text-xs text-muted">{r.note || "—"}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                r.status === "approved" ? "bg-surface-2" : "border border-border text-muted"
                              }`}
                            >
                              {r.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Team</h3>
                    {company.employees.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted">No employees added yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {company.employees.map((emp, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-medium">
                              {emp.name[0]?.toUpperCase()}
                            </span>
                            <span className="truncate">
                              {emp.name}
                              {emp.role && <span className="text-muted"> — {emp.role}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {subTab === "Profile" && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Company profile</h3>
                <p className="mb-3 text-xs text-muted">
                  ChatGiZa uses this to answer questions about your company — what it does and who works there —
                  naturally, like a real team member would.
                </p>
                <label className="mb-1 block text-xs text-muted">Company name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onBlur={saveCompanyBasics}
                  placeholder="e.g. Sunrise Bakery Ltd"
                  className="mb-3 w-full max-w-xl rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <label className="mb-1 block text-xs text-muted">What does the company do?</label>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  onBlur={saveCompanyBasics}
                  rows={4}
                  placeholder="e.g. We bake and deliver fresh bread across Dar es Salaam, with same-day orders via WhatsApp."
                  className="mb-6 w-full max-w-xl rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />

                <h3 className="mb-1 text-sm font-semibold">Team directory</h3>
                <p className="mb-3 text-xs text-muted">Employees ChatGiZa can mention by name and role.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addEmployee();
                  }}
                  className="mb-3 flex max-w-xl gap-2"
                >
                  <input
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <input
                    value={newEmployeeRole}
                    onChange={(e) => setNewEmployeeRole(e.target.value)}
                    placeholder="Role (optional)"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <button
                    type="submit"
                    disabled={!newEmployeeName.trim()}
                    className="btn-primary shrink-0 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
                  >
                    Add
                  </button>
                </form>

                {company.employees.length === 0 ? (
                  <p className="max-w-xl py-6 text-center text-xs text-muted">No employees added yet.</p>
                ) : (
                  <ul className="max-w-xl space-y-1.5">
                    {company.employees.map((emp, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
                      >
                        <span className="flex-1 truncate">
                          {emp.name}
                          {emp.role && <span className="text-muted"> — {emp.role}</span>}
                        </span>
                        <button
                          onClick={() => removeEmployee(i)}
                          aria-label="Remove"
                          className="shrink-0 text-muted hover:text-foreground"
                        >
                          {TrashIcon}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {subTab === "Requests" && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Customer requests</h3>
                <p className="mb-3 text-xs text-muted">Track customer requests through Pending and Approved.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitRequest();
                  }}
                  className="mb-4 flex max-w-xl gap-2"
                >
                  <input
                    value={newRequestName}
                    onChange={(e) => setNewRequestName(e.target.value)}
                    placeholder="Customer name"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <input
                    value={newRequestNote}
                    onChange={(e) => setNewRequestNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <button
                    type="submit"
                    disabled={!newRequestName.trim()}
                    className="btn-primary shrink-0 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40"
                  >
                    Add
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-muted">PENDING ({pendingRequests.length})</h4>
                    {pendingRequests.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted">Nothing pending.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {pendingRequests.map((r) => (
                          <li key={r.id} className="rounded-lg border border-border p-2.5 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium">{r.customerName}</span>
                              <button
                                onClick={() => onRemoveCompanyRequest(r.id)}
                                aria-label="Remove"
                                className="shrink-0 text-muted hover:text-foreground"
                              >
                                {TrashIcon}
                              </button>
                            </div>
                            {r.note && <p className="text-xs text-muted">{r.note}</p>}
                            <button
                              onClick={() => onUpdateCompanyRequestStatus(r.id, "approved")}
                              className="mt-2 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-surface-2 transition-colors"
                            >
                              Approve
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-muted">APPROVED ({approvedRequests.length})</h4>
                    {approvedRequests.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted">Nothing approved yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {approvedRequests.map((r) => (
                          <li key={r.id} className="rounded-lg border border-border p-2.5 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium">{r.customerName}</span>
                              <button
                                onClick={() => onRemoveCompanyRequest(r.id)}
                                aria-label="Remove"
                                className="shrink-0 text-muted hover:text-foreground"
                              >
                                {TrashIcon}
                              </button>
                            </div>
                            {r.note && <p className="text-xs text-muted">{r.note}</p>}
                            <button
                              onClick={() => onUpdateCompanyRequestStatus(r.id, "pending")}
                              className="mt-2 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-surface-2 transition-colors"
                            >
                              Move to pending
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
