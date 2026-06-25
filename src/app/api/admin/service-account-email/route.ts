import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Returns the service account's client_email so Raj can paste it into
// the Shared Drive's "Manage members" dialog without having to dig
// through Vercel env vars or Google Cloud Console.
//
// Only the email is returned — the private key + other secret fields
// are NOT exposed. The email is by-design semi-public; Google's
// "Share with" / "Add member" dialogs use it as an identifier.

export async function GET() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    return NextResponse.json(
      { error: 'GOOGLE_SERVICE_ACCOUNT_KEY is not set on this environment' },
      { status: 500 }
    );
  }
  try {
    const parsed = JSON.parse(keyJson);
    const email = parsed?.client_email;
    if (!email) {
      return NextResponse.json(
        { error: 'No client_email field found in the service account JSON' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      client_email: email,
      project_id: parsed?.project_id || null,
      note: 'Add this email as a Content Manager on the Shared Drive (or Editor on a specific folder) so the prototype can write transcripts there.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not parse GOOGLE_SERVICE_ACCOUNT_KEY as JSON', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
