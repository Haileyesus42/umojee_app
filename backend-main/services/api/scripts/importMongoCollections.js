require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const fs = require("fs/promises");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const INPUT_DIR = path.resolve(__dirname, "..", "db_collections");

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function getCollectionFiles() {
  const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .filter((entry) => entry.name !== ".gitkeep")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readDocuments(fileName) {
  const filePath = path.join(INPUT_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = EJSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName} does not contain a JSON array.`);
  }

  return parsed;
}

async function importCollection(db, fileName) {
  const collectionName = path.basename(fileName, ".json");
  const documents = await readDocuments(fileName);
  const collection = db.collection(collectionName);

  await collection.deleteMany({});

  if (documents.length > 0) {
    await collection.insertMany(documents, { ordered: false });
  }

  return {
    collectionName,
    count: documents.length,
  };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in server/.env");
  }

  const dbName = getArgValue("--db") || process.env.MONGODB_DB_NAME || "umoja_node";
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    const db = client.db(dbName);
    const files = await getCollectionFiles();

    if (files.length === 0) {
      console.log("No collection JSON files found to import.");
      return;
    }

    console.log(`Importing ${files.length} collections into ${dbName}...`);

    for (const fileName of files) {
      const result = await importCollection(db, fileName);
      console.log(`  - ${result.collectionName}: ${result.count} docs`);
    }

    console.log(`Finished importing collections into ${dbName}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Failed to import MongoDB collections.");
  console.error(error);
  process.exit(1);
});
