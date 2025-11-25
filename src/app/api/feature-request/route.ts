import { NextRequest, NextResponse } from 'next/server';
import { generateApiSignature, verifyApiSignature } from '@/lib/actions/signature';

interface FeatureRequestBody {
    title: string;
    description: string;
    name: string;
    email: string;
    appName: string;
    signature?: string;
}

export async function POST(req: NextRequest) {
    try {
        // Parse request body
        const rawBody = await req.text();
        let body: FeatureRequestBody;

        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON format' },
                { status: 400 }
            );
        }

        const { title, description, name, email, appName, signature } = body;

        // Check if signature is present
        if (!signature) {
            return NextResponse.json(
                { error: 'Missing signature in request body' },
                { status: 400 }
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { signature: _sig, ...payloadWithoutSignature } = body;
        const payloadForVerification = JSON.stringify(payloadWithoutSignature);

        const isValidSignature = verifyApiSignature(payloadForVerification, signature);

        if (!isValidSignature) {
            console.error('Signature verification failed:', {
                receivedSignature: signature,
                payloadLength: payloadForVerification.length
            });
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 403 }
            );
        }

        // Validate required fields
        if (!title || !description || !name || !email || !appName) {
            return NextResponse.json(
                { error: 'Missing required fields: title, description, name, email, and appName are all required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Get Slack webhook URL from environment
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;

        if (!webhookUrl) {
            return NextResponse.json(
                { error: 'Server configuration error: Slack webhook URL not configured' },
                { status: 500 }
            );
        }

        // Create formatted Slack message with blocks
        const message = {
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '✨ New Feature Request Received!',
                        emoji: true,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*App:* ${appName}\n *Title:* ${title}`,
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Name:*\n${name}`,
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Email:*\n${email}`,
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Submitted On:*\n${new Date().toLocaleString()}`,
                        },
                    ],
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Feature Description:*\n>${description}`,
                    },
                }
            ],
        };


        // Send message to Slack
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Slack webhook error:', errorText);
            throw new Error(`Failed to send message to Slack: ${response.statusText}`);
        }

        // Generate response with signature
        const responseBody = {
            success: true,
            message: 'Feature request submitted successfully',
        };
        const responseString = JSON.stringify(responseBody);
        const responseSignature = generateApiSignature(responseString);

        return new NextResponse(responseString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'x-signature': responseSignature,
            },
        });
    } catch (error) {
        console.error('Error processing feature request:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const errorBody = {
            error: 'Internal server error',
            message: errorMessage,
        };
        const errorString = JSON.stringify(errorBody);
        const errorSignature = generateApiSignature(errorString);

        return new NextResponse(errorString, {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'x-signature': errorSignature,
            },
        });
    }
}

// Handle unsupported methods
export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Use POST to submit a feature request.' },
        { status: 405 }
    );
}