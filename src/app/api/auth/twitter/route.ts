import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Twitter (X) authentication has been disabled.' },
    { status: 410 }
  );
}
