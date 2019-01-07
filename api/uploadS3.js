const { config, S3 } = require('aws-sdk');

config.region = 'eu-central-1';
const s3 = new S3({
  accessKeyId: 'AKIAJFN5GPX6HVDJTTDQ',
  secretAccessKey: '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',
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
