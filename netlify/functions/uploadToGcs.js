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
    let fileUploadFinished = false;
    let fileUrl = '';
    let uploadedFileName = '';

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filenameInfo) => {
      const { filename, encoding, mimetype } = filenameInfo;
      uploadedFileName = filename;
      const folderPath = fields.folderPath || 'general';
      const residentUid = fields.residentUid || 'unknown';
      const filePath = `private_files/${residentUid}/${folderPath}/${uploadedFileName}`;
      const gcsFile = bucket.file(filePath);

      const writeStream = gcsFile.createWriteStream({
        metadata: {
          contentType: mimetype,
        },
      });

      file.pipe(writeStream);

      writeStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
        fileUrl = publicUrl;
        fileUploadFinished = true;
      });

      writeStream.on('error', (err) => {
        reject({
          statusCode: 500,
          body: JSON.stringify({ error: `Upload to GCS failed: ${err.message}` }),
        });
      });
    });

    busboy.on('finish', () => {
      if (fileUploadFinished) {
        resolve({
          statusCode: 200,
          body: JSON.stringify({ fileUrl }),
        });
      } else {
        // Handle case where file event might not have fired
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'File upload stream did not complete.' }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
