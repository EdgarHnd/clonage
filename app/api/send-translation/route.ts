import { TranslationEmailTemplate } from '@/components/emails/TranslationEmailTemplate';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_TOKEN);

export async function POST(
  req: Request
) {
  const body = await req.text();
  try {
    const payload = JSON.parse(body);
    console.log('body', payload);
    const { data, error } = await resend.emails.send({
      from: 'clonage <contact@clonage.app>',
      to: [payload.email],
      subject: 'translation completed',
      react: TranslationEmailTemplate({
        translationUrl: payload.translationUrl
      }) as React.ReactElement
    });
    if (error) {
      return NextResponse.json({ error });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}
