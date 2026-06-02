const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf8'));

const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function run() {
  try {
    const orderId = '31ABTFVCB';
    console.log(`Fetching order ${orderId}...`);
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      console.log('Order not found!');
      return;
    }
    const orderData = orderDoc.data();
    console.log('Order Data:', JSON.stringify(orderData, null, 2));

    const allAttachments = [
      ...(orderData.staffImages || []),
      ...(orderData.staffPdfs || []),
      ...(orderData.designAttachments || [])
    ];
    console.log('All attachments in order:', allAttachments);

    for (const att of allAttachments) {
      if (att.startsWith('FIRESTORE_ATTACHMENT:')) {
        const key = att.split(':').pop();
        console.log(`Checking attachment document for key: ${key}...`);
        const attDoc = await getDoc(doc(db, 'attachments', key));
        if (attDoc.exists()) {
          console.log(`Attachment ${key} EXISTS. Data length:`, attDoc.data().data?.length);
        } else {
          console.log(`Attachment ${key} DOES NOT EXIST in Firestore!`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
