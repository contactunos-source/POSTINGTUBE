import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Twitter (X) integration has been removed and disabled.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Twitter (X) integration has been removed and disabled.' },
    { status: 410 }
  );
}
