# AgentVault - AI-Safe Wallet Infrastructure

Enterprise-grade wallet infrastructure for autonomous agents on Hedera. Built with Stripe/Linear/Vercel-level polish.

## Features

### Core Sections

1. **Overview Dashboard**
   - Real-time KPI cards (Vault Balance, Daily Spent, Pending Approvals, Audit Entries)
   - Recent Activity feed with transaction history
   - Policy status summary
   - Verifiable proof panel with HashScan and HCS links

2. **Strategy Builder** ⭐ NEW
   - Enterprise-grade visual strategy builder
   - Left panel: Templates and reusable blocks (Triggers, Conditions, Actions)
   - Center panel: Strategy flow with IF/THEN logic grouping
   - Right panel: Real-time block configuration with production-ready fields
   - Features:
     - Token pair selection
     - Threshold percentages
     - Schedule configuration
     - Amount and slippage controls
     - Save/Test/Deploy workflow
     - Strategy status tracking (Enabled, Paused, Limit Reached, Circuit Breaker)
   - Includes "Safe DCA" demo strategy for immediate evaluation

3. **Approvals Queue**
   - Interactive approval table with status filtering
   - Approve/Deny actions with confirmation modals
   - Real-time status updates
   - Detailed reason explanations

4. **Policy Engine**
   - Configurable guardrails and safety rules
   - Live policy toggle controls
   - Policy simulation tool with verdict explanations
   - Configuration interface for limits, whitelists, thresholds, and schedules

5. **Audit Trail**
   - Immutable on-chain activity log via Hedera Consensus Service (HCS)
   - Comprehensive transaction history with HashScan verification
   - Filterable timeline with verdict status
   - Direct links to HCS topics and transaction proofs

6. **Identity & Vault**
   - NFT-based identity management
   - Vault details and token holdings
   - Security status indicators
   - Multi-sig and circuit breaker status

### Key Features

- **Guided Demo Mode**: Interactive 3-step demo for hackathon judges
  - Step 1: Denied action (unlisted token)
  - Step 2: Approval required (threshold exceeded)
  - Step 3: Safe action (within limits)

- **Proof Panel**: Always-visible verification links
  - Mainnet transaction links
  - HCS topic verification
  - GitHub repository access

- **Enterprise Design**:
  - Clean 8px spacing grid
  - Strong typography hierarchy with Inter font
  - High-contrast accessible colors (WCAG AA)
  - Subtle shadows and transitions
  - Professional light theme with optional dark mode
  - Responsive layout for all screen sizes

## Technology Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Vite for blazing-fast development

## Getting Started

The dev server is automatically started for you. Open your browser to see the application.

## Brand Promise

**"AI can't run off with your money"**

AgentVault provides:
- Policy engine with hard guardrails
- Human approval workflows
- Verifiable on-chain audit trail via HCS
- Mainnet proof with HashScan links
