const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf8'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function run() {
  try {
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, 'stalingm.mano@gmail.com', 'pallywear12');
    console.log('Signed in.');

    console.log('Fetching all users from Firestore...');
    const snap = await getDocs(collection(db, 'users'));
    console.log(`Found ${snap.size} users:`);
    snap.forEach(doc => {
      console.log(JSON.stringify(doc.data()));
    });
  } catch (err) {
    console.error('Operation FAILED:', err);
  }
}

run();
