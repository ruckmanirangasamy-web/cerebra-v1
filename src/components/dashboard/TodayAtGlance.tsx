import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

const NOW_HOUR = new Date().getHours();
const NOW_MIN = new Date().getMinutes();

const SCHEDULE_BLOCKS = [
  {
    subject: "Advanced Mathematics",
    color: "#10D9A0",
    start: 9,
    end: 11,
    status: "done"
  },
  {
    subject: "Computer Science",
    color: "#7C3AED",
    start: 12,
    end: 13,
    status: "done"
  },
  {
    subject: "Physics",
    color: "#E11D48",
    start: 15,
    end: 16.5,
    status: "missed"
  },
  {
    subject: "Chemistry",
    color: "#10D9A0",
    start: 20,
    end: 22,
    status: "upcoming"
  }
];

const WEEK_DATA = [
  {
    day: "Mon",
    date: 17,
    hours: 3.5,
    sessions: 2,
    subjects: ["#10D9A0", "#7C3AED"],
    missed: false
  },
  { day: "Tue", date: 18, hours: 2, sessions: 1, subjects: ["#7C3AED"], missed: false },
  {
    day: "Wed",
    date: 19,
    hours: 4.5,
    sessions: 3,
    subjects: ["#10D9A0", "#D97706", "#7C3AED"],
    missed: false
  },
  {
    day: "Thu",
    date: 20,
    hours: 1.5,
    sessions: 1,
    subjects: ["#10D9A0"],
    missed: true
  },
  {
    day: "Fri",
    date: 21,
    hours: 3,
    sessions: 2,
    subjects: ["#10D9A0", "#E11D48"],
    missed: false
  },
  { day: "Sat", date: 22, hours: 2.5, sessions: 1, subjects: ["#D97706"], missed: false },
  { day: "Sun", date: 23, hours: 0, sessions: 0, subjects: [], missed: false, today: true }
];

const MONTH_DATA = Array.from({ length: 31 }, (_, i) => ({
  date: i + 1,
  studied: [1, 2, 3, 5, 6, 7, 8, 10, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22].includes(i + 1),
  subjects: i % 3 === 0 ? ["#10D9A0"] : i % 3 === 1 ? ["#7C3AED", "#10D9A0"] : ["#D97706"],
  exam: i + 1 === 23 || i + 1 === 30,
  missed: [4, 9, 11, 16].includes(i + 1),
  today: i + 1 === 23,
  streak: [17, 18, 19, 20, 21, 22, 23].includes(i + 1)
}));

// Day View
function DayView() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const PX_PER_HOUR = 52;
  const totalH = 24 * PX_PER_HOUR;
  const nowY = (NOW_HOUR + NOW_MIN / 60) * PX_PER_HOUR;

  useEffect(() => {
    if (timelineRef.current) {
      const scrollTo = Math.max(0, nowY - 80);
      timelineRef.current.scrollTop = scrollTo;
    }
  }, [nowY]);

  const getBlockStyle = (block: typeof SCHEDULE_BLOCKS[0]) => {
    const top = block.start * PX_PER_HOUR;
    const height = (block.end - block.start) * PX_PER_HOUR - 3;
    return { top, height };
  };

  const freeWindows: { start: number; end: number }[] = [];
  const sorted = [...SCHEDULE_BLOCKS].sort((a, b) => a.start - b.start);
  let prev = 7;
  sorted.forEach((b) => {
    if (b.start - prev >= 1) freeWindows.push({ start: prev, end: b.start });
    prev = b.end;
  });
  if (24 - prev >= 1) freeWindows.push({ start: prev, end: 24 });

  return (
    <div
      ref={timelineRef}
      className="h-[280px] overflow-y-auto relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg"
    >
      <div className="sticky top-0 h-6 bg-gradient-to-b from-gray-900 to-transparent z-10 pointer-events-none" />
      <div className="relative" style={{ height: totalH, marginTop: -24 }}>
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start gap-0"
            style={{ top: h * PX_PER_HOUR }}
          >
            <div className="w-11 pr-2 text-right flex-shrink-0">
              <span className="text-[8px] font-mono text-white/25">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
            <div className="flex-1 h-px bg-white/6 mt-1.5" />
          </div>
        ))}

        {/* Free windows */}
        {freeWindows.map(
          (fw, i) =>
            fw.start >= 7 && (
              <div
                key={i}
                className="absolute left-[52px] right-2 rounded-lg bg-white/3 border border-white/6 flex items-center px-3"
                style={{
                  top: fw.start * PX_PER_HOUR,
                  height: (fw.end - fw.start) * PX_PER_HOUR - 3
                }}
              >
                <span className="text-[8px] font-mono text-white/20">
                  {fw.end - fw.start}h free window
                </span>
              </div>
            )
        )}

        {/* Blocks */}
        {SCHEDULE_BLOCKS.map((block, i) => {
          const { top, height } = getBlockStyle(block);
          return (
            <div
              key={i}
              className={cn(
                "absolute left-[52px] right-2 rounded-lg overflow-hidden flex flex-col justify-center px-3 py-1.5",
                block.status === "done" &&
                  "bg-opacity-40 border border-opacity-40",
                block.status === "missed" &&
                  "bg-red-500/10 border border-red-500/30",
                block.status === "upcoming" &&
                  "border border-dashed animate-breathe"
              )}
              style={{
                top,
                height,
                backgroundColor:
                  block.status === "done"
                    ? `${block.color}55`
                    : block.status === "upcoming"
                    ? `${block.color}18`
                    : undefined,
                borderColor:
                  block.status === "done"
                    ? `${block.color}44`
                    : block.status === "upcoming"
                    ? `${block.color}55`
                    : undefined
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] text-white/90 leading-tight">
                  {block.subject}
                </span>
                {block.status === "done" && (
                  <span className="text-emerald-400 text-[10px]">✓</span>
                )}
                {block.status === "missed" && (
                  <span className="text-red-400 text-[10px]">✕</span>
                )}
              </div>
              <span className="text-[8px] font-mono text-white/35 mt-0.5">
                {block.start}:00 –{" "}
                {block.end % 1 === 0
                  ? `${block.end}:00`
                  : `${Math.floor(block.end)}:30`}
              </span>
            </div>
          );
        })}

        {/* NOW line */}
        {NOW_HOUR >= 6 && (
          <div
            className="absolute left-0 right-0 z-20 flex items-center"
            style={{ top: nowY }}
          >
            <div className="w-11 flex justify-end pr-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow animate-now-pulse" />
            </div>
            <div className="flex-1 h-[1.5px] bg-emerald-500 shadow-glow" />
            <span className="text-[8px] font-mono text-emerald-500 bg-gray-900 px-1 rounded">
              {String(NOW_HOUR).padStart(2, "0")}:{String(NOW_MIN).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 h-6 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none -mt-6" />
    </div>
  );
}

// Week View
function WeekView() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const maxHours = Math.max(...WEEK_DATA.map((d) => d.hours), 1);

  return (
    <div className="px-1">
      <div className="flex gap-1 items-end h-[180px]">
        {WEEK_DATA.map((d, i) => {
          const barH = d.hours > 0 ? Math.max((d.hours / maxHours) * 120, 12) : 0;
          const isToday = d.today;
          const isExp = expanded === i;

          return (
            <div
              key={i}
              onClick={() => setExpanded(isExp ? null : i)}
              className={cn(
                "flex-1 flex flex-col items-center cursor-pointer transition-opacity",
                isToday || isExp ? "opacity-100" : "opacity-75"
              )}
            >
              {d.missed && (
                <div className="w-1 h-1 rounded-full bg-red-500 mb-1 animate-now-pulse" />
              )}
              {!d.missed && <div className="w-1 h-1 mb-1" />}

              <div className="w-full relative h-[120px] flex items-end">
                {d.hours > 0 ? (
                  <div
                    className={cn(
                      "w-full rounded-t-md border overflow-hidden relative animate-bar-grow-y",
                      isToday
                        ? "bg-gradient-to-t from-emerald-500 to-emerald-400/60 border-emerald-400/40 shadow-lg shadow-emerald-500/20"
                        : "bg-gradient-to-t from-white/20 to-white/5 border-white/10"
                    )}
                    style={{
                      height: barH,
                      animationDelay: `${i * 0.06}s`
                    }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 flex h-1">
                      {d.subjects.map((sc, si) => (
                        <div
                          key={si}
                          className="flex-1 opacity-80"
                          style={{ backgroundColor: sc }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-1.5 rounded border border-dashed border-white/10 bg-white/5" />
                )}
              </div>

              {d.hours > 0 && (
                <span
                  className={cn(
                    "text-[8px] font-mono mt-1",
                    isToday ? "text-emerald-500" : "text-white/40"
                  )}
                >
                  {d.hours}h
                </span>
              )}

              <span
                className={cn(
                  "text-[9px] font-mono mt-0.5",
                  isToday ? "text-white font-medium" : "text-white/40 font-light"
                )}
              >
                {d.day}
              </span>

              {isToday && <div className="w-4 h-0.5 rounded bg-emerald-500 mt-0.5" />}
              {!isToday && <div className="w-4 h-0.5 mt-0.5" />}

              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
                  isToday ? "bg-white" : "bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "text-[9px] font-mono",
                    isToday ? "text-gray-900" : "text-white/30"
                  )}
                >
                  {d.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {expanded !== null && (
        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-white/60">
              {WEEK_DATA[expanded].day} {WEEK_DATA[expanded].date} March
            </span>
            <div className="flex gap-2">
              <span className="text-[9px] font-mono text-emerald-500">
                {WEEK_DATA[expanded].sessions} sessions
              </span>
              <span className="text-[9px] font-mono text-white/30">·</span>
              <span className="text-[9px] font-mono text-white/50">
                {WEEK_DATA[expanded].hours}h total
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {WEEK_DATA[expanded].subjects.length > 0 ? (
              WEEK_DATA[expanded].subjects.map((sc, si) => {
                const name =
                  sc === "#10D9A0"
                    ? "Math"
                    : sc === "#7C3AED"
                    ? "Computer Science"
                    : sc === "#D97706"
                    ? "Chemistry"
                    : "Physics";
                return (
                  <div
                    key={si}
                    className="px-2.5 py-1 rounded-full border text-[9px] font-mono"
                    style={{
                      backgroundColor: `${sc}22`,
                      borderColor: `${sc}33`,
                      color: sc
                    }}
                  >
                    {name}
                  </div>
                );
              })
            ) : (
              <span className="text-[9px] font-mono text-white/25">No sessions</span>
            )}
            {WEEK_DATA[expanded].missed && (
              <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-mono">
                Missed block
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-0 mt-3 pt-3 border-t border-white/10">
        {[
          { label: "Total hours", val: `${WEEK_DATA.reduce((a, b) => a + b.hours, 0)}h` },
          { label: "Sessions", val: WEEK_DATA.reduce((a, b) => a + b.sessions, 0) },
          { label: "Missed", val: WEEK_DATA.filter((d) => d.missed).length }
        ].map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 text-center",
              i < 2 ? "border-r border-white/10" : ""
            )}
          >
            <div className="font-serif text-lg text-white leading-none">{s.val}</div>
            <span className="text-[8px] font-mono text-white/30 mt-1 block">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Month View
function MonthView() {
  const [hovered, setHovered] = useState<number | null>(null);
  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  const startOffset = 1;

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center">
            <span className="text-[8px] font-mono text-white/25">{d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`o${i}`} className="h-9" />
        ))}

        {MONTH_DATA.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "h-9 rounded-lg relative cursor-pointer border transition-all flex flex-col items-center justify-center gap-0.5",
              d.today && "bg-white/12 border-white/20",
              d.studied && !d.today && "bg-emerald-500/10 border-transparent",
              d.missed && !d.today && "bg-red-500/10 border-transparent",
              !d.studied && !d.missed && !d.today && "border-transparent",
              d.exam && "border-red-500/40",
              hovered === i && "scale-110"
            )}
          >
            <div
              className={cn(
                "w-[18px] h-[18px] rounded-full flex items-center justify-center",
                d.today ? "bg-white" : "bg-transparent"
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-mono",
                  d.today
                    ? "text-gray-900"
                    : d.studied
                    ? "text-white/70"
                    : "text-white/25"
                )}
              >
                {d.date}
              </span>
            </div>

            {d.studied && (
              <div className="flex gap-px">
                {d.subjects.slice(0, 3).map((sc, si) => (
                  <div
                    key={si}
                    className="w-[3px] h-[3px] rounded-full"
                    style={{ backgroundColor: sc }}
                  />
                ))}
              </div>
            )}

            {d.exam && (
              <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-red-500 shadow-glow" />
            )}

            {d.streak && (
              <div
                className="absolute bottom-0.5 left-[10%] right-[10%] h-[1.5px] rounded"
                style={{ backgroundColor: "#10D9A066" }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-3.5 flex-wrap text-xs">
        {[
          { color: "#10D9A0", label: "Studied", dashed: false },
          { color: "#E11D48", label: "Missed", dashed: false },
          { color: "rgba(255,255,255,0.5)", label: "Exam", dashed: false },
          { color: "#10D9A0", label: "Streak", dashed: true }
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {l.dashed ? (
              <div
                className="w-3 h-[1.5px] rounded"
                style={{ backgroundColor: l.color }}
              />
            ) : (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: l.color }}
              />
            )}
            <span className="text-[8px] font-mono text-white/35">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Component
export function TodayAtGlance({ visible }: { visible: boolean }) {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <div
      className={cn(
        "mt-6 transition-all duration-400",
        visible ? "animate-float-up opacity-100" : "opacity-0"
      )}
    >
      <div className="flex items-center gap-3 px-5 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-serif italic text-gray-400">today at a glance</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider block mb-1">
                Today at a Glance
              </span>
              <span className="text-[22px] font-serif italic text-white">{dateStr}</span>
            </div>

            {/* View toggle */}
            <div className="flex gap-1 bg-white/10 rounded-full p-0.5">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-mono tracking-wide transition-all",
                    view === v
                      ? "bg-white text-gray-900"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-0">
            {[
              { label: "Done today", val: "2 sessions" },
              { label: "Hours logged", val: "5.5h" },
              { label: "Next block", val: "20:00" }
            ].map((s, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 text-center px-3",
                  i < 2 ? "border-r border-white/10" : ""
                )}
              >
                <div className="font-serif text-[15px] text-white leading-tight">
                  {s.val}
                </div>
                <span className="text-[8px] font-mono text-white/28 mt-0.5 block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-5">
          {view === "day" && <DayView />}
          {view === "week" && <WeekView />}
          {view === "month" && <MonthView />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-now-pulse" />
            <span className="text-[9px] font-mono text-white/35">
              Free window: 20:00–22:00 · 2h available
            </span>
          </div>
          <button className="text-[9px] font-mono text-emerald-500 hover:text-emerald-400 transition-colors">
            Full schedule →
          </button>
        </div>
      </div>
    </div>
  );
}
