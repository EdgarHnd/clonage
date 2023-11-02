import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { GenerationEmailTemplate } from '@/components/emails/GenerationEmailTemplate';

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
      subject: 'generation completed',
      react: GenerationEmailTemplate({
        generationUrl: payload.generationUrl
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
