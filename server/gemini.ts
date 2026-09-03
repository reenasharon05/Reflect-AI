import { GoogleGenAI } from '@google/genai';

// Initialize SDK lazily
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Fallback Ladder as specified in resilience directive
export const MODEL_LADDER = [
  'gemini-3.6-flash',       // Primary model requested
  'gemini-3.1-flash-lite',   // High-availability fallback
  'gemini-flash-latest',    // Dynamic alias
  'gemini-3.7-flash'        // Deep reasoning fallback
];

export interface GeminiFallbackOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  contents: any;
}

export interface GeminiFallbackResult {
  text: string;
  modelUsed: string;
}

// Safely extract error code and clean message from Google GenAI errors
export function parseGeminiErrorDetails(err: any): {
  code: number;
  message: string;
  isTransient: boolean;
} {
  let code = err?.status || err?.statusCode || 0;
  let message = err?.message || String(err || 'Unknown error');
  let isTransient = false;

  if (typeof message === 'string') {
    const trimmed = message.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.error) {
          if (parsed.error.code) code = Number(parsed.error.code);
          if (parsed.error.message) message = String(parsed.error.message);
          if (parsed.error.status === 'UNAVAILABLE' || code === 503) {
            isTransient = true;
          }
        }
      } catch {
        // Not JSON
      }
    }
  }

  if (
    code === 503 ||
    code === 429 ||
    code === 500 ||
    code === 504 ||
    code === 502 ||
    message.includes('high demand') ||
    message.includes('UNAVAILABLE') ||
    message.includes('Resource has been exhausted') ||
    message.includes('quota')
  ) {
    isTransient = true;
  }

  return { code, message, isTransient };
}

export async function generateContentWithFallback(
  options: GeminiFallbackOptions
): Promise<GeminiFallbackResult> {
  const ai = getGenAI();
  let lastErrorDetails: { code: number; message: string; isTransient: boolean } | null = null;

  for (let i = 0; i < MODEL_LADDER.length; i++) {
    const model = MODEL_LADDER[i];
    try {
      console.log(`[Gemini] Attempting generation with ladder step ${i + 1}/${MODEL_LADDER.length} (${model})`);
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 2048,
        }
      });

      const responseText = response.text;
      if (responseText && responseText.trim().length > 0) {
        if (i > 0) {
          console.log(`[Gemini] Successfully recovered using fallback ladder model: ${model}`);
        }
        return {
          text: responseText.trim(),
          modelUsed: model,
        };
      }
    } catch (err: any) {
      const errDetails = parseGeminiErrorDetails(err);
      lastErrorDetails = errDetails;

      console.log(
        `[Gemini Ladder] Model ${model} returned status ${errDetails.code || 'transient'} (${errDetails.message.slice(0, 120)}). Cascading to next fallback step...`
      );

      // Brief backoff before stepping to high-availability fallback
      if (errDetails.isTransient && i < MODEL_LADDER.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      continue;
    }
  }

  const failureReason = lastErrorDetails?.message || 'High model demand';
  console.error('[Gemini Ladder] All models in fallback ladder failed:', failureReason);
  throw new Error(
    `The AI reflection service is currently experiencing high demand. Please try again in a few moments.`
  );
}

// Helper prompt formatters
export async function generateReflectionResponse(params: {
  entryTitle: string;
  entryContent: string;
  conversationHistory: Array<{ role: 'user' | 'model'; content: string }>;
  userPrompt: string;
  mode?: 'reflect' | 'summarize' | 'brainstorm' | 'deep_dive' | 'chat';
}): Promise<GeminiFallbackResult> {
  const { entryTitle, entryContent, conversationHistory, userPrompt, mode = 'reflect' } = params;

  let modeSpecificInstruction = '';
  if (mode === 'summarize') {
    modeSpecificInstruction = `Synthesize the core themes, emotional tone, and key insights of this journal reflection into a structured, elegant summary. Format with bullet points for key takeaways.`;
  } else if (mode === 'brainstorm') {
    modeSpecificInstruction = `Provide 3-5 thought-provoking reflection prompts, alternative viewpoints, and creative next steps that challenge the author to explore their thoughts deeper.`;
  } else if (mode === 'deep_dive') {
    modeSpecificInstruction = `Perform an empathetic psychological and philosophical deep dive into the underlying motives, beliefs, and emotional subtext behind the author's writing.`;
  } else {
    modeSpecificInstruction = `Be a thoughtful, empathetic, and intellectually curious philosophical companion. Help the author reflect with insightful questions and constructive perspectives.`;
  }

  const systemInstruction = `You are a private, deeply empathetic AI Reflection Companion and Journaling Assistant.
Your purpose is to help the user unpack their thoughts, emotions, dilemmas, and aspirations with compassion, psychological safety, and philosophical clarity.

Guiding Principles:
1. Empathy & Active Listening: Validate feelings first before offering perspectives.
2. Socratic Questioning: Encourage self-discovery rather than giving rigid directives.
3. Clean Formatting: Use Markdown (clear paragraphs, gentle bullet points, bold key insights).
4. Safety & Privacy: Treat all user inputs as confidential personal journal data.

Current Mode Focus:
${modeSpecificInstruction}

Context of current Journal Entry:
Title: "${entryTitle || 'Untitled'}"
Initial Text:
"""
${entryContent || '(No initial text entered yet)'}
"""`;

  // Build multi-turn contents format for GoogleGenAI SDK
  const contents: any[] = [];

  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Add the latest prompt
  contents.push({
    role: 'user',
    parts: [{ text: userPrompt }]
  });

  return generateContentWithFallback({
    systemInstruction,
    contents,
    temperature: 0.75,
  });
}
