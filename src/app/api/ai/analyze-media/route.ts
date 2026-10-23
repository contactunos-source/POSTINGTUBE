import { NextRequest, NextResponse } from 'next/server';
import { analyzeMediaAndGenerateCaption, MediaAnalysisOptions } from '@/lib/aiProvider';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MediaAnalysisOptions;

    if (!body || !body.mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Media URL or file is required for analysis' },
        { status: 400 }
      );
    }

    const result = await analyzeMediaAndGenerateCaption(body);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/ai/analyze-media] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to analyze media and generate caption',
      },
      { status: 500 }
    );
  }
}
