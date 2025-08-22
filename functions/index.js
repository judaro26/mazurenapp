const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setManagerRole = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated and has the 'manager' role
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!context.auth || !callerData.isManager) {
    throw new new functions.https.HttpsError(
      'permission-denied',
      'Only managers can set user roles.'
    );
  }

  const { email, isManager } = data;
  if (typeof email !== 'string' || typeof isManager !== 'boolean') {
    throw new new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with an email and a boolean for isManager.'
    );
  }

  const userRecord = await admin.auth().getUserByEmail(email);
  const userId = userRecord.uid;

  // Set the custom claim for the user
  await admin.auth().setCustomUserClaims(userId, { isManager: isManager });

  // Update the user document in Firestore to reflect the new role
  const userDocRef = admin.firestore().collection('users').doc(userId);
  await userDocRef.set({ isManager }, { merge: true });

  return { result: `${email} is now a manager: ${isManager}` };
});
