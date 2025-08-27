const admin = require('firebase-admin');

// This is the core logic from your original Cloud Function
async function setRole(email, isManager, callerUid) {
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData.isManager) {
    return {
      success: false,
      message: 'Permission denied. Only managers can set user roles.'
    };
  }

  const userRecord = await admin.auth().getUserByEmail(email);
  const userId = userRecord.uid;

  await admin.auth().setCustomUserClaims(userId, { isManager: isManager });
  const userDocRef = admin.firestore().collection('users').doc(userId);
  await userDocRef.set({ isManager }, { merge: true });

  return {
    success: true,
    message: `${email} is now a manager: ${isManager}`
  };
}

// The Netlify Function handler
exports.handler = async (event, context) => {
  // Use CORS headers to prevent cross-origin errors
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
  
  // Check for POST request and Authorization header
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

    // Call the core logic
    const result = await setRole(email, isManager, callerUid);

    if (!result.success) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: result.message }),
        headers
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ result: result.message }),
      headers
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers
    };
  }
};
