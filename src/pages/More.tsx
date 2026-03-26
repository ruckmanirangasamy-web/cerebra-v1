import React from "react";
import { Link } from "react-router-dom";
import { Target, Database, Settings, PenTool, ExternalLink, ChevronRight, User } from "lucide-react";

export default function More() {
  const MENU_ITEMS = [
    {
      group: "Operations",
      items: [
        { path: "/mission", label: "Missions", icon: Target, desc: "Active & completed learning missions", color: "text-emerald-500", bg: "bg-emerald-50" },
        { path: "/vault", label: "The Vault", icon: Database, desc: "All your raw knowledge and documents", color: "text-indigo-500", bg: "bg-indigo-50" },
        { path: "/workspace", label: "Workspace", icon: PenTool, desc: "Whiteboard & connected thoughts", color: "text-amber-500", bg: "bg-amber-50" },
      ]
    },
    {
      group: "System",
      items: [
        { path: "/analyse", label: "Analytics", icon: User, desc: "Performance & cognitive load", color: "text-blue-500", bg: "bg-blue-50" },
        { path: "#", label: "Settings", icon: Settings, desc: "Preferences & LLM keys", color: "text-gray-500", bg: "bg-gray-50" },
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col p-4 md:p-8 space-y-6">
      <header className="flex flex-col space-y-2 shrink-0 pt-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 font-display">More</h1>
        <p className="text-sm text-gray-500">Access all operations and settings.</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-8 pb-32">
        {/* User Card */}
        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl font-bold font-display shadow-inner backdrop-blur-sm">S</div>
            <div className="text-center">
                <h2 className="text-lg font-bold font-display tracking-tight">Student Pro</h2>
                <div className="text-xs text-white/80 mt-1 uppercase tracking-widest font-bold">V2.0 OS Active</div>
            </div>
        </div>

        {/* Menu Groups */}
        <div className="space-y-6">
          {MENU_ITEMS.map((group) => (
            <div key={group.group} className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase ml-2">{group.group}</h3>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {group.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-4 p-4 transition-colors hover:bg-gray-50 ${idx !== group.items.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm">{item.label}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
