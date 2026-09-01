import { NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'groq/compound',
];

export async function POST(request: Request) {
  try {
    const { systemPrompt, userPrompt, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    let lastError: string | null = null;
    let lastStatus = 500;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return NextResponse.json(result);
        }

        const errText = await response.text();
        lastError = `Groq (${model}) structuring error: ${errText}`;
        lastStatus = response.status;
        console.warn(`Model ${model} failed, trying next candidate...`, errText);
      } catch (fetchErr: any) {
        lastError = fetchErr.message;
        console.warn(`Model ${model} fetch threw exception:`, fetchErr);
      }
    }

    return NextResponse.json(
      { error: lastError || 'All Groq models failed.' },
      { status: lastStatus }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

