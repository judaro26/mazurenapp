const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
    return { statusCode: 500, body: 'Missing Google Cloud credentials.' };
  }

  const storage = new Storage({
    projectId: 'portalmalaga-470004',
    credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS),
  });
  
  const bucketName = 'portalmalaga2025';
  const bucket = storage.bucket(bucketName);

  return new Promise((resolve) => {
    const busboy = Busboy({
      headers: event.headers
    });
    const fields = {};
    let fileInfo = {};

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filenameInfo) => {
      // Store file and filename info but don't process yet
      fileInfo = { file, filenameInfo };
    });

    busboy.on('finish', async () => {
      try {
        const { file, filenameInfo } = fileInfo;
        const filename = filenameInfo.filename;
        const residentUid = fields.residentUid || 'unknown';
        const folderPath = fields.folderPath || '';

        if (!file) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'No file uploaded.' }),
          });
        }
        
        // Use the fields that are now available
        const finalFileName = folderPath ? `${folderPath}${filename}` : filename;
        const filePath = `private_files/${residentUid}/${finalFileName}`;
        const gcsFile = bucket.file(filePath);

        const writeStream = gcsFile.createWriteStream({
          metadata: {
            contentType: filenameInfo.mimetype,
          },
        });

        file.pipe(writeStream);

        await new Promise((resolveStream, rejectStream) => {
          writeStream.on('finish', resolveStream);
          writeStream.on('error', (err) => {
            console.error('Upload to GCS failed:', err);
            rejectStream(new Error(`Upload to GCS failed: ${err.message}`));
          });
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
        
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

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
