import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Initializing Firebase test with project ID:", firebaseConfig.projectId);
  try {
    const docRef = doc(db, 'test', 'connection');
    console.log("Attempting to read test document...");
    const snap = await getDoc(docRef);
    console.log("Success! Read document snapshot. exists:", snap.exists());
  } catch (err: any) {
    console.error("Connection failed with error:");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
  }
}

run();
