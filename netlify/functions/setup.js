const fs = require('fs');
const path = require('path');

const firebaseCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;
const googleCredentials = process.env.GOOGLE_CLOUD_CREDENTIALS;

// Path to store the credentials files
const credentialsDir = path.join(__dirname, 'temp');

if (!fs.existsSync(credentialsDir)) {
  fs.mkdirSync(credentialsDir);
}

// Write the Firebase credentials
if (firebaseCredentials) {
  const firebaseFilePath = path.join(credentialsDir, 'firebase-credentials.json');
  fs.writeFileSync(firebaseFilePath, firebaseCredentials);
  console.log('Firebase credentials file created successfully at', firebaseFilePath);
} else {
  console.error('FIREBASE_ADMIN_CREDENTIALS not set. Skipping credential file creation.');
}

// Write the Google Cloud credentials (if needed)
if (googleCredentials) {
  const googleFilePath = path.join(credentialsDir, 'google-credentials.json');
  fs.writeFileSync(googleFilePath, googleCredentials);
  console.log('Google Cloud credentials file created successfully at', googleFilePath);
} else {
  console.warn('GOOGLE_CLOUD_CREDENTIALS not set. Skipping credential file creation.');
}
