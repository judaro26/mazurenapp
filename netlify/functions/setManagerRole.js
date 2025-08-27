const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK by reading credentials from a file
if (!admin.apps.length) {
  try {
    const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK. Ensure the credentials file exists and is valid.', e);
    // Exit the function early if initialization fails to prevent further errors.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error.' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
}

// The Netlify Function handler
exports.handler = async (event, context) => {
  // Set CORS headers to allow cross-origin requests from your front-end
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
  
  // Verify it's a POST request with an Authorization header
  if (event.httpMethod !== 'POST' || !event.headers.authorization) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed or missing Authorization header' }),
      headers
    };
  }

  try {
    // 1. Authenticate the request by verifying the user's ID token
    const idToken = event.headers.authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // 2. Parse the request body to get the target email and role status
    const { email, isManager } = JSON.parse(event.body);

    // 3. Verify that the caller (the currently logged-in user) is a manager
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || !callerData.isManager) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Permission denied. Only managers can set user roles.' }),
        headers
      };
    }
    
    // 4. Look up the target user by their email
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    // 5. Set the custom claim for the user in Firebase Authentication
    await admin.auth().setCustomUserClaims(userId, { isManager: isManager });

    // 6. Update the user document in Firestore to reflect the new role
    const userDocRef = admin.firestore().collection('users').doc(userId);
    await userDocRef.set({ isManager }, { merge: true });

    // 7. Return a success response
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
