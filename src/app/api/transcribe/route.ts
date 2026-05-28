import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const apiKey = formData.get('apiKey') as string;

    if (!file || !apiKey) {
      return NextResponse.json({ error: 'File and API key are required' }, { status: 400 });
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file, 'speech.wav');
    groqFormData.append('model', 'whisper-large-v3');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Groq transcription error: ${errText}` }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
