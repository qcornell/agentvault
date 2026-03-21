/**
 * MCP Tool Definition for Token Swapping
 * This enables AI agents to execute trades through AgentVault
 */

import { Tool } from "../mcp/types";

export const swapTool: Tool = {
  name: "swap_tokens",
  description: "Swap one token for another on SaucerSwap DEX with safety guardrails",
  inputSchema: {
    type: "object",
    properties: {
      fromToken: {
        type: "string",
        description: "Token to swap from (e.g., 'HBAR', 'USDC', or token ID)"
      },
      toToken: {
        type: "string",
        description: "Token to swap to (e.g., 'HBAR', 'USDC', or token ID)"
      },
      amount: {
        type: "number",
        description: "Amount to swap (in smallest unit)"
      },
      slippageTolerance: {
        type: "number",
        description: "Maximum acceptable slippage percentage (default: 1%)",
        default: 1
      },
      urgency: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Trade urgency - affects slippage tolerance and gas fees",
        default: "medium"
      }
    },
    required: ["fromToken", "toToken", "amount"]
  }
};

export const getQuoteTool: Tool = {
  name: "get_swap_quote",
  description: "Get a price quote for a token swap without executing",
  inputSchema: {
    type: "object",
    properties: {
      fromToken: {
        type: "string",
        description: "Token to swap from"
      },
      toToken: {
        type: "string",
        description: "Token to swap to"
      },
      amount: {
        type: "number",
        description: "Amount to swap"
      }
    },
    required: ["fromToken", "toToken", "amount"]
  }
};

export const executeStrategyTool: Tool = {
  name: "execute_trading_strategy",
  description: "Execute a pre-defined or custom trading strategy",
  inputSchema: {
    type: "object",
    properties: {
      strategyId: {
        type: "string",
        description: "ID of a saved strategy or 'custom' for inline definition"
      },
      strategyDefinition: {
        type: "object",
        description: "Custom strategy definition (if strategyId is 'custom')",
        properties: {
          conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                params: { type: "object" }
              }
            }
          },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                params: { type: "object" }
              }
            }
          },
          guardrails: {
            type: "object",
            properties: {
              maxDailySpend: { type: "number" },
              maxPerTrade: { type: "number" },
              requireApprovalAbove: { type: "number" }
            }
          }
        }
      }
    },
    required: ["strategyId"]
  }
};

export const listStrategiesPriceTokensTool: Tool = {
  name: "list_trading_strategies",
  description: "List available trading strategies from templates or marketplace",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        enum: ["all", "templates", "marketplace", "my-strategies"],
        default: "all"
      }
    }
  }
};

export const getTokenPriceTool: Tool = {
  name: "get_token_price",
  description: "Get current price of a token from DEX pools",
  inputSchema: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Token symbol or ID"
      },
      inTermsOf: {
        type: "string",
        description: "Price denominated in this token (default: USDC)",
        default: "USDC"
      }
    },
    required: ["token"]
  }
};