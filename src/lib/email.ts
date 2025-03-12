// src/lib/email.ts
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to,
    subject,
    html,
  });
}

interface InvitationEmailProps {
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  role,
  inviteUrl,
  expiresAt
}: InvitationEmailProps): Promise<void> {
  const formattedExpiryDate = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  await sendEmail({
    to,
    subject: `Invitation to join ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .header {
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #0070f3;
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: 500;
            }
            .footer {
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You've been invited to ${organizationName}</h1>
            </div>
            
            <p>Hello,</p>
            
            <p>${inviterName} has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
            
            <p>Click the button below to accept this invitation:</p>
            
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            
            <p>Or copy and paste this URL into your browser:</p>
            <p>${inviteUrl}</p>
            
            <p>This invitation will expire on ${formattedExpiryDate}.</p>
            
            <div class="footer">
              <p>If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
}
