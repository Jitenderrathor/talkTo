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
    
    // Optimize transcription by passing bilingual prompt to prevent translation bias
    groqFormData.append('prompt', 'Transcribe the audio verbatim. The user may speak in Hindi, English, or Hinglish (mixed Hindi-English). Do not translate Hindi speech to English, transcribe it verbatim in Hindi or Hinglish script.');

    if (language && language !== 'auto') {
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
