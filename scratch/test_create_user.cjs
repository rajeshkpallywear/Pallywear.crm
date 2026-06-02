const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
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

    console.log('Creating user document in /users...');
    const userDocRef = doc(db, 'users', result.user.uid);
    const newUser = {
      id: result.user.uid,
      email: 'stalingm.mano@gmail.com',
      role: 'admin',
      name: 'Mano',
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, newUser);
    console.log('User document created SUCCESSFUL!');
  } catch (err) {
    console.error('Operation FAILED:', err);
  }
}

run();
