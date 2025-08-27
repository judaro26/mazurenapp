const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK by reading credentials from a file
if (!admin.apps.length) {
  try {
    // Path to the credential file created by setup.js
    const credentialsPath = path.join(__dirname, 'temp', 'firebase-credentials.json');
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK. Ensure the credentials file exists and is valid.', e);
    // Return an error to the client if initialization fails.
    exports.handler = async (event, context) => {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error. Firebase Admin SDK failed to initialize.' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    };
    // Throw to stop the build process if this is a build-time error
    throw new Error('Firebase Admin SDK initialization failed.');
  }
}

// The Netlify Function handler
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }
  
  if (event.httpMethod !== 'POST' || !event.headers.authorization) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed or missing Authorization header' }),
      headers
    };
  }

  try {
    const idToken = event.headers.authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    const { email, isManager } = JSON.parse(event.body);

    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || !callerData.isManager) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Permission denied. Only managers can set user roles.' }),
        headers
      };
    }
    
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    await admin.auth().setCustomUserClaims(userId, { isManager: isManager });

    const userDocRef = admin.firestore().collection('users').doc(userId);
    await userDocRef.set({ isManager }, { merge: true });

    return {
      statusCode: 200,
      body: JSON.stringify({ result: `${email} is now a manager: ${isManager}` }),
      headers
    };
  } catch (error) {
    console.error('Function execution error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }),
      headers
    };
  }
};
