const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const stream = require('stream');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let isFirebaseInitialized = false;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.projectId}.firebaseio.com`,
      });
      isFirebaseInitialized = true;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
    return { statusCode: 500, body: 'Missing Google Cloud credentials.' };
  }

  if (!isFirebaseInitialized) {
    return { statusCode: 500, body: 'Firebase Admin SDK not initialized.' };
  }

  const db = admin.firestore();
  
  const storage = new Storage({
    projectId: 'portalmalaga-470004',
    credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS),
  });
  
  const bucketName = 'portalmalaga2025';
  const bucket = storage.bucket(bucketName);

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    const fields = {};
    const fileData = {};

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filenameInfo) => {
      const fileBuffer = [];
      file.on('data', (data) => {
        fileBuffer.push(data);
      });
      file.on('end', () => {
        fileData.buffer = Buffer.concat(fileBuffer);
        fileData.filename = filenameInfo.filename;
        fileData.mimetype = filenameInfo.mimetype;
      });
      file.on('error', reject);
    });

    busboy.on('finish', async () => {
      try {
        if (!fileData.buffer) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'No file uploaded.' }),
          });
        }
        
        const appId = fields.appId || 'default-app-id';
        const residentUid = fields.residentUid || 'unknown';
        const folderPath = fields.folderPath || '';
        const userIdentifier = fields.userIdentifier || 'unknown';
        
        // Build the file path
        const finalFileName = folderPath ? `${folderPath}${fileData.filename}` : fileData.filename;
        const filePath = `private_files/${residentUid}/${finalFileName}`;
        const gcsFile = bucket.file(filePath);
        
        // Use a readable stream from the buffer to upload the file
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileData.buffer);

        const writeStream = gcsFile.createWriteStream({
          metadata: {
            contentType: fileData.mimetype,
          },
        });
        
        bufferStream.pipe(writeStream);

        await new Promise((streamResolve, streamReject) => {
          writeStream.on('finish', streamResolve);
          writeStream.on('error', streamReject);
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
        
        // Save document metadata to Firestore
        const docRef = db.collection(`artifacts/${appId}/public/data/users/${residentUid}/privateDocuments`);
        await docRef.add({
          fileName: fileData.filename,
          folder: folderPath,
          url: publicUrl,
          uploadedBy: userIdentifier,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        resolve({
          statusCode: 200,
          body: JSON.stringify({ fileUrl: publicUrl }),
        });
      } catch (error) {
        console.error("Server-side error:", error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: `Server-side error: ${error.message}` }),
        });
      }
    });

    busboy.on('error', (err) => {
      console.error('Busboy error:', err);
      reject({
        statusCode: 500,
        body: JSON.stringify({ error: `Busboy parsing failed: ${err.message}` }),
      });
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
