import { config, S3 } from 'aws-sdk';

config.region = "eu-central-1";
const s3 = new S3({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  apiVersion: '2006-03-01',
  params: { Bucket: 'peery' }
});

export default (body) => new Promise((resolve, reject) => {
  s3.upload({
      Body: body.file,
      Key: `${Date.now()}-${body.file.name}`,
      ACL: 'public-read'
    },
    (err, resp) => {
      if (err) {
        if (body.onError) body.onError();
        reject(err);
      } else {
        resolve(resp);
      }
    }).on('httpUploadProgress', (progress) => {
    const percent = 100 * progress.loaded / progress.total;
    body.onProgress ? body.onProgress({
      percent
    }, body.file) : void 0;
    if (percent === 100 && body.onSuccess) {
      body.onSuccess();
    }
  }).on('httpError', (err) => {
    if (err && body.onError) {
      body.onError();
      reject(err);
    }
  });
});