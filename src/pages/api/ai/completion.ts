// pages/api/ai/completion.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from 'next-auth/react';
import { requireAuth } from '@/src/lib/api/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { prompt, model = 'claude-3-5-sonnet-20240229', temperature = 0.3, max_tokens = 100 } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const completion = response.content[0].type === 'text' ? response.content[0].text : '';
    return res.status(200).json({ completion });
  } catch (error) {
    console.error('Errore nella chiamata API Claude:', error);
    return res.status(500).json({ message: 'Errore nella generazione del completamento' });
  }
}