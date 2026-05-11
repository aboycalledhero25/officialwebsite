const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  console.error("Example: node scripts/hash-password.js mySecurePass123");
  process.exit(1);
}

// Generate hash
const hash = bcrypt.hashSync(password, 12);

// Escape $ for .env files — dotenv interprets $ as variable references
const escaped = hash.replace(/\$/g, "\\$");

// Verify the hash works immediately
const verifySync = bcrypt.compareSync(password, hash);

console.log("\n✅ Hash generated and verified:", verifySync ? "PASS" : "FAIL");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("COPY THIS EXACT LINE into your .env.local file:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`ADMIN_PASSWORD_HASH=${escaped}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("The \\ before each $ is required — do not remove them!");
console.log("It prevents the .env parser from misreading the hash.\n");

// Auto-update .env.local if it exists
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf-8");
  const regex = /^ADMIN_PASSWORD_HASH=.*$/m;

  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `ADMIN_PASSWORD_HASH=${escaped}`);
    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env.local updated automatically.");
  } else {
    console.log("⚠️  .env.local exists but has no ADMIN_PASSWORD_HASH line.");
    console.log("   Add the line above manually.");
  }
} else {
  console.log("⚠️  .env.local not found. Create one and add the line above.");
}

console.log("");
