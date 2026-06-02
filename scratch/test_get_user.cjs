const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf8'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function run() {
  try {
    console.log('Signing in...');
    const result = await signInWithEmailAndPassword(auth, 'stalingm.mano@gmail.com', 'pallywear12');
    console.log('Signed in. UID:', result.user.uid);

    console.log('Fetching user document...');
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (userDoc.exists()) {
      console.log('User Document in Firestore:', JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log('User document DOES NOT EXIST in Firestore!');
    }
  } catch (err) {
    console.error('Operation FAILED:', err);
  }
}

run();
