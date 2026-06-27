import { Prisma, MissionStatus } from "@prisma/client";
import {prisma} from "../config/prisma";
import { MissionFilterDto } from "../types/mission.dto";

export class MissionRepository {
    async createMission(data: Prisma.MissionCreateInput) {
        return prisma.mission.create({
            data,
            include: {
                // missionType: true,
                department: true,
                payments: true,
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

    async getMissionById(id: string) {
        return prisma.mission.findUnique({
            where: { id },
            include: {
                // missionType: true,
                department: true,
                payments: true,
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

    async getAllMissions(filters?: MissionFilterDto) {
        const where: Prisma.MissionWhereInput = {};

        if (filters?.departmentId) where.departmentId = filters.departmentId;
        if (filters?.status) where.status = filters.status;
        if (filters?.urgencyLevel) where.urgencyLevel = filters.urgencyLevel;
        if (filters?.startDate) where.startDate = { gte: new Date(filters.startDate) };
        if (filters?.endDate) where.endDate = { lte: new Date(filters.endDate) };

        return prisma.mission.findMany({
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

    async updateMission(id: string, data: Prisma.MissionUpdateInput) {
        return prisma.mission.update({
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

    async deleteMission(id: string) {
        return prisma.mission.update({
            where: { id },
            data: { status: MissionStatus.CANCELLED },
        });
    }

    async generateMissionNumber(): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        
        // Find the last mission number for this month
        const lastMission = await prisma.mission.findFirst({
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
    async getEligibleEmployees(departmentId: string, requiredSkills: string[] = []) {
        return prisma.user.findMany({
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