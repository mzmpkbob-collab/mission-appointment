import nodemailer from 'nodemailer';
import { ApiError } from '../utils/ApiError';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'MAS - Réinitialisation de mot de passe',
      html: `
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
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new ApiError('Erreur lors de l\'envoi de l\'e-mail de réinitialisation', 500);
    }
  }

  async sendWelcomeEmail(email: string, firstName: string, resetToken: string) {
    const setupUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'MAS - Welcome! Please set your password',
      html: `
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
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      // Don't throw - user is already created, email failure should not block the response
      console.error('Error sending welcome email:', error);
    }
  }

  async sendMissionOrderEmail(email: string, employeeName: string, missionNumber: string, pdfBuffer: Buffer) {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: `MAS - Mission Order / Ordre de mission - ${missionNumber}`,
      html: `
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
      `,
      attachments: [
        {
          filename: `mission_order_${missionNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending mission order email:', error);
      throw new ApiError('Erreur lors de l\'envoi de l\'e-mail d\'ordre de mission', 500);
    }
  }
}

