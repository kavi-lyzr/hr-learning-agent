
import crypto from 'crypto';

const SIGNATURE_SECRET = process.env.SIGNATURE_SECRET!;

/**
 * Generates HMAC SHA256 signature for API request/response
 * @param payload - Stringified JSON payload (without signature field)
 * @returns Hex string signature
 */
export function generateApiSignature(payload: string): string {
    return crypto
        .createHmac('sha256', SIGNATURE_SECRET)
        .update(payload)
        .digest('hex');
}

/**
 * Verifies API signature
 * @param payload - Stringified JSON payload (without signature field)
 * @param signature - Signature to verify
 * @returns True if signature is valid
 */
export function verifyApiSignature(payload: string, signature: string): boolean {
    try {
        const expectedSignature = generateApiSignature(payload);

        // Remove any prefix like 'sha256=' if present
        const cleanSignature = signature.replace(/^sha256=/, '');

        // console.log('Signature verification:', {
        //     expected: expectedSignature,
        //     received: cleanSignature,
        //     payloadLength: payload.length,
        //     match: expectedSignature === cleanSignature
        // });

        return expectedSignature === cleanSignature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}
