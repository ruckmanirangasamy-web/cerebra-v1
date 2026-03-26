import { db, auth } from '../lib/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    orderBy,
    where,
    limit,
    startAfter,
    serverTimestamp,
    Timestamp,
    DocumentSnapshot,
} from 'firebase/firestore';

const uid = () => auth.currentUser?.uid ?? 'guest';

// ── Types ──────────────────────────────────────────────────────────
export interface StudySession {
    id: string;
    missionId: string;
    subject: string;
    topic: string;
    sessionType: 'learn' | 'flashcard' | 'mcq' | 'oral';
    startedAt: Timestamp | null;
    endedAt: Timestamp | null;
    durationSeconds: number;
    status: 'active' | 'completed' | 'paused' | 'abandoned';
    scorePercentage: number;
    weakTopics: string[];
    moodRating: string | null;
    notes: string[];
}

export interface StreakData {
    currentStreak: number;
    bestStreak: number;
    lastSessionDate: string;
    studyDays: string[];
}

export interface FrequencyEntry {
    topicName: string;
    questionCount: number;
    sourceYears: number[];
}

export interface ProphecyTopic {
    topicName: string;
    probabilityScore: number;
    priorityLevel: 'critical' | 'high' | 'wildcard';
    frequencyScore: number;
    recencyScore: number;
    weaknessScore: number;
}

export interface HorizonAssessment {
    verdict: 'on_track' | 'at_risk' | 'critical';
    headline: string;
    detail: string;
    generatedAt: Timestamp | null;
}

// ── Peer quotes (static library) ──────────────────────────────────
const PEER_QUOTES = [
    '"Students who scored 80%+ averaged 3.2 focused sessions per week in the final 14 days."',
    '"Top performers reviewed weak topics 2.5x more often than strong ones in the last 2 weeks."',
    '"Consistent daily study of 1.5 hours outperformed cramming 6 hours the night before."',
    '"Students with 14+ day streaks scored an average of 12% higher on final exams."',
    '"The most effective students tested themselves 3x per topic before they felt ready."',
    '"Spacing study sessions over 5 days led to 40% better retention than a single session."',
    '"Students who used flashcards scored 15% higher than those who only re-read notes."',
    '"Reviewing PYQ patterns gave top scorers a 20% accuracy boost on predicted topics."',
];

export function getRandomPeerQuote(): string {
    return PEER_QUOTES[Math.floor(Math.random() * PEER_QUOTES.length)];
}

// ── Study Sessions ────────────────────────────────────────────────
export async function getStudySessions(
    missionId?: string,
    limitCount = 30,
    afterDoc?: DocumentSnapshot
): Promise<{ sessions: StudySession[]; lastDoc: DocumentSnapshot | null }> {
    const sessionsRef = collection(db, 'users', uid(), 'studySessions');
    let q;
    if (missionId) {
        q = afterDoc
            ? query(sessionsRef, where('missionId', '==', missionId), orderBy('endedAt', 'desc'), startAfter(afterDoc), limit(limitCount))
            : query(sessionsRef, where('missionId', '==', missionId), orderBy('endedAt', 'desc'), limit(limitCount));
    } else {
        q = afterDoc
            ? query(sessionsRef, orderBy('endedAt', 'desc'), startAfter(afterDoc), limit(limitCount))
            : query(sessionsRef, orderBy('endedAt', 'desc'), limit(limitCount));
    }
    const snap = await getDocs(q);
    const sessions = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<StudySession, 'id'>) }));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { sessions, lastDoc };
}

// ── Streak ─────────────────────────────────────────────────────────
export async function getStreakData(): Promise<StreakData> {
    const userId = uid();
    const ref = doc(db, 'users', userId, 'streakData', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        return { currentStreak: 0, bestStreak: 0, lastSessionDate: '', studyDays: [] };
    }
    return snap.data() as StreakData;
}

export async function updateStreakData(data: Partial<StreakData>): Promise<void> {
    const userId = uid();
    const ref = doc(db, 'users', userId, 'streakData', userId);
    await setDoc(ref, data, { merge: true });
}

// ── Frequency Matrix ──────────────────────────────────────────────
export async function getFrequencyMatrix(missionId: string): Promise<FrequencyEntry[]> {
    const ref = collection(db, 'users', uid(), 'missions', missionId, 'frequencyMatrix');
    const q = query(ref, orderBy('questionCount', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FrequencyEntry);
}

// ── Horizon Assessment ────────────────────────────────────────────
export async function getHorizonAssessment(missionId: string): Promise<HorizonAssessment | null> {
    const ref = doc(db, 'users', uid(), 'horizonAssessments', missionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as HorizonAssessment;
}

export async function saveHorizonAssessment(missionId: string, assessment: Omit<HorizonAssessment, 'generatedAt'>): Promise<void> {
    const ref = doc(db, 'users', uid(), 'horizonAssessments', missionId);
    await setDoc(ref, { ...assessment, generatedAt: serverTimestamp() });
}

// ── Prophecy (topic probabilities) ────────────────────────────────
export async function getProphecyData(missionId: string): Promise<ProphecyTopic[]> {
    const ref = collection(db, 'users', uid(), 'missions', missionId, 'frequencyMatrix');
    const snap = await getDocs(ref);
    if (snap.empty) return [];

    // Compute prophecy locally since we don't have Cloud Functions yet
    const totalQ = snap.docs.reduce((s, d) => s + (d.data().questionCount || 0), 0);

    return snap.docs.map(d => {
        const data = d.data() as FrequencyEntry;
        const frequencyScore = totalQ > 0 ? data.questionCount / totalQ : 0;
        const recencyScore = computeRecencyScore(data.sourceYears || []);
        const weaknessScore = 0.5; // default until we have session data per topic
        const prob = Math.min(0.99,
            (frequencyScore * 0.50) + (recencyScore * 0.25) + (1.0 * 0.15) + (weaknessScore * 0.10)
        );
        const priorityLevel: 'critical' | 'high' | 'wildcard' = prob >= 0.75 ? 'critical' : prob >= 0.50 ? 'high' : 'wildcard';
        return {
            topicName: data.topicName,
            probabilityScore: prob,
            priorityLevel,
            frequencyScore,
            recencyScore,
            weaknessScore,
        };
    }).filter(t => t.probabilityScore >= 0.25)
        .sort((a, b) => b.probabilityScore - a.probabilityScore);
}

function computeRecencyScore(years: number[]): number {
    if (!years || years.length === 0) return 0.3;
    const currentYear = new Date().getFullYear();
    const recentYears = years.filter(y => currentYear - y <= 3);
    if (recentYears.length > 0) return Math.min(1, 0.5 + recentYears.length * 0.25);
    return 0.3;
}

// ── Milestones ────────────────────────────────────────────────────
export interface Milestone {
    id: string;
    streakDays: number;
    achievedAt: Timestamp | null;
    toastShown: boolean;
}

export async function getUnshownMilestones(): Promise<Milestone[]> {
    const ref = collection(db, 'users', uid(), 'milestones');
    const q = query(ref, where('toastShown', '==', false));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Milestone, 'id'>) }));
}

export async function markMilestoneShown(milestoneId: string): Promise<void> {
    const ref = doc(db, 'users', uid(), 'milestones', milestoneId);
    await updateDoc(ref, { toastShown: true });
}

// ── Mastery Score Calculator ──────────────────────────────────────
export function computeMasteryScore(
    sessions: StudySession[],
    allTopics: string[],
    topicWeights?: Record<string, number>
): number {
    if (allTopics.length === 0) return 0;
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const topicScores: Record<string, { total: number; weight: number }> = {};
    sessions.forEach(s => {
        if (!['flashcard', 'mcq', 'oral'].includes(s.sessionType)) return;
        const endedMs = s.endedAt ? s.endedAt.toMillis() : 0;
        const recencyWeight = (now - endedMs) < sevenDaysMs ? 2.0 : 1.0;
        if (!topicScores[s.topic]) topicScores[s.topic] = { total: 0, weight: 0 };
        topicScores[s.topic].total += s.scorePercentage * recencyWeight;
        topicScores[s.topic].weight += recencyWeight;
    });

    let totalWeightedScore = 0;
    let totalTopicWeight = 0;
    allTopics.forEach(topic => {
        const tw = topicWeights?.[topic] || 1.0;
        const scoreData = topicScores[topic];
        const score = scoreData ? scoreData.total / scoreData.weight : 0;
        totalWeightedScore += score * tw;
        totalTopicWeight += tw;
    });

    return totalTopicWeight > 0 ? Math.min(99, Math.round(totalWeightedScore / totalTopicWeight)) : 0;
}

// ── Horizon fallback verdict ──────────────────────────────────────
export function computeFallbackVerdict(masteryPercent: number): HorizonAssessment {
    if (masteryPercent >= 75) {
        return {
            verdict: 'on_track',
            headline: 'You are on track. Maintain your current study pace.',
            detail: `Current mastery at ${masteryPercent}% — continue reviewing weak topics to solidify your preparation.`,
            generatedAt: null,
        };
    } else if (masteryPercent >= 50) {
        return {
            verdict: 'at_risk',
            headline: 'You are at risk. Increase your study intensity.',
            detail: `Current mastery at ${masteryPercent}% — focus on high-priority topics to close the gap before your deadline.`,
            generatedAt: null,
        };
    } else {
        return {
            verdict: 'critical',
            headline: 'Critical — prioritise immediately.',
            detail: `Current mastery at ${masteryPercent}% — switch to focused review of the most probable exam topics.`,
            generatedAt: null,
        };
    }
}
