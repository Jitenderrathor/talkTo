import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIStructuredNote {
  title: string;
  summary: string;
  takeaways: string[];
  toWorkOn: string[];
}

/**
 * Generate structured note using Gemini API if key is available,
 * otherwise fall back to a high-fidelity local parser.
 */
export async function structureSpeech(
  transcript: string,
  apiKey?: string | null
): Promise<AIStructuredNote> {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    return {
      title: "Empty Recording",
      summary: "No spoken text was recorded in this conversation.",
      takeaways: ["No speech detected", "Make sure microphone permissions are allowed", "Try speaking clearly next time"],
      toWorkOn: ["Check mic settings"]
    };
  }

  // 1. If we have a Gemini API key, use it
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
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
      const parsed = JSON.parse(responseText.trim()) as AIStructuredNote;
      
      // Ensure takeaways has exactly 3 elements (or backfill if necessary)
      while (parsed.takeaways.length < 3) {
        parsed.takeaways.push("Discussed topics from the conversation.");
      }
      if (parsed.takeaways.length > 3) {
        parsed.takeaways = parsed.takeaways.slice(0, 3);
      }

      return parsed;
    } catch (error) {
      console.error("Gemini API structuring failed, falling back to local parser:", error);
      // Fall through to local fallback
    }
  }

  // 2. High-fidelity Local Fallback Parser for Demo/Offline Mode
  return runLocalFallbackParser(cleanTranscript);
}

/**
 * Parses raw text client-side to simulate AI structuring using heuristics.
 */
function runLocalFallbackParser(transcript: string): AIStructuredNote {
  const sentences = transcript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  // Extract a Title
  let title = "Daygame Interaction";
  // Look for "meeting with X", "talked to Y", "conversation with Z", "approached Z"
  const partnerMatch = transcript.match(/(?:talked to|meeting with|conversation with|spoke with|spoke to|chat with|approached|opened)\s+([A-Z][a-z]+|[a-zA-Z]+)/i);
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1];
    title = `Approach with ${name.charAt(0).toUpperCase() + name.slice(1)}`;
  } else if (sentences[0]) {
    // Take first few words of first sentence
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

  // Fallback action items if none found
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

  // Fill in takeaways to guarantee exactly three
  const defaultTakeaways = [
    "Initiated contact successfully and hooked attention.",
    "Identified interest markers and comfort level throughout the talk.",
    "Focused on confident body language and natural conversational flow."
  ];

  while (takeaways.length < 3) {
    takeaways.push(defaultTakeaways[takeaways.length]);
  }

  return {
    title: title.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim(),
    summary,
    takeaways,
    toWorkOn: actionItems.slice(0, 4) // cap at 4 action items
  };
}
