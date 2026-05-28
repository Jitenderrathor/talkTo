import { AIStructuredNoteResponse } from './gemini';

/**
 * Transcribe recorded speech audio using Groq's Whisper API.
 */
export async function transcribeSpeech(audioBlob: Blob, apiKey: string): Promise<string> {
  const formData = new FormData();
  
  // Audio blob needs to be appended as a file with a valid extension (e.g., webm)
  const filename = (audioBlob as any).name || 'recording.webm';
  formData.append('file', audioBlob, filename);
  formData.append('apiKey', apiKey);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to transcribe audio with Groq (Status: ${response.status})`
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
): Promise<AIStructuredNoteResponse> {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    throw new Error('Cannot structure an empty transcript.');
  }

  const systemPrompt = `
You are an expert PUA (Pickup Artist) and Dating Coach assistant.
Your job is to analyze a raw conversation transcript where the user dictates an interaction. The user may speak in Hindi, English, or a mix of both (Hinglish).

Please output a JSON object containing two main keys:
1. "aiNotes": An object containing the AI dating coach's structured notes based on the interaction. Focus on openers, hooked points, comfort-building, compliance, chemistry, and actionable improvements.
   - "title": A short, clean, descriptive title for the interaction (max 5-6 words, e.g., "Daygame approach at mall").
   - "summary": A concise narrative paragraph summarizing the conversation and analyzing the chemistry, dynamics, and progression from a coach's perspective. Write in the first person ("I analyzed an interaction where...").
   - "takeaways": An array of EXACTLY three key compliance points or dynamics observed (e.g., hook achieved, comfort established, number closed).
   - "toWorkOn": An array of specific improvements the user should work on (e.g., vocal range, teasing).
2. "transcriptStructured": An object containing the exact transcription sections as dictated by the user, checked ONLY for spelling typos and critical grammatical issues.
   CRITICAL REQUIREMENT: For "transcriptStructured.conversation", DO NOT rewrite, paraphrase, summarize, or translate the user's spoken words. Preserve their exact words, phrasing, vocabulary, tone, and language (whether Hindi, English, or Hinglish) 100% verbatim. Fix ONLY spelling errors or minor grammatical issues. If there are no issues, keep the text completely untouched.
   For sections inside "transcriptStructured":
   - "summary": A brief, faithful summary of what they dictated (preserving the user's original language, tone, and vocabulary; only correcting spelling/typos).
   - "conversation": The segment representing the conversation description, completely verbatim except for spelling/grammar fixes.
   - "takeaways": Extract any takeaways or key points the user spoke about. If explicitly dictated (e.g., after the word "takeaways"), list those points. If not explicitly dictated but discussed, extract them using the user's exact phrasing and language as closely as possible, only correcting spelling/grammar.
   - "toWorkOn": Extract any action items or things to work on the user spoke about. If explicitly dictated (e.g., after "things to work on"), list them. If not explicitly dictated but discussed, extract them using the user's exact phrasing and language as closely as possible, only correcting spelling/grammar.

Your output MUST be valid JSON conforming to this schema:
{
  "aiNotes": {
    "title": "string",
    "summary": "string",
    "takeaways": ["string", "string", "string"],
    "toWorkOn": ["string", "string"]
  },
  "transcriptStructured": {
    "summary": "string",
    "conversation": "string",
    "takeaways": ["string", "string"],
    "toWorkOn": ["string", "string"]
  }
}

Do not include any markdown formatting like \`\`\`json or \`\`\` around the JSON. Output only the raw JSON.
`;

  const userPrompt = `Transcript to structure:\n"${cleanTranscript}"`;

  const response = await fetch('/api/structure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      apiKey,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to structure note with Groq Llama (Status: ${response.status})`
    );
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response received from Groq LLM.');
  }

  const parsed = JSON.parse(content.trim()) as AIStructuredNoteResponse;

  // Validate and sanitize aiNotes takeaways list
  if (!parsed.aiNotes) {
    parsed.aiNotes = {
      title: "Interaction Notes",
      summary: "Could not parse AI notes.",
      takeaways: [],
      toWorkOn: []
    };
  }
  if (!parsed.aiNotes.takeaways || !Array.isArray(parsed.aiNotes.takeaways)) {
    parsed.aiNotes.takeaways = [];
  }
  while (parsed.aiNotes.takeaways.length < 3) {
    parsed.aiNotes.takeaways.push('Discussed key points and aligned on goals.');
  }
  if (parsed.aiNotes.takeaways.length > 3) {
    parsed.aiNotes.takeaways = parsed.aiNotes.takeaways.slice(0, 3);
  }

  if (!parsed.aiNotes.toWorkOn || !Array.isArray(parsed.aiNotes.toWorkOn)) {
    parsed.aiNotes.toWorkOn = [];
  }

  if (!parsed.transcriptStructured) {
    parsed.transcriptStructured = {
      summary: "",
      conversation: cleanTranscript,
      takeaways: [],
      toWorkOn: []
    };
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

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: safeText,
      voice: voice,
      apiKey: apiKey,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to generate TTS audio from Groq (Status: ${response.status})`
    );
  }

  return await response.blob();
}
