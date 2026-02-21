import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid content type' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let name: string;
  let email: string;
  let project: string;

  try {
    const formData = await request.formData();
    name = (formData.get('name') as string)?.trim() ?? '';
    email = (formData.get('email') as string)?.trim() ?? '';
    project = (formData.get('project') as string)?.trim() ?? '';
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid form data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!name || !email) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Name and email are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const toEmail = import.meta.env.CONTACT_TO_EMAIL ?? 'hello@quietatlas.io';
  const fromEmail = import.meta.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const fromName = import.meta.env.RESEND_FROM_NAME ?? 'Quiet Atlas Contact';

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [toEmail],
    replyTo: email,
    subject: `Contact form: ${name}`,
    html: `
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(project || '(No message provided)').replace(/\n/g, '<br>')}</p>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to send message. Please try again or email us directly.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, id: data?.id }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
