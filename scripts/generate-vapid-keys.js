#!/usr/bin/env node
const webpush = require("web-push");

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log("=== VAPID Keys Generated ===");
console.log("Public Key:", "[REDACTED - see .env.local]");
console.log("Private Key:", "[REDACTED - see .env.local]");
console.log("");
console.log("=== Add to .env.local ===");
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:your-email@example.com"`);
console.log("");
console.log("=== Next Steps ===");
console.log("1. Add these variables to your .env.local file");
console.log("2. Update VAPID_SUBJECT with your actual email");
console.log(
  "3. These keys should be kept secure and not committed to version control",
);
