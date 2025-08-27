const fs = require('fs');
const path = require('path');

// The credentials are now available in this script from environment variables
const firebaseCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;
const googleCredentials = process.env.GOOGLE_CLOUD_CREDENTIALS;

const functionsDir = path.join(__dirname, 'functions');
const tempDir = path.join(functionsDir, 'temp');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Write the credentials to a file that your function can access
if (firebaseCredentials) {
  fs.writeFileSync(path.join(tempDir, 'firebase-credentials.json'), firebaseCredentials);
}

if (googleCredentials) {
  fs.writeFileSync(path.join(tempDir, 'google-credentials.json'), googleCredentials);
}
