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

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    const fields = {};
    let fileStreamPromise;

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filenameInfo) => {
      fileStreamPromise = new Promise((resolveFile, rejectFile) => {
        // Construct the file path here
        const residentUid = fields.residentUid || 'unknown';
        const folderPath = fields.folderPath || '';
        const finalFileName = folderPath ? `${folderPath}${filenameInfo.filename}` : filenameInfo.filename;
        const filePath = `private_files/${residentUid}/${finalFileName}`;
        const gcsFile = bucket.file(filePath);
        
        const writeStream = gcsFile.createWriteStream({
          metadata: {
            contentType: filenameInfo.mimetype,
          },
        });

        file.pipe(writeStream);

        writeStream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
          resolveFile(publicUrl);
        });

        writeStream.on('error', (err) => {
          console.error('Upload to GCS failed:', err);
          rejectFile(new Error(`Upload to GCS failed: ${err.message}`));
        });
      });
    });

    busboy.on('error', (err) => {
      console.error('Busboy error:', err);
      reject({
        statusCode: 500,
        body: JSON.stringify({ error: `Busboy parsing failed: ${err.message}` }),
      });
    });

    busboy.on('finish', async () => {
      if (!fileStreamPromise) {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ error: 'No file uploaded.' }),
        });
      }

      try {
        const fileUrl = await fileStreamPromise;
        resolve({
          statusCode: 200,
          body: JSON.stringify({ fileUrl }),
        });
      } catch (error) {
        reject({
          statusCode: 500,
          body: JSON.stringify({ error: `Server-side error: ${error.message}` }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
