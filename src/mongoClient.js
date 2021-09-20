const { MongoClient } = require("mongodb");
const debug = require("debug");

const utils = require("./utils.js");

const debugLog = debug("app:db");


const createClient = async (dbHost, dbPort, dbUsername, dbPassword, dbName, dbSchema) => {
	const db = await connectToDbAndRefreshSchema(dbHost, dbPort, dbUsername, dbPassword, dbName, dbSchema);

	return {
		findMany: async (collectionName, query, options={}, limit=-1, offset=0, returnAsArray=true) => {
			return _findMany(db, collectionName, query, options, limit, offset, returnAsArray);
		},
		findOne: async (collectionName, query, options={}) => {
			return _findOne(db, collectionName, query, options);
		},
		insertMany: async (collectionName, documents) => {
			return _insertMany(db, collectionName, documents);
		},
		insertOne: async (collectionName, document) => {
			return _insertOne(db, collectionName, document);
		},
		deleteOne: async (collectionName, query) => {
			return _deleteOne(db, collectionName, query);
		},
		getCollection: async (collectionName) => {
			return _getCollection(db, collectionName);
		},
		getRawDb: () => {
			return db;
		}
	};
};

const connectToDbAndRefreshSchema = async (dbHost, dbPort, dbUsername, dbPassword, dbName, dbSchema) => {
	let usernamePassword = "";
	if (dbUsername && dbUsername.trim().length > 0) {
		usernamePassword = `${dbUsername}:${dbPassword}@`;
	}

	let connectionUrl = `mongodb://${usernamePassword}${dbHost}:${dbPort}/?authMechanism=SCRAM-SHA-256`;

	if (dbUsername && dbUsername.trim().length > 0) {
		connectionParams.auth = { username: dbUsername, password: dbPassword };
	}


	debugLog(`Connecting to database: ${dbHost}:${dbPort}`);
	
	const client = new MongoClient(connectionUrl);

	try {
		await client.connect();

		await client.db("admin").command({ ping: 1 });

		debugLog(`Success: Connected to database`);

		let db = client.db(dbName);

		await setupSchema(db, dbSchema);

		return db;

	} catch (err) {
		utils.logError("mongodb.connection-failure", err);

		throw err;

	} finally {
		await client.close();
	}
}



async function setupSchema(db, dbSchema) {
	const existingCollections = await db.listCollections().toArray();
	const existingCollectionNames = existingCollections.map(c => c.name);

	debugLog("Existing collections: " + JSON.stringify(existingCollectionNames));

	dbSchema.forEach(async (collection) => {
		if (!existingCollectionNames.includes(collection.name)) {
			debugLog(`setupSchema: creating collection '${collection.name}'`);
	
			await db.createCollection(collection.name);

		} else {
			debugLog(`setupSchema: collection '${collection.name}' already exists`);
		}

		await setupCollectionIndexes(db, collection.name, collection.indexes);
	});
}

async function setupCollectionIndexes(db, collectionName, neededIndexes) {
	const existingIndexNames = await getCollectionIndexes(db, collectionName);

	neededIndexes.forEach(async (neededIndex) => {
		if (!existingIndexNames.includes(neededIndex.name)) {
			debugLog(`setupSchema: ${collectionName}.index[${neededIndex.name}] being created`);

			await db.collection(collectionName).createIndex( neededIndex.key, neededIndex.properties);

		} else {
			debugLog(`setupSchema: ${collectionName}.index[${neededIndex.name}] already exists`);
		}
	});
}

async function getCollectionIndexes(db, collectionName) {
	const cursor = await db.collection(collectionName).listIndexes();
	const existingIndexNames = [];

	while (await cursor.hasNext()) {
		const existingIndex = await cursor.next();
		
		if (existingIndex != null && existingIndex.name != null) {
			existingIndexNames.push(existingIndex.name);
		}
	}

	return existingIndexNames;
}




async function _findOne(db, collectionName, query, options={}) {
	let objects = await _findMany(db, collectionName, query, options);

	return objects[0];
}

async function _findMany(db, collectionName, query, options={}, limit=-1, offset=0, returnAsArray=true) {
	return new Promise((resolve, reject) => {
		let collection = db.collection(collectionName);

		let cursor = collection.find(query, options);

		if (offset > 0) {
			cursor.skip(offset);
		}

		if (limit > 0) {
			cursor.limit(limit);
		}

		if (returnAsArray) {
			cursor.toArray((err, results) => {
				if (err) {
					reject(err);
	
				} else {
					resolve(results);
				}
			});
		} else {
			resolve(cursor);
		}
	});
}

async function _insertOne(db, collectionName, document) {
	const insertedObjectIds = await _insertMany(db, collectionName, [document]);

	return insertedObjectIds[0];
}

async function _insertMany(db, collectionName, documents) {
	let collection = db.collection(collectionName);

	documents.forEach((doc) => {
		if (!doc.createdAt) {
			doc.createdAt = new Date();
		}

		doc.updatedAt = new Date();
	});

	const result = await collection.insertMany(documents);

	const insertedObjectIds = [];
	for (let i = 0; i < result.insertedCount; i++) {
		insertedObjectIds.push(result.insertedIds[`${i}`]);
	}

	debugLog(`${collectionName}: inserted ${result.insertedCount} document(s)`);

	return insertedObjectIds;
}

async function _deleteOne(db, collectionName, query) {
	return new Promise(async (resolve, reject) => {
		let collection = db.collection(collectionName);

		const result = await collection.deleteOne(query);

		resolve(result);
	});
}

async function _getCollection(db, collectionName) {
	return new Promise(async (resolve, reject) => {
		resolve(db.collection(collectionName));
	});
}


module.exports = {
	createClient: createClient
}