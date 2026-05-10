"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
class UserRepository {
    async createUser(data) {
        return prisma_1.prisma.user.create({ data });
    }
    async getUserByEmail(email) {
        return prisma_1.prisma.user.findUnique({
            where: { email },
        });
    }
    async getUserByResetToken(token) {
        return prisma_1.prisma.user.findFirst({
            where: { resetPasswordToken: token },
        });
    }
    async getUserByEmployeeId(employeeId) {
        return prisma_1.prisma.user.findUnique({
            where: { employeeId },
        });
    }
    async getUserById(id) {
        return prisma_1.prisma.user.findUnique({
            where: { id },
            include: {
                department: true,
                departmentLed: true,
                skills: true,
            },
        });
    }
    async getAllUsers() {
        return prisma_1.prisma.user.findMany({
            include: {
                department: true,
                skills: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async updateUser(id, data) {
        return prisma_1.prisma.user.update({
            where: { id },
            data,
        });
    }
    async softDeleteUser(id) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: {
                accountStatus: client_1.AccountStatus.INACTIVE,
                availabilityStatus: client_1.AvailabilityStatus.UNAVAILABLE,
            },
        });
    }
    async updateAvailability(id, availabilityStatus) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: { availabilityStatus },
        });
    }
    async getUserSkills(userId) {
        return prisma_1.prisma.employeeSkill.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    async addUserSkill(userId, skillName) {
        return prisma_1.prisma.employeeSkill.create({
            data: {
                userId,
                skillName,
            },
        });
    }
    async findUserSkillByName(userId, skillName) {
        return prisma_1.prisma.employeeSkill.findFirst({
            where: { userId, skillName },
        });
    }
    async removeUserSkill(userId, skillId) {
        return prisma_1.prisma.employeeSkill.deleteMany({
            where: { id: skillId, userId },
        });
    }
}
exports.UserRepository = UserRepository;
