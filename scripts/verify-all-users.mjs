import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// --- Helper to load .env manually without 'dotenv' package ---
function loadEnvFile(filename) {
  try {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return false;

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts
          .join("=")
          .replace(/^["']|["']$/g, "")
          .trim(); // Remove quotes if present
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log(`Loaded environment variables from ${filename}`);
    return true;
  } catch (error) {
    console.warn(`Failed to parse ${filename}:`, error.message);
    return false;
  }
}

// Try loading .env.local first (Next.js default), then .env
loadEnvFile(".env.local");
loadEnvFile(".env");
// -------------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    "❌ Error: MONGODB_URI is not defined. Make sure you have a .env or .env.local file in the root directory.",
  );
  process.exit(1);
}

async function verifyAllUsers() {
  try {
    console.log("Connecting to MongoDB...");
    // Only pass the URI, deprecated options like useNewUrlParser are no longer needed in Mongoose 9
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // We use the native collection to avoid schema validation issues in standalone scripts
    const collection = mongoose.connection.collection("users");

    // Check if we have users
    const count = await collection.countDocuments();
    console.log(`Found ${count} users in the database.`);

    if (count === 0) {
      console.log("No users to update.");
      process.exit(0);
    }

    // Update ALL users to be verified
    const result = await collection.updateMany(
      {}, // Empty filter matches all documents
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        },
      },
    );

    console.log("-----------------------------------");
    console.log("✅ OPERATION COMPLETE");
    console.log(`Matched Users: ${result.matchedCount}`);
    console.log(`Updated Users: ${result.modifiedCount}`);
    console.log("-----------------------------------");
    console.log("All current users can now log in without email verification.");
  } catch (error) {
    console.error("❌ Error updating users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

verifyAllUsers();
