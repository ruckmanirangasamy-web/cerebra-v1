import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDhr0tDxmWsthKP2SZxn5WGmIbfjkGoV3k",
    authDomain: "cerebra-17706.firebaseapp.com",
    projectId: "cerebra-17706",
    storageBucket: "cerebra-17706.firebasestorage.app",
    messagingSenderId: "629206247433",
    appId: "1:629206247433:web:d2580d3143dd7aced730d8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testIndex() {
  await signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  
  const refs = [
    { name: 'calendarBlocks1', q: query(collection(db, `users/${uid}/calendarBlocks`), where('date', '>=', '2025-01-01'), where('date', '<=', '2025-12-31'), orderBy('date', 'asc'), orderBy('startTime', 'asc')) },
    { name: 'calendarBlocks2', q: query(collection(db, `users/${uid}/calendarBlocks`), where('missionId', '==', '123'), orderBy('startTime', 'asc')) },
    { name: 'tasks', q: query(collection(db, `users/${uid}/tasks`), where('missionId', '==', '123'), orderBy('createdAt', 'desc')) },
    { name: 'studySessions1', q: query(collection(db, `users/${uid}/studySessions`), where('missionId', '==', '123'), orderBy('startedAt', 'desc')) },
    { name: 'studySessions2', q: query(collection(db, `users/${uid}/studySessions`), where('missionId', '==', '123'), orderBy('endedAt', 'desc')) },
    { name: 'vaultItems', q: query(collection(db, `users/${uid}/vaults/123/items`), where('type', '==', 'document'), orderBy('lastEditedAt', 'desc')) },
    { name: 'oracleConversations', q: query(collection(db, `users/${uid}/commandDock`), where('persona', '==', 'open_web'), orderBy('updatedAt', 'desc')) }
  ];

  for (const {name, q} of refs) {
    try {
      await getDocs(q);
      console.log(`Query ${name} success`);
    } catch (e) {
      if (e.message.includes('requires an index') || e.message.includes('index')) {
        console.log(`\n\n=== Missing index for ${name} ===`);
        console.log(e.message);
      } else {
        console.log(`\nError for ${name}:`, e.message);
      }
    }
  }
}

testIndex().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
