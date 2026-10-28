import "./_group.css";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Mail,
  RefreshCw,
  FileText,
  CheckSquare,
  Plane,
  AlertTriangle,
} from "lucide-react";

const brand = {
  navy:    "#001833",
  darkBlue:"#002F6D",
  midBlue: "#003C8A",
  blue:    "#0068EF",
  lightBg: "#E8F2FF",
  slate:   "#3F5972",
  white:   "#FFFFFF",
};

const navGroups = [
  {
    label: "Overview",
    items: [
      { Icon: LayoutDashboard, label: "Dashboard",    active: true },
      { Icon: CalendarDays,    label: "Orientations", active: false },
      { Icon: Users,           label: "All Hires",    active: false },
    ],
  },
  {
    label: "Operations",
    items: [
      { Icon: Mail,      label: "Communications", active: false },
      { Icon: RefreshCw, label: "Data Sync",       active: false },
    ],
  },
  {
    label: "Configuration",
    items: [
      { Icon: FileText,    label: "Comm Templates", active: false },
      { Icon: CheckSquare, label: "Task Templates",  active: false },
    ],
  },
];

export function GlobalOnboardingTracker() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", background: "#F8FAFC" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 240, background: brand.navy, display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Logo row */}
        <div style={{
          height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: brand.blue,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Plane size={16} color={brand.white} />
          </div>
          <span style={{ color: brand.white, fontWeight: 600, fontSize: 14, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
            Global Onboarding<br />Tracker
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)", padding: "0 8px", marginBottom: 4,
              }}>
                {group.label}
              </div>
              {group.items.map(({ Icon, label, active }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 6, marginBottom: 1, cursor: "pointer",
                  background: active ? brand.blue : "transparent",
                  color: active ? brand.white : "rgba(255,255,255,0.65)",
                  fontSize: 13, fontWeight: active ? 600 : 400,
                }}>
                  <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.8 }} />
                  {label}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <div style={{
          height: 64, background: brand.white, borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px",
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: brand.navy, margin: 0 }}>Command Center</h1>
            <p style={{ fontSize: 12, color: brand.slate, margin: 0 }}>Overview of your onboarding operations.</p>
          </div>
          <button style={{
            background: brand.blue, color: brand.white, border: "none",
            borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            + Quick Add Hire
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Upcoming Hires",   value: "10",   sub: "Next 4–6 weeks" },
              { label: "Next Orientation", value: "Jul 21", sub: "4 hires scheduled" },
              { label: "Pending Tasks",    value: "11",   sub: "Across all upcoming hires" },
              { label: "Scheduled Comms",  value: "10",   sub: "Ready to send" },
            ].map((c) => (
              <div key={c.label} style={{
                background: brand.white, border: "1px solid #E2E8F0", borderRadius: 12,
                padding: "20px 20px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: brand.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: brand.navy, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: brand.slate, marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Lower row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

            {/* Orientation breakdown */}
            <div style={{
              background: brand.white, border: "1px solid #E2E8F0", borderRadius: 12,
              padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontWeight: 700, color: brand.navy, marginBottom: 4 }}>Orientation Breakdown</div>
              <div style={{ fontSize: 12, color: brand.slate, marginBottom: 16 }}>Upcoming hires by orientation type</div>
              {[
                { Icon: LayoutDashboard, label: "Virtual",   sub: "Remote onboarding",  count: 5, color: brand.blue },
                { Icon: Users,           label: "In-Person", sub: "Office onboarding",  count: 5, color: brand.midBlue },
              ].map(({ Icon, label, sub, count, color }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                  background: brand.lightBg,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} color={brand.white} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: brand.navy }}>{label}</div>
                      <div style={{ fontSize: 11, color: brand.slate }}>{sub}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: brand.navy }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{
              background: brand.white, border: "1px solid #E2E8F0", borderRadius: 12,
              padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontWeight: 700, color: brand.navy, marginBottom: 4 }}>Quick Actions</div>
              <div style={{ fontSize: 12, color: brand.slate, marginBottom: 16 }}>Common operations</div>
              {[
                { Icon: CalendarDays, label: "View Orientation Calendar" },
                { Icon: Mail,         label: "Review Upcoming Communications" },
                { Icon: RefreshCw,    label: "Trigger Data Sync" },
              ].map(({ Icon, label }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "13px 16px", borderRadius: 8, border: "1px solid #E2E8F0",
                  marginBottom: 8, fontSize: 13, color: brand.darkBlue, fontWeight: 500,
                  cursor: "pointer", background: "#FAFCFF",
                }}>
                  <Icon size={14} color={brand.blue} style={{ flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Hire Readiness */}
          <div style={{
            background: brand.white, border: "1px solid #E2E8F0", borderRadius: 12,
            padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, color: brand.navy }}>Hire Readiness</div>
              <span style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#FEE2E2", color: "#DC2626", fontSize: 11, fontWeight: 600,
                borderRadius: 6, padding: "3px 10px",
              }}>
                <AlertTriangle size={11} /> 10 need attention
              </span>
            </div>
            <div style={{ fontSize: 12, color: brand.slate, marginBottom: 16 }}>Upcoming hires with incomplete profile information or missing tasks</div>
            {[
              { name: "Marcus Johnson", score: 40, date: "Jul 21", missing: ["tasks", "orientation type"] },
              { name: "Priya Patel",    score: 60, date: "Jul 21", missing: ["buddy"] },
              { name: "David Kim",      score: 80, date: "Jul 28", missing: ["laptop type"] },
            ].map((h) => {
              const color = h.score >= 80 ? "#16A34A" : h.score >= 50 ? "#D97706" : "#DC2626";
              const chipBg = h.score >= 80 ? "#DCFCE7" : h.score >= 50 ? "#FEF3C7" : "#FEE2E2";
              return (
                <div key={h.name} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "12px 0", borderTop: "1px solid #F1F5F9",
                }}>
                  <div style={{ width: 48, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{h.score}</div>
                    <div style={{ fontSize: 9, color: brand.slate }}>%</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: brand.navy }}>{h.name}</span>
                      <span style={{ fontSize: 11, color: brand.slate }}>Orient. {h.date}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "#F1F5F9", overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ width: `${h.score}%`, height: "100%", background: color, borderRadius: 99 }} />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {h.missing.map((m) => (
                        <span key={m} style={{ background: chipBg, color, fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "2px 7px" }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
}
