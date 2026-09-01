import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIStructuredNoteResponse {
  aiNotes: {
    title: string;
    summary: string;
    takeaways: string[];
    toWorkOn: string[];
  };
  transcriptStructured: {
    summary: string;
    conversation: string;
    takeaways: string[];
    toWorkOn: string[];
  };
}

/**
 * Generate structured note using Gemini API if key is available,
 * otherwise fall back to a high-fidelity local parser.
 */
export async function structureSpeech(
  transcript: string,
  apiKey?: string | null
): Promise<AIStructuredNoteResponse> {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    return {
      aiNotes: {
        title: "Empty Recording",
        summary: "No spoken text was recorded in this conversation.",
        takeaways: ["No speech detected", "Make sure microphone permissions are allowed", "Try speaking clearly next time"],
        toWorkOn: ["Check mic settings"]
      },
      transcriptStructured: {
        summary: "No dictation summary.",
        conversation: "",
        takeaways: [],
        toWorkOn: []
      }
    };
  }

  // 1. If we have a Gemini API key, use it
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
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

Transcript to structure:
"${cleanTranscript}"
`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText.trim()) as AIStructuredNoteResponse;
      
      // Ensure takeaways has exactly 3 elements
      if (!parsed.aiNotes.takeaways) parsed.aiNotes.takeaways = [];
      while (parsed.aiNotes.takeaways.length < 3) {
        parsed.aiNotes.takeaways.push("Discussed topics from the conversation.");
      }
      if (parsed.aiNotes.takeaways.length > 3) {
        parsed.aiNotes.takeaways = parsed.aiNotes.takeaways.slice(0, 3);
      }

      if (!parsed.aiNotes.toWorkOn) parsed.aiNotes.toWorkOn = [];
      if (!parsed.transcriptStructured) {
        parsed.transcriptStructured = {
          summary: "",
          conversation: cleanTranscript,
          takeaways: [],
          toWorkOn: []
        };
      }

      return parsed;
    } catch (error) {
      console.error("Gemini API structuring failed, falling back to local parser:", error);
    }
  }

  // 2. High-fidelity Local Fallback Parser for Demo/Offline Mode
  return runLocalFallbackParser(cleanTranscript);
}

/**
 * Parses raw text client-side to simulate AI structuring using heuristics.
 */
function runLocalFallbackParser(transcript: string): AIStructuredNoteResponse {
  const sentences = transcript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  // Extract a Title
  let title = "Daygame Interaction";
  const partnerMatch = transcript.match(/(?:talked to|meeting with|conversation with|spoke with|spoke to|chat with|approached|opened)\s+([A-Z][a-z]+|[a-zA-Z]+)/i);
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1];
    title = `Approach with ${name.charAt(0).toUpperCase() + name.slice(1)}`;
  } else if (sentences[0]) {
    const words = sentences[0].split(/\s+/);
    if (words.length > 1) {
      title = words.slice(0, 4).join(" ") + "...";
    }
  }

  // Create Summary
  let summary = `I analyzed an interaction where the following transpired: "${transcript.length > 120 ? transcript.slice(0, 120) + '...' : transcript}"`;
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1].charAt(0).toUpperCase() + partnerMatch[1].slice(1);
    summary = `I had an interaction with ${name} where I practiced my opening and comfort game. We talked, vibed, and I worked on maintaining eye contact and smooth pacing.`;
  }

  // Extract Action Items (things to work on)
  const actionItems: string[] = [];
  const actionKeywords = [
    "need to", "work on", "have to", "should", "will write", "will call", "will fix", "action item", "todo", "task", "must", "going to", "practice", "improve"
  ];
  
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (actionKeywords.some(keyword => lower.includes(keyword))) {
      let task = sentence;
      task = task.replace(/^I\s+(?:need to|have to|should|must|will)\s+/i, "Work on: ");
      task = task.replace(/^We\s+(?:need to|have to|should|must|will)\s+/i, "Action: ");
      actionItems.push(task);
    }
  }

  if (actionItems.length === 0) {
    actionItems.push("Work on maintaining solid vocal tonality and comfortable eye contact.");
    actionItems.push("Practice smooth transitions from the opener to normal comfort building.");
    actionItems.push("Inject more active teasing and playful banter into the dialogue.");
  }

  // Extract Takeaways
  const takeaways: string[] = [];
  const nonActionSentences = sentences.filter(s => !actionItems.includes(s));
  
  for (let i = 0; i < Math.min(3, nonActionSentences.length); i++) {
    takeaways.push(nonActionSentences[i]);
  }

  const defaultTakeaways = [
    "Initiated contact successfully and hooked attention.",
    "Identified interest markers and comfort level throughout the talk.",
    "Focused on confident body language and natural conversational flow."
  ];

  while (takeaways.length < 3) {
    takeaways.push(defaultTakeaways[takeaways.length]);
  }

  // Attempt to parse explicit dictated sections for the transcript structured block
  // If user dictates "conversation", "takeaways", "things to work on"
  let conversationPart = transcript;
  let dictatedTakeaways: string[] = [];
  let dictatedToWorkOn: string[] = [];

  const lowerTrans = transcript.toLowerCase();
  const takeawaysIndex = lowerTrans.indexOf("takeaways");
  const workOnIndex = lowerTrans.indexOf("things to work on");

  if (takeawaysIndex !== -1 || workOnIndex !== -1) {
    let endOfConv = transcript.length;
    if (takeawaysIndex !== -1) endOfConv = Math.min(endOfConv, takeawaysIndex);
    if (workOnIndex !== -1) endOfConv = Math.min(endOfConv, workOnIndex);

    conversationPart = transcript.substring(0, endOfConv).replace(/conversation:?/i, "").trim();

    if (takeawaysIndex !== -1) {
      const start = takeawaysIndex + "takeaways".length;
      const end = workOnIndex !== -1 && workOnIndex > takeawaysIndex ? workOnIndex : transcript.length;
      const rawPoints = transcript.substring(start, end).split(/[.,;]+|\band\b/i).map(s => s.trim()).filter(s => s.length > 5);
      dictatedTakeaways = rawPoints.length > 0 ? rawPoints : ["User listed takeaways in dictation."];
    }

    if (workOnIndex !== -1) {
      const start = workOnIndex + "things to work on".length;
      const rawPoints = transcript.substring(start).split(/[.,;]+|\band\b/i).map(s => s.trim()).filter(s => s.length > 5);
      dictatedToWorkOn = rawPoints.length > 0 ? rawPoints : ["User listed things to work on in dictation."];
    }
  } else {
    conversationPart = transcript;
    dictatedTakeaways = [takeaways[0]];
    dictatedToWorkOn = [actionItems[0]];
  }

  return {
    aiNotes: {
      title: title.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim(),
      summary,
      takeaways,
      toWorkOn: actionItems.slice(0, 4)
    },
    transcriptStructured: {
      summary: `Cleaned transcription summary of the dictated interaction.`,
      conversation: conversationPart,
      takeaways: dictatedTakeaways,
      toWorkOn: dictatedToWorkOn
    }
  };
}
