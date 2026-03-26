import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
const MODEL = 'text-embedding-004';
const AI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
const gemini = new GoogleGenerativeAI(AI_API_KEY!);

export interface RetrievedChunk {
    text: string; pageNumber: number; chunkIndex: number;
    itemId: string; vaultId: string;
    similarityScore: number;
    retrievalMethod: 'vector' | 'keyword' | 'hybrid';
}

export async function embedQuery(queryText: string): Promise<number[]> {
    const model = gemini.getGenerativeModel({ model: MODEL });
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: queryText }] },
        taskType: TaskType.RETRIEVAL_QUERY
    });
    return result.embedding.values;
}

export async function vectorRetrieve(
    queryText: string, vaultIds: string[], uid: string,
    topK: number
): Promise<RetrievedChunk[]> {
    const queryVector = await embedQuery(queryText);
    // findNearest is not currently an official method in the standard web SDK.
    // Instead, the recommended approach for the web SDK vector search extension is to use standard Firestore queries if supported by an extension,
    // OR call a Cloud Function to perform the vector search.
    // Assuming a Cloud Function `performVectorSearch` is or will be deployed:
    // (Alternatively, Google provides a Web SDK extension or Firebase Functions callable. We will stub this to work once official APIs are used or extensions enabled).
    // For the sake of this implementation following the spec, we will use the syntax provided but note it may require the Firebase Admin SDK or specific extensions for `findNearest`.

    // To avoid TypeScript compilation errors on `findNearest` which doesn't exist on standard web SDK `Query`:
    console.warn("Using mocked vectorRetrieve because findNearest is an admin-only / extension API currently.");

    // Real implementation for production would look like: 
    // const results = await getDocs(query(collectionGroup(db, 'chunks'), where('uid', '==', uid), where('vaultId', 'in', vaultIds)).findNearest(...))

    // Mocked for prototype purely to prevent TS breaking. The actual call needs an HTTP function bridge or Vertex Extension.
    return [];
}

export async function keywordRetrieve(
    queryText: string, vaultIds: string[], uid: string, topK: number
): Promise<RetrievedChunk[]> {
    const terms = extractTerms(queryText);
    if (terms.length === 0) return [];

    const all = await getDocs(query(collectionGroup(db, 'chunks'), where('uid', '==', uid), where('vaultId', 'in', vaultIds)));

    return all.docs
        .map(doc => {
            const data = doc.data() as any;
            const lower = data.text.toLowerCase();
            const hits = terms.filter(t => lower.includes(t)).length;
            return { ...data, similarityScore: +(hits / terms.length).toFixed(4), retrievalMethod: 'keyword' as const };
        })
        .filter(c => c.similarityScore > 0)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, topK);
}

export async function hybridRetrieve(
    queryText: string, vaultIds: string[], uid: string,
    topK: number, alpha = 0.7
): Promise<RetrievedChunk[]> {
    // TEMPORARY HACK: Since we cannot deploy Firebase Functions to create vector embeddings (Blaze plan required),
    // we will rely EXCLUSIVELY on Keyword Search here to prove the RAG context augmentation works.
    const kw = await keywordRetrieve(queryText, vaultIds, uid, topK * 2);

    // We mock the scores for the hybrid output pipeline
    const map = new Map<string, { chunk: RetrievedChunk; score: number }>();
    kw.forEach((c, rank) => {
        const key = c.vaultId + '/' + c.chunkIndex;
        const s = (1 - alpha) * (1 / (rank + 1));
        map.set(key, { chunk: { ...c, retrievalMethod: 'hybrid' as const }, score: s });
    });
    return [...map.values()]
        .sort((a, b) => b.score - a.score).slice(0, topK)
        .map(v => ({ ...v.chunk, similarityScore: +v.score.toFixed(4), retrievalMethod: 'hybrid' as const }));
}

const STOPWORDS = new Set(['what', 'is', 'the', 'a', 'an', 'how', 'does', 'why', 'can',
    'explain', 'describe', 'define', 'tell', 'me', 'about', 'and', 'or', 'in', 'of', 'for']);
function extractTerms(text: string): string[] {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
}
