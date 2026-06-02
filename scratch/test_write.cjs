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
    await signInWithEmailAndPassword(auth, 'stalingm.mano@gmail.com', 'pallywear12');
    console.log('Signed in.');

    console.log('Writing test document to /attachments...');
    await setDoc(doc(db, 'attachments', 'test_write_doc'), {
      id: 'test_write_doc',
      data: 'test_base64_data',
      name: 'test.png',
      createdAt: Date.now()
    });
    console.log('Write SUCCESSFUL!');
  } catch (err) {
    console.error('Write FAILED:', err);
  }
}

run();
