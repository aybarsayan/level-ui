import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );

  // Auth token'ı sil
  response.cookies.delete('auth_token');

  return response;
} 