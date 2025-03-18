// pages/api/ai/textToCad.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model, temperature, maxTokens, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const completion = await anthropic.messages.create({
      model: model || 'claude-3-opus-20240229',
      max_tokens: maxTokens || 4000,
      temperature: temperature || 0.3,
      system: systemPrompt || "You are a CAD design expert. Generate ONLY valid JSON arrays of CAD elements.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract JSON from response
    const content = completion.content[0]?.type === 'text' ? completion.content[0]?.text : '';
    let data;
    
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        data = content;
      }
    } catch (error) {
      console.error('Error parsing JSON from response:', error);
      data = content;
    }

    return res.status(200).json({
      rawResponse: content,
      data,
      success: true,
      usage: {
        promptTokens: completion.usage?.input_tokens || 0,
        completionTokens: completion.usage?.output_tokens || 0,
        totalTokens: (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0)
      }
    });
  } catch (error) {
    console.error('Error processing AI request:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}