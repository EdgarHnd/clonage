import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { GenerationEmailTemplate } from '@/components/emails/GenerationEmailTemplate';

const resend = new Resend(process.env.RESEND_API_TOKEN);

export async function POST(params: { generationUrl: string, email: string }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'clonage <contact@clonage.app>',
      to: [params.email],
      subject: 'generation completed',
      react: GenerationEmailTemplate({
        generationUrl: params.generationUrl,
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
