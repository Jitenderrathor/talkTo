import { AIStructuredNoteResponse } from './gemini';

/**
 * Transcribe recorded speech audio using Groq's Whisper API.
 */
export async function transcribeSpeech(audioBlob: Blob, apiKey: string, language?: string): Promise<string> {
  const formData = new FormData();
  
  // Audio blob needs to be appended as a file with a valid extension (e.g., webm)
  const filename = (audioBlob as any).name || 'recording.webm';
  formData.append('file', audioBlob, filename);
  formData.append('apiKey', apiKey);
  if (language) {
    formData.append('language', language);
  }

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
 * Structure a text transcript into a professional note using Groq's Chat Completions.
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
You are an expert Dating Coach & Conversation Structuring AI assistant.
Your job is to analyze a raw conversation transcript where the user dictates an interaction. The user may speak in Hinglish (a natural mix of Hindi and English), Hindi, or English.

CRITICAL LANGUAGE & SCRIPT RULES:
1. ABSOLUTELY NEVER output Arabic, Urdu, Persian, or any Nastaliq/Arabic-based script under ANY circumstances.
2. All AI Notes (title, summary, takeaways, toWorkOn) MUST be written in clear, fluent, professional English from a dating coach perspective.
3. The conversation transcript (transcriptStructured.conversation) must be formatted in clean, natural English and Romanized Hinglish using ONLY the Latin/English alphabet. If the user spoke Hindi/Hinglish or if any Arabic/Urdu characters appeared in the raw transcript, convert/transliterate them into standard Romanized English/Hinglish.
4. Even if the dictation is brief or hesitant (e.g. testing the mic or unsure what to say), extract insightful conversational analysis, 3 takeaways, and actionable advice to help the user improve.

Please output a JSON object strictly conforming to this schema:
{
  "aiNotes": {
    "title": "A short, sharp English title (max 5-6 words)",
    "summary": "A cohesive narrative paragraph summarizing the conversation and analyzing the chemistry, dynamics, and progression from a coach perspective. Write in the first person ('I analyzed an interaction where...')",
    "takeaways": [
      "Key dynamic or interaction point observed",
      "Second key takeaway",
      "Third key takeaway"
    ],
    "toWorkOn": [
      "Actionable improvement 1",
      "Actionable improvement 2"
    ]
  },
  "transcriptStructured": {
    "summary": "Clean, concise summary in clear English",
    "conversation": "The dictated conversation in clean English / Romanized Hinglish (using only English/Latin alphabet, zero Arabic/Urdu script)",
    "takeaways": [
      "Key points from the conversation"
    ],
    "toWorkOn": [
      "Action items / things to work on"
    ]
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
      errorData.error || `Failed to structure note with Groq AI (Status: ${response.status})`
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
