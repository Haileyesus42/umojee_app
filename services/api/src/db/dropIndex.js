const { MongoClient } = require("mongodb");

const mongoUri = "mongodb+srv://vipinchaudhary:fNTLn4s17coZlvqT@cluster0.8e1ltns.mongodb.net/?retryWrites=true&w=majority"; // Replace with your actual MongoDB URI

async function dropIndex() {
    const client = new MongoClient(mongoUri);

    try {
        // Connect to the MongoDB cluster
        await client.connect();
        console.log("Connected to MongoDB");

        // List all databases to identify the correct dbName
        const adminDb = client.db().admin();
        const databases = await adminDb.listDatabases();
        console.log("Available Databases:", databases.databases.map(db => db.name));

        // Specify your database name here after identifying it
        const dbName = "test"; // Replace with the correct database name
        const db = client.db(dbName);
        const collection = db.collection("announcements");

        // Drop the specific index
        const indexName = "selectedMessageData.templateName_1";
        const existingIndexes = await collection.indexes();
        const indexExists = existingIndexes.some(index => index.name === indexName);

        if (indexExists) {
            await collection.dropIndex(indexName);
            console.log(`Index "${indexName}" dropped successfully`);
        } else {
            console.log(`Index "${indexName}" does not exist`);
        }
    } catch (error) {
        console.error("Error:", error.message || error);
    } finally {
        // Close the connection
        await client.close();
        console.log("Connection closed");
    }
}

dropIndex();
