var fs = require("fs");

process.env.ENCRYPTION_PASSWORD = "abc";
process.env.PBKDF2_SALT = "abcdeabcdeabcdeabcdeabcdeabcdeab";


const appUtils = require("../index.js");
const s3Utils = appUtils.s3Utils("links.rest", "pathPrefix");

const utils = appUtils.utils;



// Create unique bucket name
var bucketName = 'links.rest';
// Create name for uploaded object key
var keyName = 'test-data/test2.txt';


var buffer = fs.readFileSync("../index.js");
console.log("buffer.length: " + buffer.length);

(async () => {
	try {
		await s3Utils.put(buffer, keyName);

		const getData = await s3Utils.get(keyName);

		console.log("buffer.length(after): " + getData.Body.length);

	} catch (err) {
		console.log("ERROR");

		utils.logError("asdfuashdfe3", err);
	}
})();

/*
var ciphertext = Buffer.from(JSON.stringify(encryptor.encrypt(buffer)));
console.log("cipherLength: " + ciphertext.length);
console.log("cipher: " + JSON.stringify(ciphertext));

var credentials = new AWS.SharedIniFileCredentials({profile: 'links-app'});
AWS.config.credentials = credentials;

console.log("cred: " + JSON.stringify(AWS.config.credentials));

(async () => {
	var objectParams = {Bucket: bucketName, Key: keyName, Body: ciphertext};
	var s3Client = new AWS.S3({apiVersion: '2006-03-01'});
	var response = await s3Client.putObject(objectParams).promise();

	console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
	console.log("response: " + JSON.stringify(response));
})();*/