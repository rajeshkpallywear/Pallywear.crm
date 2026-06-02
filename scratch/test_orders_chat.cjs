const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, updateDoc, getDoc, deleteDoc } = require('firebase/firestore');
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

    const docId = 'chat_c_test_123';
    console.log(`Writing system chat doc to /orders/${docId}...`);
    await setDoc(doc(db, 'orders', docId), {
      id: docId,
      status: 'design',
      createdBy: result.user.uid,
      createdAt: Date.now(),
      isSystemChat: true,
      participants: [result.user.uid, 'another_user'],
      acceptedParticipants: [result.user.uid]
    });
    console.log('Write SUCCESSFUL!');

    console.log('Reading document back...');
    const snap = await getDoc(doc(db, 'orders', docId));
    if (snap.exists()) {
      console.log('Read data:', JSON.stringify(snap.data(), null, 2));
    } else {
      console.log('Document not found!');
    }

    console.log('Updating document...');
    await updateDoc(doc(db, 'orders', docId), {
      acceptedParticipants: [result.user.uid, 'another_user'],
      lastMessage: 'Hello world'
    });
    console.log('Update SUCCESSFUL!');

    console.log('Deleting document...');
    await deleteDoc(doc(db, 'orders', docId));
    console.log('Delete SUCCESSFUL!');
  } catch (err) {
    console.error('Operation FAILED:', err);
  }
}

run();
