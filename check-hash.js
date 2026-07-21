const bcrypt = require("bcryptjs");

async function test() {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash("555555", salt);
  console.log("HASH:", hash);
  console.log("IS VALID bcrypt (starts with $2):", hash.startsWith('$2'));
}
test().catch(console.error);
