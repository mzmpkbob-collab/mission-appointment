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
    const fromStr = process.env.SMTP_FROM || 'mzmpkbob@gmail.com';
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

  async sendMissionAssignmentEmail(
    email: string,
    employeeName: string,
    missionTitle: string,
    missionNumber: string,
    destination: string,
    startDate: string,
    endDate: string
  ) {
    const assignmentsUrl = `${process.env.FRONTEND_URL}/my-assignments`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #2563eb; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Mission Assignment Notification</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>
          <p>You have been automatically assigned to the following mission. Please review the details and respond at your earliest convenience.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px 14px; font-weight: bold; width: 40%;">Reference No.</td>
              <td style="padding: 10px 14px;">${missionNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold;">Mission Title</td>
              <td style="padding: 10px 14px;">${missionTitle}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px 14px; font-weight: bold;">Destination</td>
              <td style="padding: 10px 14px;">${destination}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold;">Start Date</td>
              <td style="padding: 10px 14px;">${startDate}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px 14px; font-weight: bold;">End Date</td>
              <td style="padding: 10px 14px;">${endDate}</td>
            </tr>
          </table>

          <p>Please log in to the MAS system to <strong>accept</strong> or <strong>decline</strong> this assignment. Your response is required to proceed with mission planning.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${assignmentsUrl}" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
              View My Assignments
            </a>
          </div>

          <p style="font-size: 13px; color: #555;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #2563eb; word-break: break-all;">${assignmentsUrl}</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 0;">
        <p style="font-size: 12px; color: #666; padding: 16px 24px; margin: 0;">This is an automated message from the Mission Appointment System. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await this.sendEmailViaBrevo(email, `MAS - Mission Assignment: ${missionNumber}`, htmlContent);
    } catch (error) {
      console.error('Error sending mission assignment email:', error);
    }
  }

  async sendAssignmentResponseNotification(
    adminEmail: string,
    adminName: string,
    employeeName: string,
    missionTitle: string,
    missionNumber: string,
    action: 'ACCEPTED' | 'DECLINED' | 'SUBSTITUTION_REQUESTED',
    notes?: string
  ) {
    const actionLabels: Record<string, { label: string; color: string; icon: string }> = {
      ACCEPTED: { label: 'Accepted', color: '#16a34a', icon: '✅' },
      DECLINED: { label: 'Declined', color: '#dc2626', icon: '❌' },
      SUBSTITUTION_REQUESTED: { label: 'Requested Substitution', color: '#d97706', icon: '🔄' },
    };

    const { label, color, icon } = actionLabels[action];
    const dashboardUrl = `${process.env.FRONTEND_URL}/missions`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: ${color}; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">${icon} Mission Assignment Update</h2>
        </div>
        <div style="padding: 24px;">
          <p style="margin-top: 0;">Hello <strong>${adminName}</strong>,</p>
          <p>An employee has responded to a mission assignment. Here are the details:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px 14px; font-weight: bold; width: 40%;">Employee</td>
              <td style="padding: 10px 14px;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold;">Mission</td>
              <td style="padding: 10px 14px;">${missionTitle}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px 14px; font-weight: bold;">Reference No.</td>
              <td style="padding: 10px 14px;">${missionNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold;">Action Taken</td>
              <td style="padding: 10px 14px;">
                <span style="background-color: ${color}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 13px; font-weight: bold;">${label}</span>
              </td>
            </tr>
            ${notes ? `
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px 14px; font-weight: bold;">Notes / Reason</td>
              <td style="padding: 10px 14px;">${notes}</td>
            </tr>` : ''}
          </table>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
              Go to Missions Dashboard
            </a>
          </div>
        </div>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 0;">
        <p style="font-size: 12px; color: #666; padding: 16px 24px; margin: 0;">This is an automated message from the Mission Appointment System. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await this.sendEmailViaBrevo(adminEmail, `MAS - Assignment ${label}: ${missionNumber} — ${employeeName}`, htmlContent);
    } catch (error) {
      console.error(`Error sending assignment response notification to ${adminEmail}:`, error);
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
