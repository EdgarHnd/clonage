import { Database } from '@/lib/database.types';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
      const supabase = createRouteHandlerClient<Database>({ cookies });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Error exchanging code for session:', error.message);
      }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(requestUrl.origin);
  } catch (error: any) {
    console.error('Error in GET handler:', error.message);
  }
}