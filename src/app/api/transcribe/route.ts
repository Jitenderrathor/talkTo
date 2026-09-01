import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const apiKey = formData.get('apiKey') as string;

    const language = formData.get('language') as string;

    if (!file || !apiKey) {
      return NextResponse.json({ error: 'File and API key are required' }, { status: 400 });
    }

    const groqFormData = new FormData();
    
    // Dynamically detect extension from MIME type to avoid Groq decoding failures
    const mimeType = file.type || '';
    let extension = 'webm';
    if (mimeType.includes('wav')) {
      extension = 'wav';
    } else if (mimeType.includes('mp3')) {
      extension = 'mp3';
    } else if (mimeType.includes('m4a')) {
      extension = 'm4a';
    } else if (mimeType.includes('mpeg')) {
      extension = 'mp3';
    } else if (mimeType.includes('ogg')) {
      extension = 'ogg';
    }
    
    groqFormData.append('file', file, `speech.${extension}`);
    groqFormData.append('model', 'whisper-large-v3');
    
    // Optimize transcription by passing bilingual Hinglish prompt to preserve mixed vocabulary and prevent translation
    groqFormData.append(
      'prompt',
      'Transcribe speech verbatim. The speaker may use Hinglish (a natural mix of Hindi and English words, e.g., "maine direct approach kiya aur compliment diya", "vocal tonality acchi thi", "comfort build hua", "Instagram exchange kiya"). Transcribe verbatim in Romanized Hinglish or original spoken phrasing. Do not translate Hindi or Hinglish speech to English.'
    );

    if (language && language !== 'auto' && language !== 'hinglish') {
      groqFormData.append('language', language);
    }

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
