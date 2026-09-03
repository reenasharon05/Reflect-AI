import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  generateReflectionResponse,
  generateContentWithFallback,
  parseGeminiErrorDetails,
  MODEL_LADDER
} from './server/gemini.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // 1. Mount JSON body-parser BEFORE any API routes
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 2. Health check route
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      primaryModel: 'gemini-3.6-flash',
      fallbackLadder: MODEL_LADDER,
      timestamp: new Date().toISOString()
    });
  });

  // 3. Multi-turn reflection & chat API
  app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ error: 'Invalid or missing request body' });
        return;
      }

      const {
        entryTitle = '',
        entryContent = '',
        conversationHistory = [],
        userPrompt,
        mode = 'reflect'
      } = req.body;

      if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
        res.status(400).json({ error: 'userPrompt is required and must be a non-empty string' });
        return;
      }

      if (!Array.isArray(conversationHistory)) {
        res.status(400).json({ error: 'conversationHistory must be an array' });
        return;
      }

      const result = await generateReflectionResponse({
        entryTitle: String(entryTitle).slice(0, 500),
        entryContent: String(entryContent).slice(0, 10000),
        conversationHistory: conversationHistory.map((item: any) => ({
          role: item?.role === 'model' ? 'model' : 'user',
          content: String(item?.content || '').slice(0, 5000)
        })),
        userPrompt: userPrompt.trim().slice(0, 4000),
        mode: ['reflect', 'summarize', 'brainstorm', 'deep_dive', 'chat'].includes(mode) ? mode : 'reflect'
      });

      res.json({
        reply: result.text,
        modelUsed: result.modelUsed
      });
    } catch (err: any) {
      const errDetails = parseGeminiErrorDetails(err);
      console.error('[API /api/chat Error]:', errDetails.message);
      const httpStatus = errDetails.code === 503 || errDetails.isTransient ? 503 : 500;
      res.status(httpStatus).json({
        error: errDetails.isTransient
          ? 'The AI reflection companion is currently experiencing high demand. Please retry in a moment.'
          : (errDetails.message || 'Failed to generate response from Gemini API')
      });
    }
  });

  // 4. Quick Summarize, Tags & Mood Sentiment Analysis API
  app.post('/api/summarize', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ error: 'Invalid or missing request body' });
        return;
      }

      const { content = '', title = '' } = req.body;
      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'content is required for summarization' });
        return;
      }

      const prompt = `Please analyze this journal reflection entry and provide:
1. A concise 2-3 sentence executive summary capturing the core thoughts and key takeaways.
2. 3-5 relevant short theme tags (single words or 2-word phrases).
3. Sentiment & Mood Analysis:
   - "sentimentScore": Numeric score from 1 to 5 (1 = Very Heavy / Negative, 2 = Down / Challenging, 3 = Neutral / Balanced / Reflective, 4 = Positive / Hopeful, 5 = Very Positive / Joyful & Grateful).
   - "sentimentLabel": Category name ("Very Positive", "Positive", "Neutral", "Challenging", "Heavy").
   - "sentimentReasoning": A brief 1-sentence note explaining the mood/tone for the user's self-awareness.

Respond in the following structured JSON format:
{
  "summary": "...",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "sentimentScore": 4,
  "sentimentLabel": "Positive",
  "sentimentReasoning": "Expresses gratitude for personal clarity and calm optimism."
}

Journal Title: "${String(title).slice(0, 300)}"
Journal Content:
"""
${String(content).slice(0, 10000)}
"""`;

      const result = await generateContentWithFallback({
        systemInstruction: 'You are an insightful summarization and empathetic sentiment analysis engine for personal journaling. Your role is purely descriptive for self-awareness. Output valid JSON matching the requested structure.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.3
      });

      let parsed: {
        summary: string;
        tags: string[];
        sentimentScore?: number;
        sentimentLabel?: string;
        sentimentReasoning?: string;
      } = { summary: '', tags: [] };

      try {
        // Strip markdown code fences if present
        let cleanedJson = result.text.trim();
        if (cleanedJson.startsWith('```json')) {
          cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanedJson);
      } catch (parseErr) {
        parsed = {
          summary: result.text,
          tags: ['Reflection', 'Insights'],
          sentimentScore: 3,
          sentimentLabel: 'Neutral',
          sentimentReasoning: 'Balanced reflective thoughts.'
        };
      }

      // Sanitize sentimentScore to ensure it is bounded between 1 and 5
      let rawScore = Number(parsed.sentimentScore);
      if (isNaN(rawScore) || rawScore < 1 || rawScore > 5) {
        rawScore = 3;
      }
      const score = Math.round(rawScore * 10) / 10;

      res.json({
        summary: parsed.summary || result.text,
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['Reflection'],
        sentimentScore: score,
        sentimentLabel: String(parsed.sentimentLabel || 'Neutral').slice(0, 50),
        sentimentReasoning: String(parsed.sentimentReasoning || 'Reflective personal contemplation.').slice(0, 500),
        modelUsed: result.modelUsed
      });
    } catch (err: any) {
      const errDetails = parseGeminiErrorDetails(err);
      console.error('[API /api/summarize Error]:', errDetails.message);
      const httpStatus = errDetails.code === 503 || errDetails.isTransient ? 503 : 500;
      res.status(httpStatus).json({
        error: errDetails.isTransient
          ? 'The AI reflection service is currently experiencing high demand. Please try again shortly.'
          : (errDetails.message || 'Failed to summarize entry')
      });
    }
  });

  // 5. Brainstorming & Thought-Provoking Questions API
  app.post('/api/brainstorm', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ error: 'Invalid or missing request body' });
        return;
      }

      const { content = '', title = '' } = req.body;

      const prompt = `Based on the following journal entry, brainstorm 4 thought-provoking follow-up reflection questions and perspectives to help the author explore their inner self or problem deeper.

Entry Title: "${String(title).slice(0, 300)}"
Content:
"""
${String(content).slice(0, 8000) || '(Fresh new entry - provide inspiring general reflection prompts)'}
"""

Format your response as a JSON array of strings:
["Question 1...", "Question 2...", "Question 3...", "Question 4..."]`;

      const result = await generateContentWithFallback({
        systemInstruction: 'You are a compassionate, Socratic mentor. Output only the requested JSON array of questions.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.8
      });

      let questions: string[] = [];
      try {
        let cleaned = result.text.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        questions = JSON.parse(cleaned);
      } catch {
        questions = [
          'What is the core feeling beneath what you wrote today?',
          'If you looked at this situation from 5 years in the future, what would matter most?',
          'What is one small action or boundary that would bring clarity?',
          'What belief about yourself might you be ready to reconsider?'
        ];
      }

      res.json({
        questions: Array.isArray(questions) ? questions : [],
        modelUsed: result.modelUsed
      });
    } catch (err: any) {
      const errDetails = parseGeminiErrorDetails(err);
      console.error('[API /api/brainstorm Error]:', errDetails.message);
      const httpStatus = errDetails.code === 503 || errDetails.isTransient ? 503 : 500;
      res.status(httpStatus).json({
        error: errDetails.isTransient
          ? 'The AI reflection service is currently experiencing high demand. Please try again shortly.'
          : (errDetails.message || 'Failed to generate brainstorm questions')
      });
    }
  });

  // 6. Maps Config endpoint - Never hardcodes API keys, pulls from env / Secret Manager
  app.get('/api/config/maps', (req: Request, res: Response) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
    res.json({
      apiKey: apiKey ? apiKey.trim() : '',
      configured: Boolean(apiKey && apiKey.trim())
    });
  });

  // 7. Google Places Autocomplete proxy - returns live suggestions with placeName & Place ID
  app.get('/api/places/autocomplete', async (req: Request, res: Response): Promise<void> => {
    try {
      const input = String(req.query.input || req.query.q || '').trim();
      const sessionToken = req.query.sessiontoken ? String(req.query.sessiontoken).trim() : '';

      if (!input) {
        res.json({ predictions: [] });
        return;
      }

      // Cap search query string length for protection against DoS
      const queryStr = input.slice(0, 200);
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';

      if (apiKey) {
        try {
          let gUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            queryStr
          )}&key=${apiKey}&client=aistudio-agent`;
          if (sessionToken) {
            gUrl += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
          }

          const response = await fetch(gUrl);
          const data = await response.json();

          if (data.status === 'OK' && Array.isArray(data.predictions)) {
            const predictions = data.predictions.map((p: any) => {
              const mainText = p.structured_formatting?.main_text || p.description;
              const secondaryText = p.structured_formatting?.secondary_text || '';
              // Format concise, clean primary display name e.g. "Marina Beach, Chennai"
              const primaryCity = secondaryText ? secondaryText.split(',')[0].trim() : '';
              const displayName = primaryCity ? `${mainText}, ${primaryCity}` : mainText;

              return {
                placeId: p.place_id,
                name: displayName,
                description: p.description,
                mainText,
                secondaryText
              };
            });

            res.json({ predictions });
            return;
          }
        } catch (fetchErr) {
          console.warn('[Places Autocomplete Warning]:', fetchErr);
        }
      }

      // Graceful fallback curated suggestions for testing, demo, or before key provisioning
      const samplePlaces = [
        {
          placeId: 'ChIJb_o0kZpnUjoR8lS1aA9lYkM',
          name: 'Marina Beach, Chennai',
          mainText: 'Marina Beach',
          secondaryText: 'Triplicane, Chennai, Tamil Nadu, India',
          description: 'Marina Beach, Triplicane, Chennai, Tamil Nadu, India'
        },
        {
          placeId: 'ChIJ4zGFAZpYwokRGUGph3Oh3Sg',
          name: 'Central Park, New York',
          mainText: 'Central Park',
          secondaryText: 'New York, NY, USA',
          description: 'Central Park, New York, NY, USA'
        },
        {
          placeId: 'ChIJX9X4p82Hj4AReI3r3xXw5iI',
          name: 'Golden Gate Park, San Francisco',
          mainText: 'Golden Gate Park',
          secondaryText: 'San Francisco, CA, USA',
          description: 'Golden Gate Park, San Francisco, CA, USA'
        },
        {
          placeId: 'ChIJ02b9Nn2HGGAR1o9Jq5hM7pA',
          name: 'Kyoto Bamboo Grove, Kyoto',
          mainText: 'Arashiyama Bamboo Grove',
          secondaryText: 'Ukyo Ward, Kyoto, Japan',
          description: 'Arashiyama Bamboo Grove, Ukyo Ward, Kyoto, Japan'
        },
        {
          placeId: 'ChIJL6ZTmqlu5kcR43Q1wGg-7tM',
          name: 'Eiffel Tower, Paris',
          mainText: 'Eiffel Tower',
          secondaryText: 'Champ de Mars, Paris, France',
          description: 'Eiffel Tower, Champ de Mars, Paris, France'
        },
        {
          placeId: 'ChIJF03UfB-FfUgRS_z7N1GvL9Q',
          name: 'Lake District, Cumbria',
          mainText: 'Lake District National Park',
          secondaryText: 'Cumbria, United Kingdom',
          description: 'Lake District National Park, Cumbria, United Kingdom'
        },
        {
          placeId: 'ChIJ1S2dZqW3yUARo_y1bWzV5E8',
          name: 'Marina Bay Sands, Singapore',
          mainText: 'Marina Bay Sands',
          secondaryText: 'Bayfront Avenue, Singapore',
          description: 'Marina Bay Sands, Bayfront Avenue, Singapore'
        },
        {
          placeId: 'ChIJLfyN_GduEmsRuv_2w5z-z1A',
          name: 'Sydney Opera House, Sydney',
          mainText: 'Sydney Opera House',
          secondaryText: 'Bennelong Point, Sydney NSW, Australia',
          description: 'Sydney Opera House, Bennelong Point, Sydney NSW, Australia'
        }
      ];

      const lower = queryStr.toLowerCase();
      const filtered = samplePlaces.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.mainText.toLowerCase().includes(lower) ||
          p.secondaryText.toLowerCase().includes(lower)
      );

      // If user typed something specific not in the pre-baked samples, generate a custom suggestion
      if (filtered.length === 0) {
        const syntheticId = `ChIJ_${Buffer.from(queryStr).toString('base64url').slice(0, 20)}`;
        filtered.push({
          placeId: syntheticId,
          name: queryStr,
          mainText: queryStr,
          secondaryText: 'Place Suggestion',
          description: queryStr
        });
      }

      res.json({ predictions: filtered });
    } catch (err: any) {
      console.error('[API /api/places/autocomplete Error]:', err);
      res.status(500).json({ error: 'Failed to fetch place suggestions' });
    }
  });

  // 8. Geocoding / Reverse geocoding proxy - resolves device location to placeName & Place ID
  app.get('/api/maps/geocode', async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng, q, place_id } = req.query;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';

      // If coordinates are provided (Reverse Geocoding for Device Location)
      if (lat !== undefined && lng !== undefined) {
        const latitude = parseFloat(String(lat));
        const longitude = parseFloat(String(lng));

        // Strict boundary validation against untrusted input
        if (
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          res.status(400).json({
            error: 'Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180]'
          });
          return;
        }

        if (apiKey) {
          try {
            const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&client=aistudio-agent`;
            const response = await fetch(gUrl);
            const data = await response.json();

            if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
              const first = data.results[0];
              let placeName = '';
              let city = '';
              for (const comp of first.address_components || []) {
                if (
                  comp.types.includes('point_of_interest') ||
                  comp.types.includes('establishment')
                ) {
                  placeName = comp.long_name;
                }
                if (comp.types.includes('locality') || comp.types.includes('sublocality')) {
                  city = comp.long_name;
                }
              }

              const primaryDisplay = placeName && city ? `${placeName}, ${city}` : (placeName || city || (first.formatted_address ? first.formatted_address.split(',')[0] : 'Current Location'));

              res.json({
                placeName: primaryDisplay,
                placeId: first.place_id || undefined,
                address: first.formatted_address || ''
              });
              return;
            }
          } catch (fetchErr) {
            console.warn('[Geocoding Proxy Warning]:', fetchErr);
          }
        }

        // Graceful fallback with clean location label (never raw coordinates in placeName)
        res.json({
          placeName: 'Current Device Location',
          placeId: `dev_loc_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`,
          address: 'Approximate device location vicinity'
        });
        return;
      }

      // If place_id or text query is provided
      if (place_id || q) {
        const queryStr = String(place_id || q).trim().slice(0, 200);
        if (apiKey) {
          try {
            const param = place_id ? `place_id=${encodeURIComponent(queryStr)}` : `address=${encodeURIComponent(queryStr)}`;
            const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?${param}&key=${apiKey}&client=aistudio-agent`;
            const response = await fetch(gUrl);
            const data = await response.json();

            if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
              const first = data.results[0];
              res.json({
                placeName: first.formatted_address?.split(',')[0] || queryStr,
                placeId: first.place_id || undefined,
                address: first.formatted_address || queryStr
              });
              return;
            }
          } catch (fetchErr) {
            console.warn('[Geocoding Search Warning]:', fetchErr);
          }
        }

        res.json({
          placeName: queryStr,
          placeId: `place_${encodeURIComponent(queryStr.slice(0, 20))}`,
          address: queryStr
        });
        return;
      }

      res.status(400).json({ error: 'Either (lat, lng) or input query parameter is required' });
    } catch (err: any) {
      console.error('[API /api/maps/geocode Error]:', err);
      res.status(500).json({ error: err?.message || 'Geocoding request failed' });
    }
  });

  // Vite middleware in dev, Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Gemini & Firestore Journal Server running on port ${PORT}`);
  });
}

startServer();
