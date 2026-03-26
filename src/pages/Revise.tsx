import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  History, 
  Zap, 
  BrainCircuit, 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  Play,
  RotateCcw,
  Trophy
} from "lucide-react";
import { cn } from "../lib/utils";

const SAMPLE_CARDS = [
  {
    id: 1,
    question: "What is the Einstein photoelectric equation?",
    answer: "hf = Φ + ½mv² max, where hf is photon energy, Φ is work function, and ½mv² max is max kinetic energy of emitted electrons.",
    subject: "Physics",
    difficulty: "Hard"
  },
  {
    id: 2,
    question: "Define the Heisenberg Uncertainty Principle.",
    answer: "It is impossible to simultaneously determine the exact position and momentum of a particle with absolute precision.",
    subject: "Physics",
    difficulty: "Medium"
  },
  {
    id: 3,
    question: "What is the derivative of ln(x)?",
    answer: "1/x",
    subject: "Math",
    difficulty: "Easy"
  },
  {
    id: 4,
    question: "What is the role of ATP in cellular respiration?",
    answer: "ATP acts as the primary energy currency of the cell, storing and transporting chemical energy for metabolism.",
    subject: "Biology",
    difficulty: "Medium"
  }
];

export default function Revise() {
  const [activeMode, setActiveMode] = useState<"flashcards" | "active" | "spaced">("flashcards");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [showActiveRecallResult, setShowActiveRecallResult] = useState(false);

  const currentCard = SAMPLE_CARDS[currentCardIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setShowActiveRecallResult(false);
    setUserAnswer("");
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % SAMPLE_CARDS.length);
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleActiveRecallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowActiveRecallResult(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 font-display">Revise Hub</h1>
          <p className="text-gray-500 mt-1">Spaced repetition. Active recall. Mastery tracking.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start">
          <button 
            onClick={() => setActiveMode("flashcards")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeMode === "flashcards" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Flashcards
          </button>
          <button 
            onClick={() => setActiveMode("active")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeMode === "active" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Active Recall
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Revision Interface */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              AI-Generated Card • {currentCard.subject}
            </div>
            <div className="absolute top-6 right-6 text-xs font-mono font-bold text-gray-400">
              {currentCardIndex + 1} / {SAMPLE_CARDS.length}
            </div>

            {activeMode === "flashcards" ? (
              <div className="w-full max-w-md perspective-1000">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentCardIndex + (isFlipped ? "-back" : "-front")}
                    initial={{ rotateY: isFlipped ? -180 : 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: isFlipped ? 180 : -180, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    onClick={handleFlip}
                    className={cn(
                      "w-full aspect-[4/3] rounded-3xl shadow-2xl flex items-center justify-center p-8 text-center cursor-pointer group relative overflow-hidden",
                      isFlipped 
                        ? "bg-white border-2 border-indigo-100 text-gray-900" 
                        : "bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="space-y-4">
                      <h3 className={cn(
                        "text-xl md:text-2xl font-bold font-display leading-tight",
                        isFlipped ? "text-gray-900" : "text-white"
                      )}>
                        {isFlipped ? currentCard.answer : currentCard.question}
                      </h3>
                      {isFlipped && (
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">Answer</p>
                      )}
                    </div>

                    <div className={cn(
                      "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-medium",
                      isFlipped ? "text-gray-400" : "text-white/60"
                    )}>
                      <RotateCcw className="w-4 h-4" />
                      Click to flip
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900 font-display">
                    {currentCard.question}
                  </h3>
                  <p className="text-sm text-gray-500">Type your answer below to test your recall.</p>
                </div>

                <form onSubmit={handleActiveRecallSubmit} className="space-y-4">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Your answer..."
                    className="w-full h-32 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-sm"
                    disabled={showActiveRecallResult}
                  />
                  {!showActiveRecallResult && (
                    <button 
                      type="submit"
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                    >
                      Check Answer
                    </button>
                  )}
                </form>

                <AnimatePresence>
                  {showActiveRecallResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Correct Answer</span>
                        <Zap className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {currentCard.answer}
                      </p>
                      <div className="pt-4 flex items-center gap-3">
                        <button 
                          onClick={handleNext}
                          className="flex-1 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-all"
                        >
                          I was wrong
                        </button>
                        <button 
                          onClick={handleNext}
                          className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all"
                        >
                          I got it right
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex items-center gap-4 mt-12">
              <button 
                onClick={handleNext}
                className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm group"
                title="Again"
              >
                <AlertCircle className="w-6 h-6" />
              </button>
              <button 
                onClick={handleNext}
                className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                title="Hard"
              >
                <History className="w-6 h-6" />
              </button>
              <button 
                onClick={handleNext}
                className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                title="Easy"
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Revision Stats & Mastery */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Mastery Stats
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">1,240</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cards Mastered</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-gray-500">
                  <span>Physics Mastery</span>
                  <span>82%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full w-[82%]"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-gray-500">
                  <span>Math Mastery</span>
                  <span>64%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full w-[64%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Spaced Repetition Alert</h3>
            <p className="text-xs text-indigo-100 leading-relaxed mb-6">
              "It's been 3 days since you reviewed 'Organic Chemistry'. Your retention is predicted to drop by 15% if you don't review now."
            </p>
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <Play className="w-3 h-3" />
              Start Review Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
