import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = request.headers.get('x-api-key');
    const endpoint = request.headers.get('x-api-endpoint') || 'https://api.dify.ai/v1/chat-messages';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 401 }
      );
    }

    // 转发到 Dify API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Generate failed' },
      { status: 500 }
    );
  }
}

