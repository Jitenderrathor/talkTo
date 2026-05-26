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
You are an expert AI note-taking assistant. Your job is to take a raw, spoken speech-to-text transcript and organize it into a highly professional, structured note.

Please output a JSON object containing the following keys:
1. "title": A short, clean, descriptive title for the conversation (max 5-6 words).
2. "summary": A concise narrative paragraph answering: "What conversation did I have with them?" (e.g. context, participants, main topic). Be professional and write in the first person ("I had a conversation with...").
3. "takeaways": An array of EXACTLY three key points or decisions made during the conversation.
4. "toWorkOn": An array of action items or things I need to work on.

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
  let title = "Quick Conversation";
  // Look for "meeting with X", "talked to Y", "conversation with Z"
  const partnerMatch = transcript.match(/(?:talked to|meeting with|conversation with|spoke with|spoke to|chat with)\s+([A-Z][a-z]+|[a-zA-Z]+)/i);
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1];
    title = `Catch-up with ${name.charAt(0).toUpperCase() + name.slice(1)}`;
  } else if (sentences[0]) {
    // Take first few words of first sentence
    const words = sentences[0].split(/\s+/);
    if (words.length > 1) {
      title = words.slice(0, 4).join(" ") + "...";
    }
  }

  // Create Summary
  let summary = `I recorded a conversation where I discussed: "${transcript.length > 120 ? transcript.slice(0, 120) + '...' : transcript}"`;
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1].charAt(0).toUpperCase() + partnerMatch[1].slice(1);
    summary = `I had a conversation with ${name} regarding our recent updates and discussed key topics related to it.`;
  }

  // Extract Action Items (things to work on)
  const actionItems: string[] = [];
  const actionKeywords = [
    "need to", "work on", "have to", "should", "will write", "will call", "will fix", "action item", "todo", "task", "must", "going to"
  ];
  
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (actionKeywords.some(keyword => lower.includes(keyword))) {
      // Clean up the sentence to make it sound like a task
      let task = sentence;
      // Strip out words like "I need to", "I think I should" to make it action-oriented
      task = task.replace(/^I\s+(?:need to|have to|should|must|will)\s+/i, "Work on: ");
      task = task.replace(/^We\s+(?:need to|have to|should|must|will)\s+/i, "Collaborate on: ");
      actionItems.push(task);
    }
  }

  // Fallback action items if none found
  if (actionItems.length === 0) {
    actionItems.push("Follow up on the items mentioned in this conversation.");
    actionItems.push("Identify next steps based on the discussion details.");
  }

  // Extract Takeaways
  const takeaways: string[] = [];
  // Use sentences that are not action items
  const nonActionSentences = sentences.filter(s => !actionItems.includes(s));
  
  for (let i = 0; i < Math.min(3, nonActionSentences.length); i++) {
    takeaways.push(nonActionSentences[i]);
  }

  // Fill in takeaways to guarantee exactly three
  const defaultTakeaways = [
    "Established main context of the conversation and aligned on topics.",
    "Reviewed current progress and identified open questions.",
    "Decided on communication methods and outline of work."
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
