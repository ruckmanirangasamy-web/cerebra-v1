import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";
import { cn } from "../../lib/utils";

const ANALYTICS_DATA = [
  {
    label: "Session Consistency",
    value: 87,
    suffix: "%",
    color: "#10D9A0",
    trend: "+12%",
    up: true,
    spark: [60, 72, 65, 80, 78, 85, 87]
  },
  {
    label: "Study Streak",
    value: 11,
    suffix: "d",
    color: "#D97706",
    trend: "+3d",
    up: true,
    spark: [4, 5, 6, 7, 8, 9, 10, 11],
    fire: true
  },
  {
    label: "Exam Coverage",
    value: 63,
    suffix: "%",
    color: "#7C3AED",
    trend: "+8%",
    up: true,
    spark: [20, 35, 42, 50, 55, 59, 63]
  },
  {
    label: "Active Recall Ratio",
    value: 42,
    suffix: "%",
    color: "#E11D48",
    trend: "+7%",
    up: true,
    spark: [18, 22, 28, 30, 35, 38, 42]
  }
];

export function AnalyticsCards({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "transition-all duration-400",
        visible ? "animate-float-up opacity-100" : "opacity-0"
      )}
      style={{ animationDelay: "0.08s" }}
    >
      <div className="flex items-center gap-3 px-5 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-serif italic text-gray-400">study intelligence</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="px-5">
        {/* Top 2 large cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {ANALYTICS_DATA.slice(0, 2).map((metric, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl p-4 shadow-lg cursor-pointer transition-transform hover:-translate-y-0.5",
                i === 1
                  ? "bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700"
                  : "bg-white border border-gray-100"
              )}
            >
              <span
                className={cn(
                  "text-[8px] font-mono uppercase tracking-wider block mb-2",
                  i === 1 ? "text-white/35" : "text-gray-400"
                )}
              >
                {metric.label}
              </span>

              <div className="flex items-end gap-1 mb-1">
                <span
                  className={cn(
                    "font-serif text-5xl leading-none",
                    i === 1 ? "text-white" : "text-gray-900"
                  )}
                >
                  <AnimatedNumber
                    to={metric.value}
                    suffix={metric.suffix}
                    className={cn(
                      "font-serif text-5xl",
                      i === 1 ? "text-white" : "text-gray-900"
                    )}
                  />
                </span>
                {metric.fire && <span className="text-base mb-1.5">🔥</span>}
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[9px] font-mono px-2 py-0.5 rounded-full",
                    metric.up
                      ? "bg-emerald-500/20 text-emerald-600"
                      : "bg-red-500/20 text-red-600"
                  )}
                >
                  {metric.up ? "↑" : "↓"} {metric.trend}
                </span>
                <Sparkline
                  data={metric.spark}
                  color={i === 1 ? "#10D9A0" : metric.color}
                  width={52}
                  height={24}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom 2 smaller cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {ANALYTICS_DATA.slice(2, 4).map((metric, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3.5 shadow-sm border-t-[3px] cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ borderTopColor: metric.color }}
            >
              <span className="text-[8px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
                {metric.label}
              </span>

              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-[30px] text-gray-900 leading-none">
                  <AnimatedNumber
                    to={metric.value}
                    suffix={metric.suffix}
                    className="font-serif text-[30px] text-gray-900"
                  />
                </span>
                <Sparkline
                  data={metric.spark}
                  color={metric.color}
                  width={44}
                  height={22}
                />
              </div>

              <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-bar-grow"
                  style={{
                    width: `${metric.value}%`,
                    backgroundColor: metric.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* View all button */}
        <button className="w-full py-2.5 rounded-xl bg-transparent border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <span className="text-[10px] font-mono text-gray-500">View all 8 metrics</span>
          <span className="text-emerald-500 text-xs">→</span>
        </button>
      </div>
    </div>
  );
}
