const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const stream = require('stream');

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
    const fileData = {};

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filenameInfo) => {
      // Create a buffer to hold the file data in memory
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
        
        const residentUid = fields.residentUid || 'unknown';
        const folderPath = fields.folderPath || '';
        
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

    // You need to correctly decode the body
    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
