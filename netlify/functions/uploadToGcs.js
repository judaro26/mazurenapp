const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const { stream } = require('undici-types');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Ensure GOOGLE_CLOUD_CREDENTIALS is set in Netlify's environment variables
  if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
    return { statusCode: 500, body: 'Missing Google Cloud credentials.' };
  }

  const storage = new Storage({
    projectId: 'portalmalaga2025',
    credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS),
  });

  const bucketName = 'portalmalaga2025.appspot.com';
  const bucket = storage.bucket(bucketName);

  return new Promise((resolve, reject) => {
    // CORRECTED: Call Busboy as a function, not a constructor
    const busboy = Busboy({ headers: event.headers });
    const fields = {};
    const fileWrites = [];
    let fileUrl = '';

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const folderPath = fields.folderPath || 'general';
      const filePath = `private_files/${fields.residentUid || 'unknown'}/${folderPath}/${filename}`;
      const gcsFile = bucket.file(filePath);

      // Create a write stream to upload the file to GCS
      const writeStream = gcsFile.createWriteStream({
        metadata: {
          contentType: mimetype,
        },
      });

      // Pipe the file stream from the request into the GCS write stream
      file.pipe(writeStream);

      // Handle events for the write stream
      writeStream.on('finish', () => {
        gcsFile.makePublic().then(() => {
          fileUrl = gcsFile.publicUrl();
          fileWrites.push(Promise.resolve());
        });
      });

      writeStream.on('error', (err) => {
        reject({
          statusCode: 500,
          body: JSON.stringify({ error: `Upload to GCS failed: ${err.message}` }),
        });
      });
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
