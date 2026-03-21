# 🤖 AgentVault Trading Bot - Setup Guide

## Quick Start (5 minutes)

### 1. Get a Hedera Account (Free)
Go to https://portal.hedera.com and create a testnet account. You'll get:
- Account ID (like `0.0.1234567`)
- Private key (starts with `302e...`)
- 10,000 free testnet HBAR

### 2. Install AgentVault
```bash
git clone https://github.com/qcornell/agentvault.git
cd agentvault
npm install
```

### 3. Test the Trading Bot
```bash
# Set your credentials
export OPERATOR_ID="0.0.YOUR_ACCOUNT"
export OPERATOR_KEY="302e..."

# Run on testnet (free, safe)
npm run trade:testnet

# Or mainnet (real money!)
npm run trade:mainnet
```

### 4. Open Strategy Builder
```bash
npm run strategy-builder
# Opens in browser - drag & drop to build strategies!
```

## What You Can Do

### 📊 Get Real Prices
```javascript
// The bot can check prices on SaucerSwap
const quote = await getSwapQuote(client, {
  fromToken: "HBAR",
  toToken: "SAUCE",
  amountIn: 10
});
// Returns: price, impact, route
```

### 🔄 Execute Swaps
```javascript
// Real trading on SaucerSwap
const result = await swapTokens(client, {
  fromToken: "HBAR",
  toToken: "USDC",
  amountIn: 100,
  minAmountOut: 95 // 5% slippage
});
```

### 🛡️ Safety Guardrails
Every trade is checked by the policy engine:
- Daily spending limits
- Per-transaction limits  
- Approval thresholds
- Allowed token lists
- Time-based restrictions

### 📦 Pre-Built Strategies

**1. Safe DCA**
- Buy $20 HBAR every day at noon
- Perfect for accumulation

**2. Buy the Dip**
- Auto-buy when HBAR drops 5%
- Catch those discounts

**3. Take Profits**
- Sell 25% when up 20%
- Lock in gains automatically

## Strategy Builder UI

Open `dashboard/strategy-builder.html` to:
- Drag & drop conditions (IF price drops 5%)
- Add actions (THEN buy $50 HBAR)
- Set guardrails (MAX $100/day)
- Export as JSON
- Deploy to AgentVault

## Supported Tokens

### Mainnet
- HBAR (native)
- SAUCE (SaucerSwap token)
- USDC (USD Coin)
- KARATE (Karate Combat)
- HST (HashPack token)
- GRELF (Grelf)

### Testnet
- HBAR (native)
- SAUCE (test token)
- Test USDC

## Real Trading Example

```bash
# 1. Set credentials
export NETWORK=mainnet
export OPERATOR_ID=0.0.YOUR_ACCOUNT
export OPERATOR_KEY=302e...

# 2. Run live test
npm run trade

# Output:
# 🚀 AgentVault LIVE Trading Test
# 📍 Network: MAINNET
# 💰 Balance: 100.5 ℏ
# 
# Getting quote for 1 HBAR -> SAUCE...
# 📈 Quote received:
#    • Expected output: 423.7 SAUCE
#    • Price impact: 0.12%
#    • Route: HBAR -> SAUCE
#
# Execute the swap? (yes/no): yes
# ✅ SWAP SUCCESSFUL!
#    Transaction ID: 0.0.1234567@1234567890.123456789
#    View on HashScan: https://hashscan.io/mainnet/transaction/...
```

## Architecture

```
Your Strategy (JSON)
        ↓
  Policy Engine (Safety Check)
        ↓
  SaucerSwap V2 (Real DEX)
        ↓
  Hedera Network (Execution)
        ↓
  HCS Audit Log (Proof)
```

## API Integration

### For Developers
```javascript
import { AgentVault } from 'agentvault';
import { executeStrategy, STRATEGY_TEMPLATES } from 'agentvault/trading';

// Use pre-built strategy
const strategy = STRATEGY_TEMPLATES['safe-dca'];

// Or create custom
const customStrategy = {
  conditions: [
    { type: 'price_below', params: { price: 0.05 } }
  ],
  actions: [
    { type: 'swap', params: { 
      from: 'USDC', 
      to: 'HBAR', 
      amount: 100 
    }}
  ],
  guardrails: {
    maxDailySpend: 500,
    maxPerTrade: 100
  }
};

// Execute with safety
await executeStrategy(client, customStrategy, marketData);
```

## Coming Soon

- **Strategy Marketplace** - Buy/sell proven strategies
- **Performance Tracking** - Live P&L, win rate, drawdown
- **Multi-DEX** - Arbitrage between SaucerSwap, Pangolin, HeliSwap
- **Mobile App** - Trade from your phone
- **AI Predictions** - GPT-powered market analysis

## Support

- Discord: [Join our server](https://discord.gg/hedera)
- GitHub: [Report issues](https://github.com/qcornell/agentvault)
- Docs: [Full documentation](https://agentvault.pro/docs)

## Legal

⚠️ **Risk Warning**: Trading cryptocurrency involves risk. AgentVault enforces safety rules but cannot guarantee profits. Never trade more than you can afford to lose.

---

Built with ❤️ for the Hedera hackathon. Not just another trading bot - this is the future of DeFi.