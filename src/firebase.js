import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDd0ANM_Drgt3MD43nNK853mxRuzyGB-hU",
  authDomain: "flash-motoboy-1aacc.firebaseapp.com",
  projectId: "flash-motoboy-1aacc",
  storageBucket: "flash-motoboy-1aacc.firebasestorage.app",
  messagingSenderId: "697541075151",
  appId: "1:697541075151:web:7f63a6b663d2117d81d7ba",
  measurementId: "G-8Q7EBW1487"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Inicialização com cache (top!)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

const auth = getAuth(app);
const storage = getStorage(app);
const GOOGLE_MAPS_API_KEY = "AIzaSyDReAoRbEsRMgwBz07VfCk5BulzJaZZdBs";

// EXPORT ÚNICO E LIMPO
export { db, auth, storage, messaging, app, GOOGLE_MAPS_API_KEY };