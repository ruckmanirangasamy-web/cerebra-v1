import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useMission } from "../lib/MissionContext";
import {
  LayoutDashboard,
  Calendar,
  Database,
  PenTool,
  X,
  Menu,
  Target,
  BookOpen,
  History,
  BarChart3,
  MoreHorizontal
} from "lucide-react";
import { cn } from "../lib/utils";
import { CommandDock } from "./CommandDock";
import { ManageStrip } from "./ManageStrip";
import { RadialOrb } from "./orb/RadialOrb";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/analyse", label: "Analyse", icon: BarChart3 },
  { path: "/mission", label: "Mission", icon: Target },
  { path: "/schedule", label: "Schedule", icon: Calendar },
  { path: "/learn", label: "Learn", icon: BookOpen },
  { path: "/vault", label: "The Vault", icon: Database },
  { path: "/workspace", label: "Workspace", icon: PenTool },
];

const MOBILE_NAV = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/schedule", label: "Schedule", icon: Calendar },
  { path: "/learn", label: "Learn", icon: BookOpen },
  { path: "/more", label: "More", icon: MoreHorizontal },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { setStep } = useMission();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);



  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg)] flex-col lg:flex-row">
      {/* Mobile Header (Hidden as per Phase 6) */}
      <header className="hidden items-center justify-between p-4 bg-white border-b border-gray-200 z-40">
        <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-display text-sm">
            S
          </div>
          ScholarSync
        </h1>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white flex flex-col z-50 transition-transform duration-300 transform lg:relative lg:translate-x-0 border-r border-gray-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-display">
                S
              </div>
              ScholarSync
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wider">V2.0 OS</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-100 flex justify-center">
          <CommandDock isMobile={false} />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  setIsSidebarOpen(false);
                  if (item.path === '/mission') setStep(1);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">Student</span>
              <span className="text-xs text-gray-500">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-0 md:p-8 pb-24 lg:pb-8">
          <div className="h-full max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-200 px-2 flex justify-between items-center z-[60] pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (item.path === '/mission') setStep(1);
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full relative",
                isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              {isActive && (
                <motion.div layoutId="activeTabMobile" className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-b-full" />
              )}
            </Link>
          );
        })}

        <div className="flex-shrink-0 px-2 flex items-center justify-center">
          <CommandDock isMobile={true} />
        </div>

        {MOBILE_NAV.slice(2, 4).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (item.path === '/mission') setStep(1);
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full relative",
                isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              {isActive && (
                <motion.div layoutId="activeTabMobile" className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>



      {/* Radial Orb */}
      <RadialOrb />
    </div>
  );
}
