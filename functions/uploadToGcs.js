const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const storage = new Storage({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID, // Use the correct project ID from env vars
    credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
  });

  const bucketName = 'portalmalaga2025.appspot.com';
  const bucket = storage.bucket(bucketName);

  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    const fields = {};
    const fileWrites = [];
    let fileUrl = '';

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const folderPath = fields.folderPath || 'general';
      const filePath = `${folderPath}/${filename}`;
      const gcsFile = bucket.file(filePath);
      fileWrites.push(gcsFile.save(file));
      fileUrl = gcsFile.publicUrl();
    });

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('finish', async () => {
      try {
        await Promise.all(fileWrites);
        resolve({
          statusCode: 200,
          body: JSON.stringify({ fileUrl }),
        });
      } catch (error) {
        reject({
          statusCode: 500,
          body: JSON.stringify({ error: error.message }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
