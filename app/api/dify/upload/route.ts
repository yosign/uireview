import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 401 }
      );
    }

    // 转发到 Dify API
    const response = await fetch('https://api.dify.ai/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

