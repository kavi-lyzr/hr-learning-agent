
'use server';

import { generateApiSignature } from './signature';

export async function generateSignatureAction(payload: Record<string, unknown>): Promise<string> {
    try {
        // Convert payload to JSON string for signing
        const payloadString = JSON.stringify(payload);

        // Generate signature using server-side crypto
        const signature = generateApiSignature(payloadString);

        return signature;
    } catch (error) {
        console.error('Error generating signature:', error);
        throw new Error('Failed to generate signature');
    }
}
