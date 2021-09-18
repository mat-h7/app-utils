const AWS = require('aws-sdk');

const debug = require("debug");
const debugLog = debug("app:s3Utils");

if (process.env.AWS_PROFILE_NAME) {
	debugLog(`Using AWS Credentials from profile '${process.env.AWS_PROFILE_NAME}'`);

	var credentials = new AWS.SharedIniFileCredentials({profile: process.env.AWS_PROFILE_NAME});
	AWS.config.credentials = credentials;
}

debugLog(`Using AWS Access Key: ${AWS.config.credentials.accessKeyId}`);
const s3Client = new AWS.S3({apiVersion: '2006-03-01'});


const createBucket = (bucket, pathPrefix) => {
	let prefix = (pathPrefix || "").trim();
	if (prefix.length > 0 && !prefix.endsWith("/")) {
		prefix = (prefix + "/");
	}

	return {
		put: async (data, path) => {
			var uploadParams = {
				Bucket: bucket,
				Key: `${prefix}${path}`,
				Body: data
			};
				
			await s3Client.putObject(uploadParams).promise();
		},

		get: async (path) => {
			var getParams = {
				Bucket: bucket,
				Key: `${prefix}${path}`,
			};
				
			const s3Response = await s3Client.getObject(getParams).promise();

			return s3Response.Body;
		},

		del: async (path) => {
			var deleteParams = {
				Bucket: bucket,
				Key: `${prefix}${path}`,
			};
				
			return await s3Client.deleteObject(deleteParams).promise();
		}
	};
};



module.exports = {
	createBucket: createBucket
};