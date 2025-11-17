import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface EvaluationResult {
  rubric: {
    problem_framing: number;
    idea_breadth: number;
    systems_thinking: number;
    prioritization: number;
    metrics_discipline: number;
    communication: number;
    velocity_with_rigor: number;
  };
  strengths: string[];
  weaknesses: string[];
  drills: Array<{
    title: string;
    time: number;
    description: string;
  }>;
  narrative: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phase, prompt, transcript, coverageTags, screenshotCount } = body;

    if (!prompt || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, transcript' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const transcriptText = transcript
      .map((msg: { role: string; text: string }) => `${msg.role}: ${msg.text}`)
      .join('\n');

    const coveredTags = Object.keys(coverageTags || {}).filter(tag => coverageTags[tag]);

    const systemInstruction = `You are an expert design interview evaluator. Produce compact JSON with rubric scores (1-5) and improvement drills. Be specific and actionable.

Schema:
{
  "rubric": {
    "problem_framing": 1-5,
    "idea_breadth": 1-5,
    "systems_thinking": 1-5,
    "prioritization": 1-5,
    "metrics_discipline": 1-5,
    "communication": 1-5,
    "velocity_with_rigor": 1-5
  },
  "strengths": [string],
  "weaknesses": [string],
  "drills": [{"title": string, "time": number, "description": string}],
  "narrative": string
}

Strictly adhere to this schema.`;

    const promptText = `Design Prompt: ${prompt}

Transcript:
${transcriptText}

Coverage Tags: ${coveredTags.join(', ') || 'none'}
Screenshot Count: ${screenshotCount || 0}
Final Phase: ${phase || 'unknown'}

Evaluate this design interview performance and provide scores, strengths, weaknesses, practice drills, and a brief narrative summary.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      systemInstruction: systemInstruction,
    });

    const response = result.response;
    const text = response.text();

    try {
      const evaluation: EvaluationResult = JSON.parse(text);
      return NextResponse.json(evaluation);
    } catch (parseError) {
      console.error('Failed to parse evaluation JSON:', parseError);
      return NextResponse.json({
        error: 'Failed to parse evaluation',
        raw: text,
      });
    }
  } catch (error) {
    console.error('Evaluate API error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate interview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
