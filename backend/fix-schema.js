require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    await db.command({
      collMod: 'users',
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "email", "passwordHash", "role", "createdAt", "updatedAt"],
          properties: {
            name: { bsonType: "string" },
            email: {
              bsonType: "string",
              pattern: "^.+@.+\\..+$"
            },
            passwordHash: { bsonType: "string" },
            role: {
              enum: ["user", "driver", "admin"]
            },
            rtc: {
              bsonType: ["string", "null"],
              enum: ["GSRTC", "MSRTC", "RSRTC", null]
            },
            isActive: { bsonType: "bool" },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      }
    });
    console.log("Users schema updated successfully.");
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run();
