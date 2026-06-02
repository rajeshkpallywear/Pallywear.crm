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

    const testChatId = 'test_chat_id';
    console.log('Writing test document to /pallywear_adv_chats...');
    await setDoc(doc(db, 'pallywear_adv_chats', testChatId), {
      id: testChatId,
      type: 'direct',
      name: 'Test Chat',
      participants: ['system_user'],
      acceptedParticipants: ['system_user'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log('Write to /pallywear_adv_chats SUCCESSFUL!');

  } catch (err) {
    console.error('Write FAILED:', err);
  }
}

run();
