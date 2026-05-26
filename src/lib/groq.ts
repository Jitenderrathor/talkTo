import { AIStructuredNote } from './gemini';

/**
 * Transcribe recorded speech audio using Groq's Whisper API.
 */
export async function transcribeSpeech(audioBlob: Blob, apiKey: string): Promise<string> {
  const formData = new FormData();
  
  // Audio blob needs to be appended as a file with a valid extension (e.g., webm)
  const filename = (audioBlob as any).name || 'recording.webm';
  formData.append('file', audioBlob, filename);
  formData.append('model', 'whisper-large-v3-turbo');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to transcribe audio with Groq (Status: ${response.status})`
    );
  }

  const result = await response.json();
  return result.text || '';
}

/**
 * Structure a text transcript into a professional note using Groq's Chat Completions (Llama 3).
 */
export async function structureSpeechWithGroq(
  transcript: string,
  apiKey: string
): Promise<AIStructuredNote> {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    throw new Error('Cannot structure an empty transcript.');
  }

  const systemPrompt = `
You are an expert PUA (Pickup Artist) and Dating Coach assistant. Your job is to analyze a raw conversation transcript of a pickup attempt, approach practice, or interaction sync, and structure it into professional coaching notes.

Please output a JSON object containing the following keys:
1. "title": A short, clean, descriptive title for the interaction (max 5-6 words, e.g., "Daygame approach at mall").
2. "summary": A concise narrative paragraph summarizing the conversation, analyzing the chemistry, dynamics, and progression of the interaction. Focus on openers, hooked points, compliance, and Comfort. Be professional, coaching-oriented, and write in the first person ("I had an interaction with...").
3. "takeaways": An array of EXACTLY three key dynamics, wins, or compliance milestones observed during the interaction (e.g. building comfort, successful teasing, phone number closed).
4. "toWorkOn": An array of action items and specific game improvements I need to work on (e.g. inject more vocal range, practice active listening, smooth transition to flirtatious topics, avoid qualifying too early).

Your output MUST be valid JSON conforming to this schema:
{
  "title": "string",
  "summary": "string",
  "takeaways": ["string", "string", "string"],
  "toWorkOn": ["string", "string"]
}

Do not include any markdown formatting like \`\`\`json or \`\`\` around the JSON. Output only the raw JSON.
`;

  const userPrompt = `Transcript to structure:\n"${cleanTranscript}"`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to structure note with Groq Llama (Status: ${response.status})`
    );
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response received from Groq LLM.');
  }

  const parsed = JSON.parse(content.trim()) as AIStructuredNote;

  // Validate and sanitize takeaways list
  if (!parsed.takeaways || !Array.isArray(parsed.takeaways)) {
    parsed.takeaways = [];
  }
  while (parsed.takeaways.length < 3) {
    parsed.takeaways.push('Discussed key points and aligned on goals.');
  }
  if (parsed.takeaways.length > 3) {
    parsed.takeaways = parsed.takeaways.slice(0, 3);
  }

  if (!parsed.toWorkOn || !Array.isArray(parsed.toWorkOn)) {
    parsed.toWorkOn = [];
  }

  return parsed;
}

/**
 * Generate Text-to-Speech audio from a text string using Groq's Orpheus model.
 */
export async function textToSpeech(
  text: string,
  voice: string,
  apiKey: string
): Promise<Blob> {
  // Orpheus has a character limit (max 200 characters is safe), let's ensure we fit this limit.
  const safeText = text.length > 200 ? text.slice(0, 197) + '...' : text;

  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-v1-english',
      input: safeText,
      voice: voice,
      response_format: 'wav',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to generate TTS audio from Groq (Status: ${response.status})`
    );
  }

  return await response.blob();
}
