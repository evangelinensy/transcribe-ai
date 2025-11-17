import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phase, prompt, transcript, coverageTags, screenshotCount } = body;

    // Validate required fields
    if (!phase || !prompt || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: phase, prompt, transcript' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build context from transcript
    const transcriptText = transcript
      .map((msg: { role: string; text: string }) => `${msg.role}: ${msg.text}`)
      .join('\n');

    // Identify missing coverage tags
    const allTags = ['framing', 'constraints', 'users', 'ideation', 'systems', 'metrics', 'accessibility'];
    const coveredTags = Object.keys(coverageTags || {}).filter(tag => coverageTags[tag]);
    const missingTags = allTags.filter(tag => !coveredTags.includes(tag));

    const systemInstruction = `You are a product design challenge coach. Guide without dictating solutions. Enforce current phase: ${phase}. Keep the single strong constraint central. Probe for: problem framing, constraints, users, ideation breadth, systems thinking, metrics, accessibility. Prefer questions over advice. Return a short nudge (<= 2 sentences). Escalate specificity when the user stalls.`;

    const promptText = `Design Prompt: ${prompt}

Current Phase: ${phase}
Screenshot Count: ${screenshotCount || 0}
Covered Topics: ${coveredTags.join(', ') || 'none'}
Missing Topics: ${missingTags.join(', ') || 'none'}

Transcript:
${transcriptText}

Provide a coaching nudge (max 2 sentences) that guides the designer without dictating solutions. Focus on the current phase and missing coverage areas.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      systemInstruction: systemInstruction,
    });

    const response = result.response;
    const nudge = response.text();

    // Build coverage nudge if there are missing tags
    let coverageNudge;
    if (missingTags.length > 0) {
      coverageNudge = `You're missing: ${missingTags.join(', ')}.`;
    }

    return NextResponse.json({ nudge, coverageNudge });
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate coaching nudge', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
