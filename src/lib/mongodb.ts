import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/talkto';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(customUri?: string): Promise<MongoClient> {
  const targetUri = customUri || process.env.MONGODB_URI || uri;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(targetUri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(targetUri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDatabase(customUri?: string, dbName = 'talkto'): Promise<Db> {
  const clientInstance = await getMongoClient(customUri);
  return clientInstance.db(dbName);
}
