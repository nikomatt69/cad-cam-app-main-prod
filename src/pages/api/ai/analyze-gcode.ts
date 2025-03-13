// pages/api/ai/analyze-gcode.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from 'next-auth/react';
import { requireAuth } from '@/src/lib/api/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  
  const userId = await requireAuth(req, res);
  if (!userId) return;


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { gcode, model = 'claude-3-5-sonnet-20240229', max_tokens = 2000 } = req.body;

    if (!gcode) {
      return res.status(400).json({ message: 'G-code is required' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
    });

    // Build the prompt for G-code analysis
    const prompt = `You are a CNC programming expert analyzing G-code to provide optimization suggestions.

Analyze the following G-code program and identify 3-5 specific improvements:

\`\`\`
${gcode}
\`\`\`

For each suggestion, provide:
1. A clear title
2. A detailed description of the issue or improvement opportunity
3. A snippet of the original code to be modified
4. The improved code suggestion
5. The type of suggestion (optimization, error, or improvement)

Format your response as a JSON array of suggestion objects:
[
  {
    "id": "unique-identifier",
    "title": "Clear, concise suggestion title",
    "description": "Detailed explanation of the issue and benefit of the change",
    "originalCode": "The exact code snippet to be replaced",
    "suggestedCode": "The improved code",
    "type": "optimization | error | improvement"
  }
]

Focus on issues like:
- Missing safety features (tool retractions, spindle stops)
- Redundant or inefficient movements
- Opportunities to consolidate commands
- Missing or unclear comments
- Potential collision risks
- Feed rate or spindle speed optimizations

Only return the JSON array without any additional text or explanation.`;

    const response = await anthropic.messages.create({
      model,
      max_tokens,
      temperature: 0.2, // Lower temperature for more precise analysis
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content;
    // Estrai JSON dalla risposta
    const responseTextString = responseText.join('');
    const jsonMatch = responseTextString.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ message: 'Failed to parse Claude response' });
    }
    try {
      const suggestions = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ suggestions });
    } catch (parseError) {
      console.error('Error parsing JSON from Claude response:', parseError);
      return res.status(500).json({ message: 'Failed to parse suggestions' });
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return res.status(500).json({ message: 'Error analyzing G-code' });
  }
}