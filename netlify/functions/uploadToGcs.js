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
    const filePromises = [];

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filenameInfo) => {
      // This handler will now execute after all fields are parsed.
      const { filename } = filenameInfo;
      const promise = new Promise((resolveFile, rejectFile) => {
        const folderPath = fields.folderPath || 'general';
        const residentUid = fields.residentUid || 'unknown';
        const filePath = `private_files/${residentUid}/${folderPath}/${filename}`;
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
          rejectFile(new Error(`Upload to GCS failed: ${err.message}`));
        });
      });
      filePromises.push(promise);
    });

    busboy.on('finish', async () => {
      try {
        const fileUrls = await Promise.all(filePromises);
        resolve({
          statusCode: 200,
          body: JSON.stringify({ fileUrl: fileUrls[0] || '' }),
        });
      } catch (error) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: `Server-side error: ${error.message}` }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
