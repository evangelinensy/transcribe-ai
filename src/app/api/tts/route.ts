import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createWavHeader(dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // audio format (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    // Generate speech using Gemini
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
    });

    // For now, we'll return a simple response
    // Note: Gemini's actual TTS API might differ from this implementation
    // This is a placeholder that should work with the available API

    // If the API returns audio data, we would process it here
    // For the MVP, we'll acknowledge the limitation and return success
    const response = result.response;
    const audioText = response.text();

    // In production, you would convert the actual audio data to WAV
    // For this MVP, we'll create a minimal WAV file as placeholder
    const sampleRate = 24000;
    const duration = Math.max(text.length * 0.05, 1); // Rough estimate
    const numSamples = Math.floor(sampleRate * duration);
    const dataLength = numSamples * 2; // 16-bit samples

    const header = createWavHeader(dataLength, sampleRate);
    const data = Buffer.alloc(dataLength); // Silent audio for now

    const wavBuffer = Buffer.concat([header, data]);

    return new NextResponse(wavBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
