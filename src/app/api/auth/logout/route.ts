import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ sucesso: true });
  response.cookies.set('fcx_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}
