require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const fs = require("fs/promises");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const OUTPUT_DIR = path.resolve(__dirname, "..", "db_collections");
const SYSTEM_DATABASES = new Set(["admin", "config", "local"]);
const SYSTEM_COLLECTION_PREFIX = "system.";

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function getDatabaseNames(client, explicitDbName) {
  if (explicitDbName) {
    return [explicitDbName];
  }

  const defaultDbName = client.db().databaseName;
  if (defaultDbName && defaultDbName !== "test") {
    return [defaultDbName];
  }

  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();

  return databases
    .map((database) => database.name)
    .filter((name) => !SYSTEM_DATABASES.has(name));
}

async function exportCollection(db, collectionName, multipleDatabases) {
  const documents = await db.collection(collectionName).find({}).toArray();
  const fileName = multipleDatabases
    ? `${sanitizeFileName(db.databaseName)}.${sanitizeFileName(collectionName)}.json`
    : `${sanitizeFileName(collectionName)}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  const json = EJSON.stringify(documents, null, 2, { relaxed: false });

  await fs.writeFile(filePath, json);

  return {
    collectionName,
    count: documents.length,
    filePath,
  };
}

async function exportDatabase(db, multipleDatabases) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const userCollections = collections
    .map((collection) => collection.name)
    .filter((name) => !name.startsWith(SYSTEM_COLLECTION_PREFIX));

  const results = [];
  for (const collectionName of userCollections) {
    results.push(await exportCollection(db, collectionName, multipleDatabases));
  }

  return results;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in server/.env");
  }

  const explicitDbName = getArgValue("--db") || process.env.MONGODB_DB_NAME;
  const client = new MongoClient(mongoUri);

  await ensureOutputDir();

  try {
    await client.connect();

    const databaseNames = await getDatabaseNames(client, explicitDbName);
    if (databaseNames.length === 0) {
      console.log("No user databases found to export.");
      return;
    }

    const multipleDatabases = databaseNames.length > 1;
    for (const databaseName of databaseNames) {
      const results = await exportDatabase(client.db(databaseName), multipleDatabases);
      console.log(`Exported ${databaseName}:`);

      if (results.length === 0) {
        console.log("  No user collections found.");
        continue;
      }

      for (const result of results) {
        console.log(`  - ${result.collectionName}: ${result.count} docs -> ${result.filePath}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Failed to export MongoDB collections.");
  console.error(error);
  process.exit(1);
});
