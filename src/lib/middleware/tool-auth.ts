/**
 * Tool Authentication Middleware
 *
 * Validates tool calls from Lyzr agents by verifying the x-token header.
 * The x-token contains encrypted organization context created during tool setup.
 */

import { NextRequest } from 'next/server';
import { decrypt } from '@/lib/encryption';

/**
 * Tool context structure - decrypted from x-token header
 */
export interface ToolContext {
  organizationId: string;
  organizationName: string;
}

/**
 * Result of tool authentication validation
 */
export interface ToolAuthResult {
  success: boolean;
  context?: ToolContext;
  error?: string;
}

/**
 * Validate the x-token header from Lyzr tool calls
 *
 * This function:
 * 1. Extracts the x-token header
 * 2. Decrypts it to get organization context
 * 3. Validates the context structure
 * 4. Returns the context if valid, or error if invalid
 *
 * @param request - The Next.js request object
 * @returns ToolAuthResult with success status and context or error
 */
export function validateToolToken(request: NextRequest): ToolAuthResult {
  try {
    // Extract x-token from headers
    const xToken = request.headers.get('x-token');

    if (!xToken) {
      console.error('Tool auth failed: Missing x-token header');
      return {
        success: false,
        error: 'Missing x-token header. Tool call not authorized.'
      };
    }

    // Decrypt the token
    let decryptedToken: string;
    try {
      decryptedToken = decrypt(xToken);
    } catch (decryptError) {
      console.error('Tool auth failed: Decryption error:', decryptError);
      return {
        success: false,
        error: 'Invalid x-token header. Tool call not authorized.'
      };
    }

    if (!decryptedToken || decryptedToken === xToken) {
      // If decryption failed or returned the same value, it's invalid
      console.error('Tool auth failed: Decryption returned invalid result');
      return {
        success: false,
        error: 'Invalid x-token header. Tool call not authorized.'
      };
    }

    // Parse the JSON context
    let context: ToolContext;
    try {
      context = JSON.parse(decryptedToken);
    } catch (parseError) {
      console.error('Tool auth failed: JSON parse error:', parseError);
      return {
        success: false,
        error: 'Malformed x-token header. Tool call not authorized.'
      };
    }

    // Validate required context fields
    if (!context.organizationId || !context.organizationName) {
      console.error('Tool auth failed: Missing required context fields', context);
      return {
        success: false,
        error: 'Incomplete context in x-token header. Tool call not authorized.'
      };
    }

    // Validation successful
    console.log(`✅ Tool auth successful for organization: ${context.organizationName} (${context.organizationId})`);
    return {
      success: true,
      context
    };

  } catch (error) {
    console.error('Tool auth failed: Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to validate tool authorization.'
    };
  }
}

/**
 * Helper function to create a standardized error response for tool endpoints
 * Use this when tool authentication fails
 */
export function toolAuthErrorResponse(authResult: ToolAuthResult, status: number = 401) {
  return new Response(
    JSON.stringify({
      error: authResult.error || 'Unauthorized',
      details: 'Tool authentication failed'
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
