import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Mock config, we just need to hit the server to get the index error
const firebaseConfig = {
  apiKey: "dummy",
  authDomain: "dummy.firebaseapp.com",
  projectId: "memree-df404", // Using the project id from previous files or guessing it
  storageBucket: "dummy.appspot.com",
  messagingSenderId: "123",
  appId: "123"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testIndex() {
  const refs = [
    { name: 'calendarBlocks', q: query(collection(db, 'users/test/calendarBlocks'), where('missionId', '==', '123'), orderBy('startTime', 'asc')) },
    { name: 'tasks', q: query(collection(db, 'users/test/tasks'), where('missionId', '==', '123'), orderBy('createdAt', 'desc')) },
    { name: 'studySessions', q: query(collection(db, 'users/test/studySessions'), where('missionId', '==', '123'), orderBy('startedAt', 'desc')) },
    { name: 'studySessions2', q: query(collection(db, 'users/test/studySessions'), where('missionId', '==', '123'), orderBy('endedAt', 'desc')) },
    { name: 'vaultItems', q: query(collection(db, 'users/test/vaults/123/items'), where('type', '==', 'document'), orderBy('lastEditedAt', 'desc')) },
    { name: 'oracleConversations', q: query(collection(db, 'users/test/oracleConversations'), where('missionId', '==', '123'), orderBy('updatedAt', 'desc')) }
  ];

  for (const {name, q} of refs) {
    try {
      await getDocs(q);
      console.log(`Query ${name} success`);
    } catch (e) {
      if (e.message.includes('requires an index')) {
        console.log(`\n\nMissing index for ${name}:`);
        console.log(e.message);
      } else {
        console.log(`\n\nError for ${name} (might need index):`, e.message);
      }
    }
  }
}

testIndex().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
