// Test different key formats
const { PrivateKey } = require("@hashgraph/sdk");

const keyString = process.env.OPERATOR_KEY;
console.log("Key length:", keyString?.length);
console.log("Key starts with:", keyString?.substring(0, 10) + "...");

try {
  // Try as hex
  console.log("Trying as hex string...");
  const key1 = PrivateKey.fromString("0x" + keyString);
  console.log("✅ Hex format worked");
} catch (e) {
  console.log("❌ Hex format failed:", e.message);
}

try {
  // Try as raw
  console.log("Trying as raw string...");
  const key2 = PrivateKey.fromString(keyString);
  console.log("✅ Raw format worked");
} catch (e) {
  console.log("❌ Raw format failed:", e.message);
}

try {
  // Try with 302e prefix (DER format)
  console.log("Trying as DER (302e prefix)...");
  const key3 = PrivateKey.fromString("302e0201010420" + keyString);
  console.log("✅ DER format worked");
} catch (e) {
  console.log("❌ DER format failed:", e.message);
}