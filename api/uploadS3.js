const { config, S3 } = require('aws-sdk');

config.region = 'eu-central-1';
const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  apiVersion: '2006-03-01',
  params: { Bucket: 'peery' }
});

module.exports = body => new Promise((resolve, reject) => {
  s3.upload({
    Body: Buffer.from(JSON.stringify(body)),
    Key: `${Date.now()}.txt`,
    ACL: 'public-read'
  },
  (err, resp) => {
    if (err) {
      reject(err);
    } else {
      resolve(resp);
    }
  });
});
