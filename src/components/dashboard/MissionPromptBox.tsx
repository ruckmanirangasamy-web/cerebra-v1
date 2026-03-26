import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMission, MissionType, Difficulty, SourceLock, CognitiveMode, Baseline } from "../../lib/MissionContext";
import { useNavigate } from "react-router-dom";
import {
    Sparkles,
    ArrowUpRight,
    ChevronDown,
    GraduationCap,
    FileText,
    FolderKanban,
    Upload,
    Crosshair,
    BookOpen,
    Rocket,
    Settings2,
} from "lucide-react";

function getPretext(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! What's the mission today?";
    if (hour < 17) return "Afternoon grind. Let's lock in a mission.";
    return "Evening session — what do you want to conquer?";
}

const missionTypes: { value: MissionType; label: string; icon: React.ReactNode }[] = [
    { value: "exam", label: "Exam", icon: <GraduationCap className="w-4 h-4" /> },
    { value: "assignment", label: "Assignment", icon: <FileText className="w-4 h-4" /> },
    { value: "project", label: "Project", icon: <FolderKanban className="w-4 h-4" /> },
];

const baselines: { value: Baseline; label: string }[] = [
    { value: "novice", label: "Novice" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
];

export default function MissionPromptBox() {
    const [expanded, setExpanded] = useState(false);
    const { missionData, updateMissionData, initializeMission } = useMission();
    const navigate = useNavigate();

    const handleStartMission = () => {
        initializeMission();
        navigate("/mission");
    };

    return (
        <motion.div
            layout
            className="rounded-3xl p-6 relative overflow-hidden border border-emerald-200/50"
            style={{
                background: "linear-gradient(135deg, #10D9A0 0%, #7C3AED 100%)",
            }}
        >
            {/* Breathing glow */}
            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-3xl"
                style={{ boxShadow: "0 0 60px rgba(16,217,160,0.3)" }}
            />

            <div className="relative z-10">
                {/* Collapsed */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Mission Control</p>
                            <p className="text-white text-sm font-semibold">{getPretext()}</p>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                    >
                        {expanded ? (
                            <ChevronDown className="w-5 h-5 text-white" />
                        ) : (
                            <ArrowUpRight className="w-5 h-5 text-white" />
                        )}
                    </motion.div>
                </div>

                {/* Expanded Form */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-6 space-y-5">
                                {/* 1. Mission Type */}
                                <div>
                                    <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                        Mission Type
                                    </label>
                                    <div className="flex gap-2">
                                        {missionTypes.map((t) => (
                                            <button
                                                key={t.value}
                                                onClick={() => updateMissionData({ missionType: t.value })}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${missionData.missionType === t.value
                                                        ? "bg-white text-gray-900 shadow-lg"
                                                        : "bg-white/15 text-white hover:bg-white/25"
                                                    }`}
                                            >
                                                {t.icon}
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Baseline Level */}
                                <div>
                                    <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                        Intelligence Baseline
                                    </label>
                                    <div className="flex gap-2">
                                        {baselines.map((b) => (
                                            <button
                                                key={b.value}
                                                onClick={() => updateMissionData({ baseline: b.value })}
                                                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${missionData.baseline === b.value
                                                        ? "bg-white text-gray-900 shadow-lg"
                                                        : "bg-white/15 text-white hover:bg-white/25"
                                                    }`}
                                            >
                                                {b.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Source Lock + Cognitive Mode */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                            Source Lock
                                        </label>
                                        <div className="flex gap-2">
                                            {(["strict", "general"] as SourceLock[]).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateMissionData({ sourceLock: s })}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${missionData.sourceLock === s
                                                            ? "bg-white text-gray-900 shadow-lg"
                                                            : "bg-white/15 text-white hover:bg-white/25"
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                            Cognitive Mode
                                        </label>
                                        <div className="flex gap-2">
                                            {(["sniper", "scholar"] as CognitiveMode[]).map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => updateMissionData({ cognitiveMode: c })}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 capitalize ${missionData.cognitiveMode === c
                                                            ? "bg-white text-gray-900 shadow-lg"
                                                            : "bg-white/15 text-white hover:bg-white/25"
                                                        }`}
                                                >
                                                    {c === "sniper" ? <Crosshair className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Deadline + Difficulty */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                            Deadline
                                        </label>
                                        <input
                                            type="date"
                                            value={missionData.deadline}
                                            onChange={(e) => updateMissionData({ deadline: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/15 text-white border border-white/20 text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                            Difficulty
                                        </label>
                                        <div className="flex gap-2">
                                            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                                                <button
                                                    key={d}
                                                    onClick={() => updateMissionData({ difficulty: d })}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${missionData.difficulty === d
                                                            ? "bg-white text-gray-900 shadow-lg"
                                                            : "bg-white/15 text-white hover:bg-white/25"
                                                        }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 5. PYQ Intel Check */}
                                <div>
                                    <label className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">
                                        PYQ Intel
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => updateMissionData({ hasPYQs: !missionData.hasPYQs })}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${missionData.hasPYQs
                                                    ? "bg-white text-gray-900 shadow-lg"
                                                    : "bg-white/15 text-white hover:bg-white/25"
                                                }`}
                                        >
                                            {missionData.hasPYQs ? "✓ PYQs Available" : "No PYQs"}
                                        </button>
                                        {missionData.hasPYQs && (
                                            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-white text-sm font-semibold cursor-pointer hover:bg-white/25 transition-all">
                                                <Upload className="w-4 h-4" />
                                                Upload
                                                <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.png,.jpg" />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Mission Summary */}
                                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">Mission Summary</p>
                                    <p className="text-white text-sm leading-relaxed">
                                        <span className="capitalize font-semibold">{missionData.missionType}</span> mission •{" "}
                                        <span className="capitalize">{missionData.difficulty}</span> difficulty •{" "}
                                        <span className="capitalize">{missionData.baseline}</span> baseline •{" "}
                                        <span className="capitalize">{missionData.cognitiveMode}</span> mode •{" "}
                                        Due {missionData.deadline}
                                    </p>
                                </div>

                                {/* CTAs */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleStartMission}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-gray-900 font-bold text-sm shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
                                    >
                                        <Rocket className="w-4 h-4" />
                                        Start Mission
                                    </button>
                                    <button
                                        onClick={() => { navigate("/mission"); }}
                                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/15 text-white font-bold text-sm hover:bg-white/25 transition-all"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                        Full Planner
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
