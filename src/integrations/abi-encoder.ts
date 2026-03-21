/**
 * ABI Encoder/Decoder for Solidity contract interaction
 * Used for SaucerSwap contract calls
 */

/**
 * Encode a uint256 value
 */
export function encodeUint256(value: number | bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Encode an address (20 bytes)
 */
export function encodeAddress(address: string): Uint8Array {
  // Remove "0.0." prefix if present
  const parts = address.split('.');
  const accountNum = parseInt(parts[parts.length - 1]);
  
  // Convert to 20-byte address
  const bytes = new Uint8Array(20);
  const hex = accountNum.toString(16).padStart(40, '0');
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Encode function selector (4 bytes)
 */
export function encodeFunctionSelector(signature: string): Uint8Array {
  // Simple hash function for demo (in production use keccak256)
  const hash = simpleHash(signature);
  return hash.slice(0, 4);
}

/**
 * Simple hash for demo (replace with proper keccak256 in production)
 */
function simpleHash(input: string): Uint8Array {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const bytes = new Uint8Array(32);
  const hex = Math.abs(hash).toString(16).padStart(64, '0');
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Encode exactInputSingle parameters for SaucerSwap V2
 * 
 * struct ExactInputSingleParams {
 *   address tokenIn;
 *   address tokenOut;
 *   uint24 fee;
 *   address recipient;
 *   uint256 deadline;
 *   uint256 amountIn;
 *   uint256 amountOutMinimum;
 *   uint160 sqrtPriceLimitX96;
 * }
 */
export function encodeExactInputSingle(params: {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  recipient: string;
  deadline: number;
  amountIn: number;
  amountOutMinimum: number;
  sqrtPriceLimitX96: number;
}): Uint8Array {
  const result = new Uint8Array(256);
  let offset = 0;
  
  // Function selector
  const selector = encodeFunctionSelector("exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))");
  result.set(selector, offset);
  offset += 4;
  
  // Encode struct
  result.set(encodeAddress(params.tokenIn), offset);
  offset += 32;
  
  result.set(encodeAddress(params.tokenOut), offset);
  offset += 32;
  
  result.set(encodeUint256(params.fee), offset);
  offset += 32;
  
  result.set(encodeAddress(params.recipient), offset);
  offset += 32;
  
  result.set(encodeUint256(params.deadline), offset);
  offset += 32;
  
  result.set(encodeUint256(params.amountIn), offset);
  offset += 32;
  
  result.set(encodeUint256(params.amountOutMinimum), offset);
  offset += 32;
  
  result.set(encodeUint256(params.sqrtPriceLimitX96), offset);
  
  return result;
}

/**
 * Decode uint256 from bytes
 */
export function decodeUint256(bytes: Uint8Array, offset: number = 0): bigint {
  let hex = '';
  for (let i = offset; i < offset + 32; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return BigInt('0x' + hex);
}

/**
 * Decode quote result from SaucerSwap
 */
export function decodeQuoteResult(bytes: Uint8Array): {
  amountOut: number;
  sqrtPriceX96After: number;
  initializedTicksCrossed: number;
} {
  return {
    amountOut: Number(decodeUint256(bytes, 0)),
    sqrtPriceX96After: Number(decodeUint256(bytes, 32)),
    initializedTicksCrossed: Number(decodeUint256(bytes, 64))
  };
}