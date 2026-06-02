const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, deleteDoc } = require('firebase/firestore');
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

    const testId = 'test_leaves_doc';
    console.log('Writing test document to /leaves...');
    await setDoc(doc(db, 'leaves', testId), {
      id: testId,
      status: 'pending',
      createdBy: 'test_user',
      createdAt: Date.now()
    });
    console.log('Write to /leaves SUCCESSFUL!');

    console.log('Deleting test document from /leaves...');
    await deleteDoc(doc(db, 'leaves', testId));
    console.log('Delete SUCCESSFUL!');
  } catch (err) {
    console.error('Operation FAILED:', err);
  }
}

run();
