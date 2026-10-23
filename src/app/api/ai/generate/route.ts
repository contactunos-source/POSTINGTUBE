import { NextRequest, NextResponse } from 'next/server';
import { generateSocialContent, AiGenerateOptions } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiGenerateOptions;

    if (!body || !body.prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call intelligent generation engine
    const result = await generateSocialContent(body);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[API /api/ai/generate] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate AI content' },
      { status: 500 }
    );
  }
}
