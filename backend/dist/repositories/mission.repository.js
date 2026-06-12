"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
class MissionRepository {
    async createMission(data) {
        return prisma_1.prisma.mission.create({
            data,
            include: {
                // missionType: true,
                department: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                assignments: {
                    orderBy: { assignedAt: "desc" },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async getMissionById(id) {
        return prisma_1.prisma.mission.findUnique({
            where: { id },
            include: {
                // missionType: true,
                department: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                assignments: {
                    orderBy: { assignedAt: "desc" },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                                availabilityStatus: true,
                            },
                        },
                        substitutionRequest: true,
                    },
                },
            },
        });
    }
    async getAllMissions(filters) {
        const where = {};
        if (filters?.departmentId)
            where.departmentId = filters.departmentId;
        if (filters?.status)
            where.status = filters.status;
        if (filters?.urgencyLevel)
            where.urgencyLevel = filters.urgencyLevel;
        if (filters?.startDate)
            where.startDate = { gte: new Date(filters.startDate) };
        if (filters?.endDate)
            where.endDate = { lte: new Date(filters.endDate) };
        return prisma_1.prisma.mission.findMany({
            where,
            include: {
                //missionType: true,
                department: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                assignments: {
                    orderBy: { assignedAt: "desc" },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async updateMission(id, data) {
        return prisma_1.prisma.mission.update({
            where: { id },
            data,
            include: {
                //missionType: true,
                department: true,
                assignments: {
                    orderBy: { assignedAt: "desc" },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async deleteMission(id) {
        return prisma_1.prisma.mission.update({
            where: { id },
            data: { status: client_1.MissionStatus.CANCELLED },
        });
    }
    async generateMissionNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        // Find the last mission number for this month
        const lastMission = await prisma_1.prisma.mission.findFirst({
            where: {
                missionNumber: {
                    startsWith: `${year}${month}`,
                },
            },
            orderBy: { missionNumber: "desc" },
        });
        let sequence = 1;
        if (lastMission) {
            const lastSequence = parseInt(lastMission.missionNumber.slice(-4));
            sequence = lastSequence + 1;
        }
        return `${year}${month}${sequence.toString().padStart(4, "0")}`;
    }
    // Get eligible employees for auto-assignment
    async getEligibleEmployees(departmentId, requiredSkills = []) {
        return prisma_1.prisma.user.findMany({
            where: {
                departmentId,
                accountStatus: "ACTIVE",
                availabilityStatus: "AVAILABLE",
                role: { not: "HEAD_OF_DEPARTMENT" }, // Heads don't go on missions as regular employees
            },
            include: {
                skills: true,
                assignments: {
                    include: {
                        mission: true,
                    },
                    orderBy: { assignedAt: "desc" },
                    take: 5, // Last 5 assignments for fairness calculation
                },
            },
        });
    }
}
exports.MissionRepository = MissionRepository;
