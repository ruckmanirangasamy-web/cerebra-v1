import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { useMission } from "../lib/MissionContext";
import { useAuth } from "../lib/AuthContext";
import {
  Calendar, BookOpen, History, Clock, ArrowRight,
  Zap, Target, Brain, CheckCircle2, AlertTriangle,
  TrendingUp, Flame, BarChart2, ChevronRight, Plus,
  Sparkles, Activity,
} from "lucide-react";
import { subscribeMissions, subscribeTasks, createTask, updateTask } from "../services/scheduleService";
import type { ActiveMission, KanbanTask } from "../services/scheduleTypes";
import { getStreakData } from "../services/analyseService";

import MissionPromptBox from "../components/dashboard/MissionPromptBox";

// ── tiny sparkline ─────────────────────────────────────────────
const Spark = ({ data, color, w = 60, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) => {
  const mn = Math.min(...data), mx = Math.max(...data);
  const nx = (v: number) => ((v - mn) / (mx - mn + 0.01));
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - nx(v) * h}`).join(" ");
  const id = `sp${color.replace(/[^a-z0-9]/gi, "")}${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${h} L${data.map((v, i) => `${(i / (data.length - 1)) * w},${h - nx(v) * h}`).join(" L")} L${w},${h} Z`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - nx(data[data.length - 1]) * h} r="2.5" fill={color} />
    </svg>
  );
};

// ── arc gauge ──────────────────────────────────────────────────
const Arc = ({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) => {
  const r = 15, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke={`${color}22`} strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ}
        style={{ strokeDashoffset: circ * (1 - pct / 100), transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s ease" }} />
      <text x="20" y="24" textAnchor="middle" fill={color} style={{ fontFamily: "monospace", fontSize: 8 }}>{pct}%</text>
    </svg>
  );
};

// ── animated number ───────────────────────────────────────────
const AnimNum = ({ to, suffix = "" }: { to: number; suffix?: string }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let st: number | null = null;
    const run = (ts: number) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / 900, 1), e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(e * to));
      if (p < 1) requestAnimationFrame(run);
    };
    const t = setTimeout(() => requestAnimationFrame(run), 200);
    return () => clearTimeout(t);
  }, [to]);
  return <span>{v}{suffix}</span>;
};

// ── analytics data (filled from Firestore dynamically) ─────────
const ANALYTICS_META = [
  { key: "consistency", label: "Session Consistency", suffix: "%", color: "#10D9A0", icon: <Activity size={14} />, spark: [60, 72, 65, 80, 78, 85, 87], trend: "+12%", up: true, insight: "Best on Tuesday windows" },
  { key: "streak",      label: "Study Streak",        suffix: "d", color: "#D97706", icon: <Flame size={14} />,  spark: [4, 5, 6, 7, 8, 9, 10, 11], trend: "+3d",  up: true, insight: "11-day streak — keep going 🔥" },
  { key: "pyq",         label: "PYQ Snipe Coverage",  suffix: "%", color: "#7C3AED", icon: <Target size={14} />, spark: [20, 35, 42, 50, 55, 59, 63], trend: "+8%",  up: true, insight: "Cardiac topics strongly covered" },
  { key: "recall",      label: "Active Recall Ratio", suffix: "%", color: "#E11D48", icon: <Brain size={14} />,  spark: [18, 22, 28, 30, 35, 38, 42], trend: "+7%",  up: true, insight: "Up from 18% last week" },
];

// ── helper: days until ─────────────────────────────────────────
function daysUntil(date: any): number {
  const d = date?.toDate ? date.toDate() : new Date(date);
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

// ── Today at a Glance ──────────────────────────────────────────
const EMERALD = "#10D9A0";
const PURPLE  = "#7C3AED";
const AMBER   = "#D97706";
const ROSE    = "#E11D48";

const SCHEDULE_BLOCKS = [
  { subject: "Pharmacology", color: EMERALD, start: 9,    end: 11,   status: "done" },
  { subject: "Anatomy",      color: PURPLE,  start: 12,   end: 13,   status: "done" },
  { subject: "Physiology",   color: ROSE,    start: 15,   end: 16.5, status: "missed" },
  { subject: "Pharmacology", color: EMERALD, start: 20,   end: 22,   status: "upcoming" },
];

const WEEK_DATA = [
  { day: "Mon", date: 17, hours: 3.5, sessions: 2, subjects: [EMERALD, PURPLE],         missed: false },
  { day: "Tue", date: 18, hours: 2,   sessions: 1, subjects: [PURPLE],                  missed: false },
  { day: "Wed", date: 19, hours: 4.5, sessions: 3, subjects: [EMERALD, AMBER, PURPLE],  missed: false },
  { day: "Thu", date: 20, hours: 1.5, sessions: 1, subjects: [EMERALD],                 missed: true  },
  { day: "Fri", date: 21, hours: 3,   sessions: 2, subjects: [EMERALD, ROSE],           missed: false },
  { day: "Sat", date: 22, hours: 2.5, sessions: 1, subjects: [AMBER],                   missed: false },
  { day: "Sun", date: 23, hours: 0,   sessions: 0, subjects: [],                        missed: false, today: true },
];

const MONTH_DATA = Array.from({ length: 31 }, (_, i) => ({
  date: i + 1,
  studied: [1,2,3,5,6,7,8,10,12,13,14,15,17,18,19,20,21,22].includes(i + 1),
  subjects: i % 3 === 0 ? [EMERALD] : i % 3 === 1 ? [PURPLE, EMERALD] : [AMBER],
  exam: i + 1 === 23 || i + 1 === 30,
  missed: [4, 9, 11, 16].includes(i + 1),
  today: i + 1 === 23,
  streak: [17,18,19,20,21,22,23].includes(i + 1),
}));

const DayView = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const NOW_HOUR = new Date().getHours();
  const NOW_MIN  = new Date().getMinutes();
  const PX_PER_HOUR = 52;
  const nowY = (NOW_HOUR + NOW_MIN / 60) * PX_PER_HOUR;

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = Math.max(0, nowY - 80);
    }
  }, []);

  const blockStyle = (b: typeof SCHEDULE_BLOCKS[0]): CSSProperties => {
    const top = b.start * PX_PER_HOUR;
    const height = (b.end - b.start) * PX_PER_HOUR - 3;
    const base: CSSProperties = {
      position: "absolute", left: 52, right: 8, top, height,
      borderRadius: 8, overflow: "hidden",
      display: "flex", flexDirection: "column", justifyContent: "center", padding: "6px 10px",
    };
    if (b.status === "done")     return { ...base, background: `${b.color}55`, border: `1px solid ${b.color}44` };
    if (b.status === "missed")   return { ...base, background: `repeating-linear-gradient(135deg,${ROSE}18 0,${ROSE}18 4px,transparent 4px,transparent 10px)`, border: `1px solid ${ROSE}44` };
    if (b.status === "upcoming") return { ...base, background: `${b.color}18`, border: `1px dashed ${b.color}55` };
    return base;
  };

  const sorted = [...SCHEDULE_BLOCKS].sort((a, b) => a.start - b.start);
  const freeWindows: { start: number; end: number }[] = [];
  let prev = 7;
  sorted.forEach(b => { if (b.start - prev >= 1) freeWindows.push({ start: prev, end: b.start }); prev = b.end; });
  if (24 - prev >= 1) freeWindows.push({ start: prev, end: 24 });

  return (
    <div ref={timelineRef} style={{ height: 280, overflowY: "auto", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: 24, background: "linear-gradient(to bottom,#0f172a,transparent)", zIndex: 10, pointerEvents: "none" }} />
      <div style={{ position: "relative", height: 24 * PX_PER_HOUR, marginTop: -24 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ position: "absolute", top: h * PX_PER_HOUR, left: 0, right: 0, display: "flex", alignItems: "flex-start" }}>
            <div style={{ width: 44, paddingRight: 8, textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{String(h).padStart(2, "0")}:00</span>
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)", marginTop: 5 }} />
          </div>
        ))}

        {freeWindows.map((fw, i) => fw.start >= 7 && (
          <div key={i} style={{ position: "absolute", left: 52, right: 8, top: fw.start * PX_PER_HOUR, height: (fw.end - fw.start) * PX_PER_HOUR - 3, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 10px" }}>
            <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{fw.end - fw.start}h free window</span>
          </div>
        ))}

        {SCHEDULE_BLOCKS.map((b, i) => (
          <div key={i} style={blockStyle(b)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 11, color: b.status === "done" ? "rgba(255,255,255,0.9)" : b.status === "missed" ? ROSE : "rgba(255,255,255,0.8)" }}>{b.subject}</span>
              {b.status === "done"   && <span style={{ color: EMERALD, fontSize: 10 }}>✓</span>}
              {b.status === "missed" && <span style={{ color: ROSE,    fontSize: 10 }}>✕</span>}
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{b.start}:00 – {b.end % 1 === 0 ? `${b.end}:00` : `${Math.floor(b.end)}:30`}</span>
          </div>
        ))}

        {NOW_HOUR >= 6 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: nowY, zIndex: 20, display: "flex", alignItems: "center" }}>
            <div style={{ width: 44, display: "flex", justifyContent: "flex-end", paddingRight: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: EMERALD, boxShadow: `0 0 8px ${EMERALD}` }} />
            </div>
            <div style={{ flex: 1, height: 1.5, background: EMERALD }} />
            <span style={{ fontFamily: "monospace", fontSize: 8, color: EMERALD, padding: "0 4px", background: "#0f172a", borderRadius: 4 }}>{String(NOW_HOUR).padStart(2, "0")}:{String(NOW_MIN).padStart(2, "0")}</span>
          </div>
        )}
      </div>
      <div style={{ position: "sticky", bottom: 0, height: 24, background: "linear-gradient(to top,#0f172a,transparent)", pointerEvents: "none", marginTop: -24 }} />
    </div>
  );
};

const WeekView = () => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const maxHours = Math.max(...WEEK_DATA.map(d => d.hours), 1);

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 180 }}>
        {WEEK_DATA.map((d, i) => {
          const barH = d.hours > 0 ? Math.max((d.hours / maxHours) * 120, 12) : 0;
          const isToday = !!d.today;
          const isExp   = expanded === i;
          return (
            <div key={i} onClick={() => setExpanded(isExp ? null : i)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", opacity: isToday || isExp ? 1 : 0.75 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: d.missed ? ROSE : "transparent", marginBottom: 4 }} />
              <div style={{ width: "100%", position: "relative", height: 120, display: "flex", alignItems: "flex-end" }}>
                {d.hours > 0 ? (
                  <div style={{ width: "100%", height: barH, borderRadius: "6px 6px 3px 3px", background: isToday ? `linear-gradient(to top,${EMERALD},${EMERALD}88)` : "linear-gradient(to top,rgba(255,255,255,0.18),rgba(255,255,255,0.06))", border: isToday ? `1px solid ${EMERALD}44` : "1px solid rgba(255,255,255,0.08)", boxShadow: isToday ? `0 0 16px ${EMERALD}33` : "none", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", height: 4 }}>
                      {d.subjects.map((sc, si) => <div key={si} style={{ flex: 1, background: sc, opacity: 0.8 }} />)}
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.1)" }} />
                )}
              </div>
              {d.hours > 0 && <span style={{ fontFamily: "monospace", fontSize: 8, color: isToday ? EMERALD : "rgba(255,255,255,0.4)", marginTop: 4 }}>{d.hours}h</span>}
              <span style={{ fontFamily: "monospace", fontSize: 9, color: isToday ? "#fff" : "rgba(255,255,255,0.4)", marginTop: 2, fontWeight: isToday ? 500 : 300 }}>{d.day}</span>
              <div style={{ width: 16, height: 2, borderRadius: 1, background: isToday ? EMERALD : "transparent", marginTop: 3 }} />
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: isToday ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: isToday ? "#0f172a" : "rgba(255,255,255,0.3)" }}>{d.date}</span>
              </div>
            </div>
          );
        })}
      </div>

      {expanded !== null && (
        <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{WEEK_DATA[expanded].day} {WEEK_DATA[expanded].date} March</span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: EMERALD }}>{WEEK_DATA[expanded].sessions} sessions · {WEEK_DATA[expanded].hours}h</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {WEEK_DATA[expanded].subjects.length > 0
              ? WEEK_DATA[expanded].subjects.map((sc, si) => {
                  const name = sc === EMERALD ? "Pharmacology" : sc === PURPLE ? "Anatomy" : sc === AMBER ? "Biochemistry" : "Physiology";
                  return <div key={si} style={{ padding: "4px 10px", borderRadius: 20, background: `${sc}22`, border: `1px solid ${sc}33`, fontFamily: "monospace", fontSize: 9, color: sc }}>{name}</div>;
                })
              : <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.25)" }}>No sessions this day</span>
            }
          </div>
        </div>
      )}

      <div style={{ display: "flex", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {[
          { label: "Total hours", val: `${WEEK_DATA.reduce((a, b) => a + b.hours, 0)}h` },
          { label: "Sessions",    val: WEEK_DATA.reduce((a, b) => a + b.sessions, 0) },
          { label: "Missed",      val: WEEK_DATA.filter(d => d.missed).length },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: "#fff", lineHeight: 1 }}>{s.val}</div>
            <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 3, display: "block" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthView = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  const DAYS = ["M","T","W","T","F","S","S"];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: "center" }}><span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{d}</span></div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        <div style={{ height: 36 }} /> {/* March offset */}
        {MONTH_DATA.map((d, i) => (
          <div key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ height: 36, borderRadius: 8, position: "relative", background: d.today ? "rgba(255,255,255,0.12)" : d.studied ? "rgba(16,217,160,0.08)" : d.missed ? "rgba(225,29,72,0.07)" : "transparent", border: d.exam ? `1px solid ${ROSE}44` : d.today ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, transition: "all .15s", transform: hovered === i ? "scale(1.08)" : "scale(1)" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: d.today ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: 9, color: d.today ? "#0f172a" : d.studied ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>{d.date}</span>
            </div>
            {d.studied && (
              <div style={{ display: "flex", gap: 1 }}>
                {d.subjects.slice(0, 3).map((sc, si) => <div key={si} style={{ width: 3, height: 3, borderRadius: "50%", background: sc }} />)}
              </div>
            )}
            {d.exam   && <div style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, borderRadius: "50%", background: ROSE, boxShadow: `0 0 4px ${ROSE}` }} />}
            {d.streak && <div style={{ position: "absolute", bottom: 2, left: "10%", right: "10%", height: 1.5, borderRadius: 1, background: `${EMERALD}66` }} />}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        {[
          { color: EMERALD, label: "Studied" },
          { color: ROSE,    label: "Missed"  },
          { color: ROSE,    label: "Exam", dot: true },
          { color: EMERALD, label: "Streak", line: true },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {l.line ? <div style={{ width: 12, height: 1.5, background: l.color, borderRadius: 1 }} /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.color }} />}
            <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.35)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

type GlanceView = "day" | "week" | "month";
const TodayAtAGlance = () => {
  const [view, setView] = useState<GlanceView>("week");
  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const quickStats = [
    { label: "Done today",   val: "2 sessions" },
    { label: "Hours logged", val: "5.5h"        },
    { label: "Next block",   val: "20:00"       },
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono">Today at a Glance</h2>
      </div>

      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.35)", display: "block", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>Today at a Glance</span>
              <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#fff", fontStyle: "italic" }}>{dateStr}</span>
            </div>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 3 }}>
              {(["day","week","month"] as GlanceView[]).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "4px 10px", borderRadius: 16, border: "none", background: view === v ? "#fff" : "transparent", fontFamily: "monospace", fontSize: 9, letterSpacing: ".3px", color: view === v ? "#0f172a" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all .2s" }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick stat row */}
          <div style={{ display: "flex" }}>
            {quickStats.map((s, i) => (
              <div key={i} style={{ flex: 1, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "0 12px", textAlign: "center" }}>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 15, color: "#fff", lineHeight: 1.1 }}>{s.val}</div>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.28)", marginTop: 2, display: "block" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* View content */}
        <div style={{ padding: "16px 16px 20px" }}>
          {view === "day"   && <DayView />}
          {view === "week"  && <WeekView />}
          {view === "month" && <MonthView />}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: EMERALD }} className="animate-pulse" />
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>Free window: 20:00–22:00 · 2h available</span>
          </div>
          <Link to="/schedule" style={{ fontFamily: "monospace", fontSize: 9, color: EMERALD, background: "none", border: "none", letterSpacing: ".3px", textDecoration: "none" }}>Full schedule →</Link>
        </div>
      </div>
    </section>
  );
};

export default function Dashboard() {
  const { setStep } = useMission();
  const { user } = useAuth();
  const [missions, setMissions] = useState<ActiveMission[]>([]);
  const [tasks, setTasks]       = useState<KanbanTask[]>([]);
  const [loading, setLoading]   = useState(true);
  const [analyticsVals, setAnalyticsVals] = useState({ consistency: 87, streak: 11, pyq: 63, recall: 42 });
  const [missionsFilter, setMissionsFilter] = useState<'active' | 'all'>('active');
  const [missionsSort, setMissionsSort] = useState<'date' | 'mastery'>('date');

  useEffect(() => {
    const unsubM = subscribeMissions(data => { setMissions(data); setLoading(false); });
    const unsubT = subscribeTasks(data => setTasks(data));
    // Load real streak from Firestore
    getStreakData().then(s => {
      setAnalyticsVals(v => ({ ...v, streak: s.currentStreak }));
    }).catch(() => {});
    return () => { unsubM(); unsubT(); };
  }, []);

  // Derive analytics from Firestore data
  useEffect(() => {
    if (missions.length === 0 && tasks.length === 0) return;
    const doneTasks  = tasks.filter(t => t.status === "Completed").length;
    const totalTasks = tasks.length;
    const recall     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 42;
    const pyq        = missions.length > 0 ? Math.round(missions.reduce((a, m) => a + m.masteryPercent, 0) / missions.length) : 63;
    setAnalyticsVals(v => ({ ...v, recall, pyq }));
  }, [missions, tasks]);

  const displayedMissions = [...missions]
    .filter(m => missionsFilter === 'all' || m.status === 'active')
    .sort((a, b) => {
      if (missionsSort === 'date') return daysUntil(a.examDate) - daysUntil(b.examDate);
      if (missionsSort === 'mastery') return b.masteryPercent - a.masteryPercent;
      return 0;
    });

  const urgentTasks = tasks.filter(t => (t.status === "In Progress" || t.priority === "high" || t.priority === "critical") && t.status !== "Completed");
  const avgMastery  = missions.length > 0
    ? Math.round(missions.reduce((a, m) => a + m.masteryPercent, 0) / missions.length) : 0;
  const today       = new Date();
  const dateStr     = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hour        = today.getHours();
  const greeting    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.displayName?.split(" ")[0] || "Scholar";

  // --- Task Actions ---
  const handleQuickCreateTask = async () => {
    const title = window.prompt("Task Title (Urgent/Today):");
    if (!title) return;
    const subject = window.prompt("Subject:") || "General";
    
    await createTask({
      title,
      subject,
      topic: "Unassigned",
      missionId: null,
      priority: 'high',
      status: 'Unstarted',
      dueDate: null,
      estimatedDuration: 60,
      actualDuration: 0,
      kanbanOrder: Date.now(),
      completedAt: null,
      linkedCalendarBlockId: null,
      sourceReference: null,
      subtasks: [],
      linkedPYQIds: [],
      mode: 'scholar',
      subjectColour: '#ef4444',
      createdFrom: 'quickTodo',
      customProperties: {},
      dependencies: [],
      timelogs: [],
      labelIds: [],
      assigneeIds: [],
      attachmentCount: 0,
      linkCount: 0,
      parentTaskId: null
    });
  };

  const handleToggleTask = async (taskId: string) => {
    await updateTask(taskId, { status: "Completed", completedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Hero greeting ──────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#10D9A0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">{dateStr}</p>
          <h1 className="text-2xl font-bold text-white mb-1 font-display">
            {greeting}, {displayName}.
          </h1>
          {loading ? (
            <p className="text-slate-400 text-sm">Loading your mission data…</p>
          ) : missions.length > 0 ? (
            <p className="text-slate-300 text-sm leading-relaxed">
              {daysUntil(displayedMissions[0]?.examDate)} days to{" "}
              <span className="text-[#10D9A0] font-semibold">{displayedMissions[0]?.subject}</span>.{" "}
              {urgentTasks.length > 0
                ? `${urgentTasks.length} urgent task${urgentTasks.length > 1 ? "s" : ""} need your attention.`
                : "All tasks on track — excellent discipline."}
            </p>
          ) : (
            <p className="text-slate-400 text-sm">Ready to start a new mission? Create one from the Mission page.</p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <Link to="/learn">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10D9A0] text-slate-900 text-sm font-bold shadow-lg shadow-[#10D9A0]/20">
                <Sparkles size={14} /> Resume Session
              </motion.button>
            </Link>
            {displayedMissions[0] && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Exam in {daysUntil(displayedMissions[0].examDate)}d
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* ── Mission Prompt Box ─────────────────────────────────── */}
      <MissionPromptBox />

      {/* ── Analytics Cards (4 rich cards) ────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono">Study Intelligence</h2>
          <Link to="/analyse" className="text-xs text-[#10D9A0] font-mono hover:underline flex items-center gap-1">
            View all metrics <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ANALYTICS_META.map((m, i) => {
            const val = analyticsVals[m.key as keyof typeof analyticsVals];
            return (
              <motion.div key={m.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}
                className={`bg-white rounded-2xl p-4 border shadow-sm cursor-default transition-all relative overflow-hidden ${
                  i === 1 ? "bg-slate-900 border-slate-800" : "border-slate-100"
                }`}
              >
                {/* coloured top accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: m.color }} />

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: i === 1 ? "rgba(255,255,255,0.4)" : "#64748b" }}>
                    {m.label}
                  </span>
                  <span style={{ color: m.color }}>{m.icon}</span>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold leading-none" style={{ color: i === 1 ? "#fff" : "#0f172a" }}>
                    <AnimNum to={val} suffix={m.suffix} />
                  </span>
                  {m.key === "streak" && <span className="text-base mb-0.5">🔥</span>}
                </div>

                {/* trend + sparkline */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ background: m.up ? "#10D9A010" : "#E11D4810", color: m.up ? "#10D9A0" : "#E11D48" }}>
                    {m.up ? "↑" : "↓"} {m.trend}
                  </span>
                  <Spark data={m.spark} color={i === 1 ? "#10D9A0" : m.color} w={52} h={22} />
                </div>

                {/* mini insight */}
                <p className="text-[10px] mt-2 leading-tight truncate" style={{ color: i === 1 ? "rgba(255,255,255,0.3)" : "#94a3b8" }}>
                  {m.insight}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Active Missions — compact horizontal cards ──────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono">Missions</h2>
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setMissionsFilter('active')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  missionsFilter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setMissionsFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  missionsFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={missionsSort}
              onChange={(e) => setMissionsSort(e.target.value as 'date' | 'mastery')}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:border-slate-300"
            >
              <option value="date">Sort by Date</option>
              <option value="mastery">Sort by Mastery</option>
            </select>
            
            <Link to="/mission" className="text-xs text-[#10D9A0] font-mono hover:underline flex items-center gap-1 shrink-0">
              <Plus size={12} /> New mission
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : missions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            No missions found.{" "}
            <Link to="/mission" className="text-[#10D9A0] font-semibold hover:underline">Start one →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {displayedMissions.slice(0, 3).map((m, i) => {
              const days = daysUntil(m.examDate);
              const urgency = days < 7 ? "bg-rose-50 border-rose-200" : days < 21 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100";
              return (
                <Link key={m.id} to={`/mission/${m.id}`} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -2 }}
                    className={`rounded-2xl p-4 border shadow-sm transition-all relative overflow-hidden ${urgency}`}
                    style={{ borderLeftWidth: 3, borderLeftColor: m.subjectColour }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">Mission</p>
                        <h3 className="text-sm font-bold text-slate-800 truncate">{m.subject}</h3>
                      </div>
                      <Arc pct={m.masteryPercent} color={m.subjectColour} size={40} />
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-amber-500" />
                        <span className="text-[11px] font-mono text-amber-600 font-semibold">
                          {days}d to exam
                        </span>
                      </div>
                      {m.status === "active" && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#10D9A0]/10 text-[#10D9A0] border border-[#10D9A0]/20">
                          ● Active
                        </span>
                      )}
                    </div>
                    {/* mastery bar */}
                    <div className="mt-3 h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.masteryPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${m.subjectColour}, ${m.subjectColour}88)` }}
                      />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Today at a Glance ─────────────────────────────────── */}
      <TodayAtAGlance />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-2">
            <AlertTriangle size={13} className="text-rose-500" />
            Urgent Tasks
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickCreateTask}
              className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
              title="Add Task"
            >
              <Plus size={14} />
            </button>
            <Link to="/kanban" className="text-xs text-[#10D9A0] font-mono hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {urgentTasks.length === 0 ? (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-3 text-green-700 text-sm">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            All urgent tasks are clear — great discipline!
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 shadow-sm overflow-hidden">
            {urgentTasks.slice(0, 5).map((t, i) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div 
                  onClick={() => handleToggleTask(t.id)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 group-hover:border-[#10D9A0] hover:bg-[#10D9A0]/20 transition-colors shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{t.title}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{t.subject}</p>
                </div>
                {t.priority === "high" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100 shrink-0">
                    HIGH
                  </span>
                )}
                {t.status === "In Progress" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                    TODAY
                  </span>
                )}
              </motion.div>
            ))}
            {urgentTasks.length > 5 && (
              <Link to="/kanban" className="flex items-center justify-center gap-1.5 p-3 text-[11px] text-slate-400 font-mono hover:text-[#10D9A0] transition-colors">
                +{urgentTasks.length - 5} more tasks <ArrowRight size={11} />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ── Action Engine — 3 compact study mode cards ────────── */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Action Engine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              to: "/learn", step: 3,
              icon: <BookOpen size={18} />, iconBg: "bg-violet-100", iconColor: "text-violet-600",
              label: "Study Session", sub: "Scholar · Sniper · Oracle",
              accent: "#7C3AED", tag: "LEARN"
            },
            {
              to: "/schedule", step: 0,
              icon: <Calendar size={18} />, iconBg: "bg-sky-100", iconColor: "text-sky-600",
              label: "Schedule", sub: "Temporal Agent · AI planning",
              accent: "#0ea5e9", tag: "SCHEDULE"
            },
            {
              to: "/revise", step: 0,
              icon: <Zap size={18} />, iconBg: "bg-amber-100", iconColor: "text-amber-600",
              label: "Revise & Quiz", sub: "Spaced repetition · Flashcards",
              accent: "#D97706", tag: "REVISE"
            },
          ].map((item, i) => (
            <Link key={i} to={item.to} onClick={() => setStep(item.step)} className="group">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                whileHover={{ y: -2, boxShadow: "0 12px 32px rgba(0,0,0,0.1)" }}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all relative overflow-hidden h-full"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: item.accent }} />
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{item.label}</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{item.sub}</p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: item.accent, borderColor: `${item.accent}40`, background: `${item.accent}10` }}>
                  {item.tag}
                </span>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Mission overview bar ──────────────────────────────── */}
      {missions.length > 0 && (
        <section>
          <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-10 right-10 w-32 h-32 bg-[#10D9A0]/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <BarChart2 size={15} className="text-[#10D9A0]" />
              <h2 className="text-xs font-mono text-white/60 uppercase tracking-widest">Mission Overview</h2>
              <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-white/30">
                <TrendingUp size={11} className="text-[#10D9A0]" /> Live — Firestore
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10">
              {[
                { label: "Active Missions", val: missions.length, color: "#10D9A0" },
                { label: "Avg. Mastery",    val: `${avgMastery}%`, color: "#7C3AED" },
                { label: "Urgent Tasks",    val: urgentTasks.length, color: urgentTasks.length > 0 ? "#E11D48" : "#10D9A0" },
              ].map((s, i) => (
                <div key={i} className="text-center px-4">
                  <div className="text-2xl font-bold leading-none" style={{ color: s.color, fontFamily: "'DM Serif Display', serif" }}>
                    {typeof s.val === "number" ? <AnimNum to={s.val} /> : s.val}
                  </div>
                  <p className="text-[10px] font-mono text-white/30 mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
