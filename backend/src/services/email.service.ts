import https from 'https';
import { ApiError } from '../utils/ApiError';

export class EmailService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SMTP_BREVO_KEY || '';
    if (!this.apiKey) {
      console.warn('WARNING: SMTP_BREVO_KEY is not defined in the environment variables.');
    }
  }

  private getSender() {
    const fromStr = process.env.SMTP_FROM || 'gabvladimirbrenn2@gmail.com';
    const match = fromStr.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) {
      return {
        name: match[1]?.trim() || 'MAS Admin',
        email: match[2]?.trim()
      };
    }
    return {
      name: 'MAS Admin',
      email: fromStr.trim()
    };
  }

  private async sendEmailViaBrevo(to: string, subject: string, htmlContent: string, attachments?: { name: string; content: string }[]) {
    if (!this.apiKey) {
      throw new ApiError('Brevo API key is not configured.', 500);
    }

    const payload = JSON.stringify({
      sender: this.getSender(),
      to: [{ email: to }],
      subject,
      htmlContent,
      ...(attachments && attachments.length > 0 ? { attachment: attachments } : {})
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload)
        },
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            console.error('Brevo API Error Status:', res.statusCode);
            console.error('Brevo API Error Response:', data);
            reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('HTTPS request error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });

      req.write(payload);
      req.end();
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte sur le système MAS.</p>
        <p>Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expirera dans 1 heure.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Réinitialiser mon mot de passe</a>
        </div>
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail. Votre mot de passe restera inchangé.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Ceci est un message automatique, veuillez ne pas y répondre.</p>
      </div>
    `;

    await this.sendEmailViaBrevo(email, 'MAS - Réinitialisation de mot de passe', htmlContent);
  }

  async sendWelcomeEmail(email: string, firstName: string, resetToken: string) {
    const setupUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Welcome to MAS, ${firstName}!</h2>
        <p>Your account has been created by an administrator.</p>
        <p>To get started, please set your password by clicking the button below. This link will expire in <strong>24 hours</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Set My Password</a>
        </div>
        <p style="font-size: 13px; color: #555;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #2563eb; word-break: break-all;">${setupUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">If you did not expect this email, please contact your administrator.</p>
      </div>
    `;

    try {
      await this.sendEmailViaBrevo(email, 'MAS - Welcome! Please set your password', htmlContent);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  async sendMissionOrderEmail(email: string, employeeName: string, missionNumber: string, pdfBuffer: Buffer) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Ordre de mission</h2>
        <p>Bonjour ${employeeName},</p>
        <p>Votre mission sous la référence <strong>${missionNumber}</strong> a été confirmée et approuvée.</p>
        <p>Veuillez trouver ci-joint votre document d'ordre de mission en format PDF.</p>
        <p>Cordialement,</p>
        <p>L'administration MAS</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Ceci est un message automatique, veuillez ne pas y répondre.</p>
      </div>
    `;

    const attachments = [
      {
        name: `mission_order_${missionNumber}.pdf`,
        content: pdfBuffer.toString('base64')
      }
    ];

    await this.sendEmailViaBrevo(
      email,
      `MAS - Mission Order / Ordre de mission - ${missionNumber}`,
      htmlContent,
      attachments
    );
  }
}
