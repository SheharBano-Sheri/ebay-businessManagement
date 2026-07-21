// src/app/api/ebay/account-deletion/route.js
//
// eBay Marketplace Account Deletion/Closure Notification endpoint.
// Handles two request types from eBay:
//   GET  -> one-time verification challenge (used when you first register the URL)
//   POST -> actual notifications when a real eBay user deletes their account

import { createHash } from "crypto";
import { NextResponse } from "next/server";

// Set this in your environment variables (Vercel + .env.local).
// Must be 32-80 characters: letters, numbers, underscore (_), hyphen (-) only.
// You choose this value yourself and enter the SAME value in the eBay
// developer portal when setting up the notification subscription.
const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;

// This MUST exactly match the endpoint URL you register with eBay,
// including https:// and the full path, no trailing slash.
const ENDPOINT_URL = "https://geniebms.com/api/ebay/account-deletion";

// --- GET: handles eBay's verification challenge ---
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const challengeCode = searchParams.get("challenge_code");

    if (!challengeCode) {
        return NextResponse.json(
            { error: "Missing challenge_code" },
            { status: 400 }
        );
    }

    if (!VERIFICATION_TOKEN) {
        return NextResponse.json(
            { error: "Server misconfiguration: verification token not set" },
            { status: 500 }
        );
    }

    // Order matters: challengeCode + verificationToken + endpoint
    const hash = createHash("sha256");
    hash.update(challengeCode);
    hash.update(VERIFICATION_TOKEN);
    hash.update(ENDPOINT_URL);
    const challengeResponse = hash.digest("hex");

    return NextResponse.json(
        { challengeResponse },
        {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }
    );
}

// --- POST: handles actual account deletion notifications ---
export async function POST(request) {
    try {
        const body = await request.json();

        // eBay's payload shape (simplified):
        // {
        //   metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION", ... },
        //   notification: {
        //     data: { username, userId, eiasToken },
        //     eventDate, notificationId, publishDate, ...
        //   }
        // }
        const userId = body?.notification?.data?.userId;
        const username = body?.notification?.data?.username;

        if (userId || username) {
            // TODO: delete/anonymize this user's data in your database.
            // e.g. await EbayOrder.deleteMany({ ebayUserId: userId });
            //      await Account.updateOne({ ebayUserId: userId }, { $set: { deleted: true } });
            console.log("eBay account deletion notification received for:", {
                userId,
                username,
            });
        }

        // Must always acknowledge with 200, or eBay will retry / flag the endpoint.
        return NextResponse.json({ status: "received" }, { status: 200 });
    } catch (err) {
        console.error("Error processing eBay deletion notification:", err);
        // Still return 200 so eBay doesn't keep retrying a malformed one-off payload,
        // unless you specifically want retries -- adjust based on your needs.
        return NextResponse.json({ status: "error logged" }, { status: 200 });
    }
}