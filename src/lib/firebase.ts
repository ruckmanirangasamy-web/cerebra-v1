import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDhr0tDxmWsthKP2SZxn5WGmIbfjkGoV3k",
    authDomain: "cerebra-17706.firebaseapp.com",
    projectId: "cerebra-17706",
    storageBucket: "cerebra-17706.firebasestorage.app",
    messagingSenderId: "629206247433",
    appId: "1:629206247433:web:d2580d3143dd7aced730d8",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
