import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Twitter (X) integration has been disabled.' },
    { status: 410 }
  );
}
