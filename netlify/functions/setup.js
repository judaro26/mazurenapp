const fs = require('fs');
const path = require('path');

const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;

if (credentialsJson) {
  const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
  fs.writeFileSync(credentialsPath, credentialsJson, 'utf-8');
  console.log('Firebase credentials file created successfully.');
} else {
  console.error('FIREBASE_ADMIN_CREDENTIALS environment variable is not set.');
}
