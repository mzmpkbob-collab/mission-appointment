"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_repository_1 = require("../repositories/user.repository");
const department_repository_1 = require("../repositories/department.repository");
const password_1 = require("../utils/password");
const ApiError_1 = require("../utils/ApiError");
const client_1 = require("@prisma/client");
const email_service_1 = require("./email.service");
const crypto_1 = __importDefault(require("crypto"));
class UserService {
    constructor() {
        this.userRepository = new user_repository_1.UserRepository();
        this.departmentRepository = new department_repository_1.DepartmentRepository();
        this.emailService = new email_service_1.EmailService();
    }
    async registerUser(data) {
        return this.createUser(data);
    }
    async createUser(data) {
        // Auto-generate employeeId if not provided
        const employeeId = data.employeeId || await this.generateEmployeeId();
        await this.ensureUserUnique(data.email, employeeId);
        // Auto-generate password if not provided
        const passwordToHash = data.password || await this.generateRandomPassword();
        // Validate HEAD_OF_DEPARTMENT role constraints
        // Department heads should not have departmentId - they're linked through departmentLed relationship
        if (data.role === client_1.Role.HEAD_OF_DEPARTMENT && data.departmentId) {
            throw new ApiError_1.ApiError("Users with HEAD_OF_DEPARTMENT role cannot be assigned to a department as regular employees. They should be assigned as department heads via the department's headId field.", 400);
        }
        // Validate department assignment
        if (data.departmentId) {
            const department = await this.departmentRepository.getById(data.departmentId);
            if (!department) {
                throw new ApiError_1.ApiError("Department not found", 404);
            }
            if (department.status !== 'ACTIVE') {
                throw new ApiError_1.ApiError("Cannot assign user to inactive department", 400);
            }
        }
        const hashedPassword = await (0, password_1.hashPassword)(passwordToHash);
        const createdUser = await this.userRepository.createUser({
            ...data,
            employeeId,
            password: hashedPassword,
        });
        // Generate a 24-hour password-setup token and send welcome email
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await this.userRepository.updateUser(createdUser.id, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });
        // Fire-and-forget: don't block the response on email
        this.emailService.sendWelcomeEmail(createdUser.email, createdUser.firstName, resetToken).catch(err => console.error('Welcome email failed:', err));
        //pushToEmailQueue(createdUser.email, `3afd985d-0003-491e-8175-37548a564639`, {firstName: createdUser.firstName, setupUrl: `${process.env.FRONTEND_URL}/reset-password/${resetToken}` });
        return createdUser;
    }
    async getAllUsers() {
        return this.userRepository.getAllUsers();
    }
    async getUserByEmail(email) {
        return this.userRepository.getUserByEmail(email);
    }
    async getUserById(id) {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new ApiError_1.ApiError("User not found", 404);
        }
        return user;
    }
    async updateUser(id, data) {
        const existing = await this.userRepository.getUserById(id);
        if (!existing) {
            throw new ApiError_1.ApiError("User not found", 404);
        }
        if (data.email && data.email !== existing.email) {
            const emailExists = await this.userRepository.getUserByEmail(data.email);
            if (emailExists) {
                throw new ApiError_1.ApiError("Email already in use", 409);
            }
        }
        if (data.employeeId && data.employeeId !== existing.employeeId) {
            const employeeExists = await this.userRepository.getUserByEmployeeId(data.employeeId);
            if (employeeExists) {
                throw new ApiError_1.ApiError("Employee ID already in use", 409);
            }
        }
        // Validate role and department changes
        const newRole = data.role || existing.role;
        let newDepartmentId = data.departmentId !== undefined ? data.departmentId : existing.departmentId;
        // Handle HEAD_OF_DEPARTMENT role transitions
        if (newRole === client_1.Role.HEAD_OF_DEPARTMENT) {
            // If promoting to HEAD_OF_DEPARTMENT and they have a departmentId, automatically clear it
            if (newDepartmentId) {
                console.log(`Automatically clearing departmentId for user ${id} being promoted to HEAD_OF_DEPARTMENT role`);
                newDepartmentId = null;
                data.departmentId = undefined;
            }
        }
        // Validate department assignment for non-heads
        if (data.departmentId !== undefined && data.departmentId !== null && data.departmentId !== '') {
            // Check if department exists and is active
            const department = await this.departmentRepository.getById(data.departmentId);
            if (!department) {
                throw new ApiError_1.ApiError("Department not found", 404);
            }
            if (department.status !== 'ACTIVE') {
                throw new ApiError_1.ApiError("Cannot assign user to inactive department", 400);
            }
        }
        // If user is currently head of a department and trying to change role or assign to department
        const departmentLed = existing.departmentLed;
        if (departmentLed !== null && (data.role || data.departmentId)) {
            if (data.role && data.role !== client_1.Role.HEAD_OF_DEPARTMENT) {
                throw new ApiError_1.ApiError(`User is currently head of department: ${departmentLed.name}. Remove them as department head before changing their role.`, 400);
            }
        }
        const updatePayload = { ...data };
        if (data.password) {
            updatePayload.password = await (0, password_1.hashPassword)(data.password);
        }
        return this.userRepository.updateUser(id, updatePayload);
    }
    async softDeleteUser(id) {
        const existing = await this.userRepository.getUserById(id);
        if (!existing) {
            throw new ApiError_1.ApiError("User not found", 404);
        }
        return this.userRepository.softDeleteUser(id);
    }
    async updateAvailability(id, availabilityStatus) {
        await this.getUserById(id);
        return this.userRepository.updateAvailability(id, availabilityStatus);
    }
    async getUserSkills(userId) {
        await this.getUserById(userId);
        return this.userRepository.getUserSkills(userId);
    }
    async addUserSkill(userId, data) {
        await this.getUserById(userId);
        // Validate skill name
        if (!data.skillName || data.skillName.trim().length === 0) {
            throw new ApiError_1.ApiError("Skill name is required", 400);
        }
        if (data.skillName.trim().length > 100) {
            throw new ApiError_1.ApiError("Skill name cannot exceed 100 characters", 400);
        }
        // Normalize skill name (trim and convert to proper case)
        const normalizedSkillName = data.skillName.trim();
        const exists = await this.userRepository.findUserSkillByName(userId, normalizedSkillName);
        if (exists) {
            throw new ApiError_1.ApiError("Skill already exists for user", 409);
        }
        return this.userRepository.addUserSkill(userId, normalizedSkillName);
    }
    async removeUserSkill(userId, skillId) {
        await this.getUserById(userId);
        const result = await this.userRepository.removeUserSkill(userId, skillId);
        if (result.count === 0) {
            throw new ApiError_1.ApiError("Skill not found for user", 404);
        }
        return { deleted: result.count };
    }
    async bulkUpdateUserSkills(userId, skillNames) {
        await this.getUserById(userId);
        // Validate skill names
        const validSkills = skillNames
            .map(name => name.trim())
            .filter(name => name.length > 0 && name.length <= 100)
            .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
        if (validSkills.length === 0) {
            throw new ApiError_1.ApiError("At least one valid skill name is required", 400);
        }
        // Get current skills
        const currentSkills = await this.userRepository.getUserSkills(userId);
        const currentSkillNames = currentSkills.map(skill => skill.skillName);
        // Find skills to add and remove
        const skillsToAdd = validSkills.filter(skill => !currentSkillNames.includes(skill));
        const skillsToRemove = currentSkills.filter(skill => !validSkills.includes(skill.skillName));
        // Remove old skills
        for (const skill of skillsToRemove) {
            await this.userRepository.removeUserSkill(userId, skill.id);
        }
        // Add new skills
        for (const skillName of skillsToAdd) {
            await this.userRepository.addUserSkill(userId, skillName);
        }
        return {
            added: skillsToAdd.length,
            removed: skillsToRemove.length,
            total: validSkills.length
        };
    }
    async ensureUserUnique(email, employeeId) {
        const [emailExists, employeeExists] = await Promise.all([
            this.userRepository.getUserByEmail(email),
            this.userRepository.getUserByEmployeeId(employeeId),
        ]);
        if (emailExists) {
            throw new ApiError_1.ApiError("User with this email already exists", 409);
        }
        if (employeeExists) {
            throw new ApiError_1.ApiError("User with this employee ID already exists", 409);
        }
    }
    async generateEmployeeId() {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const employeeId = `EMP${timestamp}${random}`;
        // Check if this ID already exists (very unlikely but possible)
        const existing = await this.userRepository.getUserByEmployeeId(employeeId);
        if (existing) {
            // Recursively generate a new one if collision occurs
            return this.generateEmployeeId();
        }
        return employeeId;
    }
    async generateRandomPassword() {
        // Basic 8-character random password
        return Math.random().toString(36).slice(-8) + "!1A"; // ensure it has a special char, number and capital letter
    }
}
exports.UserService = UserService;
