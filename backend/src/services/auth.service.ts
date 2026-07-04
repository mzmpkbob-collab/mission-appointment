import { comparePassword } from '../utils/password';
import { generateToken, TokenPayload } from '../utils/jwt';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogRepository } from '../repositories/auditLog.repository';
import { User } from '@prisma/client';
import { hashPassword } from '../utils/password';
import crypto from 'crypto';
import { EmailService } from './email.service';
import { ApiError } from '../utils/ApiError';

export class AuthService {
  private userRepository: UserRepository;
  private auditLogRepository: AuditLogRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.auditLogRepository = new AuditLogRepository();
    this.emailService = new EmailService();
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    // Find user by email
    const user = await this.userRepository.getUserByEmail(email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is active
    if (user.accountStatus !== 'ACTIVE') {
      throw new Error('Account is not active');
    }

    // Verify password - strictly always required
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token with user and role info
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // Update lastLogin timestamp
    await this.userRepository.updateUser(user.id, {
      lastLogin: new Date(),
    });

    // Log the login action to AuditLog
    await this.auditLogRepository.createAuditLog({
      action: 'login',
      module: 'users',
      tableName: 'user',
      recordId: user.id,
      userId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        position: user.position,
        isFirstLogin: user.lastLogin === null
      },
    };
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    // Log the logout action to AuditLog
    await this.auditLogRepository.createAuditLog({
      action: 'logout',
      module: 'users',
      tableName: 'user',
      recordId: userId,
      userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Logged out successfully' };
  }

  async getLoginHistory(userId: string) {
    return await this.auditLogRepository.getLoginLogsByUser(userId);
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      // For security, don't reveal if user exists
      return { message: 'Si cet e-mail est enregistré, vous recevrez un lien de réinitialisation.' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.updateUser(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    await this.emailService.sendPasswordResetEmail(email, token);

    return { message: 'Si cet e-mail est enregistré, vous recevrez un lien de réinitialisation.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.getUserByResetToken(token);
    
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new ApiError('Le lien de réinitialisation est invalide ou a expiré.', 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.userRepository.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return { message: 'Votre mot de passe a été réinitialisé avec succès.' };
  }
}