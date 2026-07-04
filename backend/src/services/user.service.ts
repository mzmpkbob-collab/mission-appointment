import { UserRepository } from "../repositories/user.repository";
import { DepartmentRepository } from "../repositories/department.repository";
import { hashPassword } from "../utils/password";
import { ApiError } from "../utils/ApiError";
import { AvailabilityStatus, Prisma, Role } from "@prisma/client";
import { CreateUserDto, RegisterUserDto, UpdateAvailabilityDto, UpdateUserDto, UserSkillDto } from "../types/user.dto";
import { EmailService } from "./email.service";
import crypto from "crypto";

export class UserService {
    private userRepository: UserRepository;
    private departmentRepository: DepartmentRepository;
    private emailService: EmailService;

    constructor() {
        this.userRepository = new UserRepository();
        this.departmentRepository = new DepartmentRepository();
        this.emailService = new EmailService();
    }

    async registerUser(data: RegisterUserDto) {
        return this.createUser(data);
    }

    async createUser(data: CreateUserDto) {
        // Auto-generate employeeId if not provided
        const employeeId = data.employeeId || await this.generateEmployeeId();
        
        await this.ensureUserUnique(data.email, employeeId);
        
        // Auto-generate password if not provided
        const passwordToHash = data.password || await this.generateRandomPassword();

        // Validate HEAD_OF_DEPARTMENT role constraints
        // Department heads should not have departmentId - they're linked through departmentLed relationship
        if (data.role === Role.HEAD_OF_DEPARTMENT && data.departmentId) {
            throw new ApiError("Users with HEAD_OF_DEPARTMENT role cannot be assigned to a department as regular employees. They should be assigned as department heads via the department's headId field.", 400);
        }

        // Validate department assignment
        if (data.departmentId) {
            const department = await this.departmentRepository.getById(data.departmentId);
            if (!department) {
                throw new ApiError("Department not found", 404);
            }
            if (department.status !== 'ACTIVE') {
                throw new ApiError("Cannot assign user to inactive department", 400);
            }
        }
        
        const hashedPassword = await hashPassword(passwordToHash);

        const createdUser = await this.userRepository.createUser({
            ...data,
            employeeId,
            password: hashedPassword,
        } as Prisma.UserCreateInput);

        // Generate a 24-hour password-setup token and send welcome email
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await this.userRepository.updateUser(createdUser.id, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });
        // Fire-and-forget: don't block the response on email
        this.emailService.sendWelcomeEmail(
            createdUser.email,
            createdUser.firstName,
            resetToken
        ).catch(err => console.error('Welcome email failed:', err));

        return createdUser;
    }

    async getAllUsers() {
        return this.userRepository.getAllUsers();
    }

    async getUserByEmail(email: string) {
        return this.userRepository.getUserByEmail(email);
    }

    async getUserById(id: string) {
        const user = await this.userRepository.getUserById(id);
        if (!user) {
            throw new ApiError("User not found", 404);
        }
        return user;
    }

    async updateUser(id: string, data: UpdateUserDto) {
        const existing = await this.userRepository.getUserById(id);
        if (!existing) {
            throw new ApiError("User not found", 404);
        }

        if (data.email && data.email !== existing.email) {
            const emailExists = await this.userRepository.getUserByEmail(data.email);
            if (emailExists) {
                throw new ApiError("Email already in use", 409);
            }
        }

        if (data.employeeId && data.employeeId !== existing.employeeId) {
            const employeeExists = await this.userRepository.getUserByEmployeeId(data.employeeId);
            if (employeeExists) {
                throw new ApiError("Employee ID already in use", 409);
            }
        }

        // Validate role and department changes
        const newRole = data.role || existing.role;
        let newDepartmentId = data.departmentId !== undefined ? data.departmentId : existing.departmentId;

        // Handle HEAD_OF_DEPARTMENT role transitions
        if (newRole === Role.HEAD_OF_DEPARTMENT) {
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
                throw new ApiError("Department not found", 404);
            }
            if (department.status !== 'ACTIVE') {
                throw new ApiError("Cannot assign user to inactive department", 400);
            }
        }

        // If user is currently head of a department and trying to change role or assign to department
        const departmentLed = existing.departmentLed;
        if (departmentLed !== null && (data.role || data.departmentId)) {
            if (data.role && data.role !== Role.HEAD_OF_DEPARTMENT) {
                throw new ApiError(`User is currently head of department: ${departmentLed.name}. Remove them as department head before changing their role.`, 400);
            }
        }

        const updatePayload = { ...data } as Prisma.UserUpdateInput;

        if (data.password) {
            updatePayload.password = await hashPassword(data.password);
        }

        return this.userRepository.updateUser(id, updatePayload);
    }

    async softDeleteUser(id: string) {
        const existing = await this.userRepository.getUserById(id);
        if (!existing) {
            throw new ApiError("User not found", 404);
        }
        return this.userRepository.softDeleteUser(id);
    }

    async updateAvailability(id: string, availabilityStatus: AvailabilityStatus) {
        await this.getUserById(id);
        return this.userRepository.updateAvailability(id, availabilityStatus);
    }

    async getUserSkills(userId: string) {
        await this.getUserById(userId);
        return this.userRepository.getUserSkills(userId);
    }

    async addUserSkill(userId: string, data: UserSkillDto) {
        await this.getUserById(userId);
        
        // Validate skill name
        if (!data.skillName || data.skillName.trim().length === 0) {
            throw new ApiError("Skill name is required", 400);
        }
        
        if (data.skillName.trim().length > 100) {
            throw new ApiError("Skill name cannot exceed 100 characters", 400);
        }
        
        // Normalize skill name (trim and convert to proper case)
        const normalizedSkillName = data.skillName.trim();
        
        const exists = await this.userRepository.findUserSkillByName(userId, normalizedSkillName);
        if (exists) {
            throw new ApiError("Skill already exists for user", 409);
        }
        
        return this.userRepository.addUserSkill(userId, normalizedSkillName);
    }

    async removeUserSkill(userId: string, skillId: string) {
        await this.getUserById(userId);
        const result = await this.userRepository.removeUserSkill(userId, skillId);
        if (result.count === 0) {
            throw new ApiError("Skill not found for user", 404);
        }
        return { deleted: result.count };
    }

    async bulkUpdateUserSkills(userId: string, skillNames: string[]) {
        await this.getUserById(userId);
        
        // Validate skill names
        const validSkills = skillNames
            .map(name => name.trim())
            .filter(name => name.length > 0 && name.length <= 100)
            .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
        
        if (validSkills.length === 0) {
            throw new ApiError("At least one valid skill name is required", 400);
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

    private async ensureUserUnique(email: string, employeeId: string) {
        const [emailExists, employeeExists] = await Promise.all([
            this.userRepository.getUserByEmail(email),
            this.userRepository.getUserByEmployeeId(employeeId),
        ]);

        if (emailExists) {
            throw new ApiError("User with this email already exists", 409);
        }

        if (employeeExists) {
            throw new ApiError("User with this employee ID already exists", 409);
        }
    }

    private async generateEmployeeId(): Promise<string> {
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

    private async generateRandomPassword(): Promise<string> {
        // Basic 8-character random password
        return Math.random().toString(36).slice(-8) + "!1A"; // ensure it has a special char, number and capital letter
    }
}