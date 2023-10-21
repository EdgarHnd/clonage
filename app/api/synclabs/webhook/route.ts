export async function POST(req: Request) {
  const body = await req.text();
  try {
    console.log('body', body);
  } catch (error) {
    console.log(error);
    return new Response(
      'Webhook handler failed. View your nextjs function logs.',
      {
        status: 400
      }
    );
  }
  return new Response(JSON.stringify({ received: true }));
}
