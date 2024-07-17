const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  accessKeyId:process.env.awsAccessKeyId,
secretAccessKey: process.env.awsSecretAccessKey,
region: process.env.awsRegion
});

// Create a new instance of the S3 service
const s3 = new AWS.S3();

