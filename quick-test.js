// Quick JS test - no TypeScript
const { Client, AccountId, PrivateKey, AccountBalanceQuery } = require("@hashgraph/sdk");

async function test() {
  console.log("Testing connection to Hedera...");
  
  const client = Client.forMainnet();
  client.setOperator(
    AccountId.fromString("0.0.10206295"),
    PrivateKey.fromString(process.env.OPERATOR_KEY)
  );
  
  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId("0.0.10206295")
      .execute(client);
    
    console.log("SUCCESS! Balance:", balance.hbars.toString());
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}

test();