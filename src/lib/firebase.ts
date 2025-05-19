
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
// Adicione outros serviços do Firebase que você precisar, como getAuth, getStorage

// IMPORTANTE: Substitua estas configurações pelas configurações REAIS do seu projeto Firebase!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Substitua pelo seu apiKey
  authDomain: "YOUR_AUTH_DOMAIN", // Substitua
  projectId: "YOUR_PROJECT_ID", // Substitua
  storageBucket: "YOUR_STORAGE_BUCKET", // Substitua
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Substitua
  appId: "YOUR_APP_ID" // Substitua
};

let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);

export { app, db };
