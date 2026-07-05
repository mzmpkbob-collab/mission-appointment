"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const user_repository_1 = require("../repositories/user.repository");
const auditLog_repository_1 = require("../repositories/auditLog.repository");
const password_2 = require("../utils/password");
const crypto_1 = __importDefault(require("crypto"));
const email_service_1 = require("./email.service");
const ApiError_1 = require("../utils/ApiError");
class AuthService {
    constructor() {
        this.userRepository = new user_repository_1.UserRepository();
        this.auditLogRepository = new auditLog_repository_1.AuditLogRepository();
        this.emailService = new email_service_1.EmailService();
    }
    async login(email, password, ipAddress, userAgent) {
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
        const isPasswordValid = await (0, password_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        // Generate JWT token with user and role info
        const token = (0, jwt_1.generateToken)({
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
    async logout(userId, ipAddress, userAgent) {
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
    async getLoginHistory(userId) {
        return await this.auditLogRepository.getLoginLogsByUser(userId);
    }
    async forgotPassword(email) {
        const user = await this.userRepository.getUserByEmail(email);
        if (!user) {
            // For security, don't reveal if user exists
            return { message: 'This Email is not registered' };
        }
        // Generate token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour
        await this.userRepository.updateUser(user.id, {
            resetPasswordToken: token,
            resetPasswordExpires: expires,
        });
        await this.emailService.sendPasswordResetEmail(email, token);
        // pushToEmailQueue(email, `3afd985d-0003-491e-8175-37548a564639`, {resetUrl:`${process.env.FRONTEND_URL}/reset-password/${token}` });
        return { message: 'Si cet e-mail est enregistré, vous recevrez un lien de réinitialisation.' };
    }
    async resetPassword(token, newPassword) {
        const user = await this.userRepository.getUserByResetToken(token);
        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            throw new ApiError_1.ApiError('Le lien de réinitialisation est invalide ou a expiré.', 400);
        }
        const hashedPassword = await (0, password_2.hashPassword)(newPassword);
        await this.userRepository.updateUser(user.id, {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        });
        return { message: 'Votre mot de passe a été réinitialisé avec succès.' };
    }
}
exports.AuthService = AuthService;
