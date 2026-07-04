import { MissionRepository } from "../repositories/mission.repository";
import { UserRepository } from "../repositories/user.repository";
import { DepartmentRepository } from "../repositories/department.repository";
import { ApiError } from "../utils/ApiError";
import { CreateMissionDto, UpdateMissionDto, MissionFilterDto, AutoAssignmentDto, AssignmentResultDto } from "../types/mission.dto";
import { Prisma, MissionStatus, AssignmentStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import { EmailService } from "./email.service";

export class MissionService {
    private missionRepository: MissionRepository;
    private userRepository: UserRepository;
    private departmentRepository: DepartmentRepository;
    private emailService: EmailService;

    constructor() {
        this.missionRepository = new MissionRepository();
        this.userRepository = new UserRepository();
        this.departmentRepository = new DepartmentRepository();
        this.emailService = new EmailService();
    }

    async createMission(data: CreateMissionDto, createdById: string) {
        // Validate department exists
        const department = await this.departmentRepository.getById(data.departmentId);
        if (!department) {
            throw new ApiError("Department not found", 404);
        }

        // Generate unique mission number
        const missionNumber = await this.missionRepository.generateMissionNumber();

        const missionData: Prisma.MissionCreateInput = {
            missionNumber,
            title: data.title,
            description: data.description,
            destination: data.destination,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            urgencyLevel: data.urgencyLevel || "MEDIUM",
            estimatedBudget: data.estimatedBudget,
            budgetCode: data.budgetCode,
            requiredQualifications: data.requiredQualifications || [],
            // missionType: {
            //     connect: { id: data.missionTypeId },
            // },
            department: {
                connect: { id: data.departmentId },
            },
            createdBy: {
                connect: { id: createdById },
            },
             payments: {
                create: {
                    amount: data.estimatedBudget,
                    // status omitted because default is PENDING
                },
    },
        };

        return this.missionRepository.createMission(missionData);
    }

    async getAllMissions(filters?: MissionFilterDto) {
        return this.missionRepository.getAllMissions(filters);
    }

    async getMissionById(id: string) {
        const mission = await this.missionRepository.getMissionById(id);
        if (!mission) {
            throw new ApiError("Mission not found", 404);
        }
        return mission;
    }

    async updateMission(id: string, data: UpdateMissionDto) {
        await this.getMissionById(id);

        const updateData: Prisma.MissionUpdateInput = {
            ...data,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
        };

        return this.missionRepository.updateMission(id, updateData);
    }

    async deleteMission(id: string) {
        await this.getMissionById(id);
        return this.missionRepository.deleteMission(id);
    }

    // Auto-assignment logic
    async autoAssignMission(data: AutoAssignmentDto): Promise<any> {
        const mission = await this.getMissionById(data.missionId);

        if (mission.status !== MissionStatus.DRAFT && mission.status !== MissionStatus.PENDING_ASSIGNMENT) {
            throw new ApiError("Can only auto-assign missions in DRAFT or PENDING_ASSIGNMENT status", 400);
        }

        // Get all existing assignments for this mission to see who declined / was substituted
        const existingAssignments = await prisma.missionAssignment.findMany({
            where: { missionId: mission.id },
            select: { employeeId: true }
        });
        const excludedEmployeeIds = existingAssignments.map(a => a.employeeId);

        // Find all active employees in the department (excluding head of department)
        const allDeptEmployees = await prisma.user.findMany({
            where: {
                departmentId: mission.departmentId,
                accountStatus: "ACTIVE",
                role: { not: "HEAD_OF_DEPARTMENT" },
            },
            include: {
                skills: true,
                assignments: {
                    include: { mission: true },
                    orderBy: { assignedAt: "desc" },
                    take: 5
                }
            }
        });

        let eligibleEmployees = [];

        // 1. "if someone have attended mission and is only one available in that department system can allow that mission to be assigned to that employee again"
        // If the department only has 1 active non-head employee, we can allow re-assigning them unless they have already declined or been substituted on THIS specific mission.
        const hasDeclinedOrSubstitutedThisMission = allDeptEmployees.length === 1 ? await prisma.missionAssignment.findFirst({
            where: {
                missionId: mission.id,
                employeeId: allDeptEmployees[0]?.id,
                assignmentStatus: { in: ['DECLINED', 'SUBSTITUTED'] }
            }
        }) : null;

        if (allDeptEmployees.length === 1 && !hasDeclinedOrSubstitutedThisMission) {
            eligibleEmployees = allDeptEmployees;
        } else {
            // Otherwise, filter by availabilityStatus: "AVAILABLE" and exclude already assigned/declined ones
            eligibleEmployees = allDeptEmployees.filter(emp => 
                emp.availabilityStatus === "AVAILABLE" && 
                !excludedEmployeeIds.includes(emp.id)
            );
        }

        // 2. If no available employee in department, try relaxing availability status (e.g. check if there's someone active in the department)
        if (eligibleEmployees.length === 0 && allDeptEmployees.length > 0) {
            // Find active employees in department who aren't on leave and haven't already declined/been assigned to this mission
            eligibleEmployees = allDeptEmployees.filter(emp => 
                emp.availabilityStatus !== "ON_LEAVE" && 
                !excludedEmployeeIds.includes(emp.id)
            );
        }

        // 3. If STILL no eligible employees in department:
        // "if there's no person in department also system can take someone from another department but it can provide modal prompt for confirming it to someone who is creating that mission"
        if (eligibleEmployees.length === 0) {
            // Search in other departments
            let otherDeptEmployees = await prisma.user.findMany({
                where: {
                    departmentId: { not: mission.departmentId },
                    accountStatus: "ACTIVE",
                    availabilityStatus: "AVAILABLE",
                    role: { not: "HEAD_OF_DEPARTMENT" },
                    id: { notIn: excludedEmployeeIds }
                },
                include: {
                    skills: true,
                    department: true,
                    assignments: {
                        include: { mission: true },
                        orderBy: { assignedAt: "desc" },
                        take: 5
                    }
                }
            });

            // Fallback: Relax availability constraint for other departments if no strictly AVAILABLE ones are found
            if (otherDeptEmployees.length === 0) {
                otherDeptEmployees = await prisma.user.findMany({
                    where: {
                        departmentId: { not: mission.departmentId },
                        accountStatus: "ACTIVE",
                        availabilityStatus: { not: "ON_LEAVE" },
                        role: { not: "HEAD_OF_DEPARTMENT" },
                        id: { notIn: excludedEmployeeIds }
                    },
                    include: {
                        skills: true,
                        department: true,
                        assignments: {
                            include: { mission: true },
                            orderBy: { assignedAt: "desc" },
                            take: 5
                        }
                    }
                });
            }

            if (otherDeptEmployees.length === 0) {
                return {
                    success: true,
                    assigned: false,
                    message: "No eligible employees found in any department."
                };
            }

            // Calculate scores for other department employees
            const scoredOthers = otherDeptEmployees.map((employee) => {
                const skillScore = this.calculateSkillScore(employee.skills, mission.requiredQualifications);
                const fairnessScore = this.calculateFairnessScore(employee.assignments);
                const totalScore = skillScore * 0.7 + fairnessScore * 0.3;

                return {
                    id: employee.id,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    email: employee.email,
                    departmentName: employee.department?.name || "Other",
                    skills: employee.skills.map(s => s.skillName),
                    score: totalScore
                };
            }).sort((a, b) => b.score - a.score);

            if (!data.allowCrossDepartment) {
                // Return suggested employees for confirmation prompt
                return {
                    success: true,
                    assigned: false,
                    needsConfirmation: true,
                    suggestedEmployees: scoredOthers.slice(0, 3) // Return top 3 suggestions
                };
            } else {
                // If allowed, we take the top one
                const bestEmployee = otherDeptEmployees.find(e => e.id === scoredOthers[0].id);
                if (bestEmployee) {
                    eligibleEmployees = [bestEmployee];
                }
            }
        }

        if (eligibleEmployees.length === 0) {
            return {
                success: true,
                assigned: false,
                message: "No eligible employees found for assignment."
            };
        }

        // Calculate scores for selected employees
        const scoredEmployees = eligibleEmployees.map((employee) => {
            const skillScore = this.calculateSkillScore(employee.skills, mission.requiredQualifications);
            const fairnessScore = this.calculateFairnessScore(employee.assignments);
            const totalScore = skillScore * 0.7 + fairnessScore * 0.3;

            return {
                employee,
                skillScore,
                fairnessScore,
                totalScore,
                assignmentReason: this.generateAssignmentReason(skillScore, fairnessScore),
            };
        });

        // Sort by total score (highest first) and take the requested number
        const maxAssignees = data.maxAssignees || 1;
        const selectedEmployees = scoredEmployees
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, maxAssignees);

        // Create assignments
        const assignments = [];
        for (const scored of selectedEmployees) {
            const assignment = await prisma.missionAssignment.create({
                data: {
                    mission: { connect: { id: mission.id } },
                    employee: { connect: { id: scored.employee.id } },
                    assignmentReason: scored.assignmentReason,
                    fairnessScoreAtAssignment: scored.fairnessScore,
                    assignmentStatus: AssignmentStatus.PENDING,
                },
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
            });

            assignments.push({
                employeeId: assignment.employeeId,
                employee: assignment.employee,
                assignmentReason: assignment.assignmentReason,
                fairnessScore: parseFloat(assignment.fairnessScoreAtAssignment.toString()),
            });
        }

        // Update mission status
        await this.missionRepository.updateMission(mission.id, {
            status: MissionStatus.PENDING_ASSIGNMENT,
        });

        return {
            success: true,
            assigned: true,
            assignments
        };
    }

    // Calculate skill match score (0-100)
    private calculateSkillScore(employeeSkills: any[], requiredSkills: string[]): number {
        if (requiredSkills.length === 0) return 80; // Base score when no specific skills required

        const employeeSkillNames = employeeSkills.map(skill => skill.skillName.toLowerCase());
        const requiredSkillsLower = requiredSkills.map(skill => skill.toLowerCase());

        const matchedSkills = requiredSkillsLower.filter(skill =>
            employeeSkillNames.includes(skill)
        );

        const matchRatio = matchedSkills.length / requiredSkills.length;
        return Math.round(matchRatio * 100);
    }

    // Calculate fairness score based on last missions (0-100, higher = less recent missions)
    private calculateFairnessScore(assignments: any[]): number {
        if (assignments.length === 0) return 100; // Highest score for never assigned

        const now = new Date();
        const recentAssignments = assignments.filter(assignment => {
            const assignedDate = new Date(assignment.assignedAt);
            const daysSince = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 90; // Consider assignments from last 90 days
        });

        if (recentAssignments.length === 0) return 90; // High score for no recent assignments

        // More recent assignments = lower fairness score
        const avgDaysSinceLastAssignment = recentAssignments.reduce((sum, assignment) => {
            const daysSince = (now.getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24);
            return sum + daysSince;
        }, 0) / recentAssignments.length;

        // Convert to score: 90 days = 100 points, 0 days = 0 points
        return Math.max(0, Math.round((avgDaysSinceLastAssignment / 90) * 100));
    }

    // Generate human-readable assignment reason
    private generateAssignmentReason(skillScore: number, fairnessScore: number): string {
        const reasons = [];

        if (skillScore >= 90) {
            reasons.push("Excellent skill match");
        } else if (skillScore >= 70) {
            reasons.push("Good skill match");
        } else if (skillScore >= 50) {
            reasons.push("Adequate skill match");
        } else {
            reasons.push("Basic qualifications met");
        }

        if (fairnessScore >= 80) {
            reasons.push("has not been assigned recently");
        } else if (fairnessScore >= 50) {
            reasons.push("moderate recent assignment history");
        } else {
            reasons.push("recently assigned but available");
        }

        return reasons.join(" and ");
    }

    async getMissionAssignments(missionId: string) {
        await this.getMissionById(missionId);

        return prisma.missionAssignment.findMany({
            where: { missionId },
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
            orderBy: { assignedAt: "desc" },
        });
    }

    // Get assignments for current user (employee view)
    async getUserAssignments(userId: string) {
        return prisma.missionAssignment.findMany({
            where: { 
                employeeId: userId,
                assignmentStatus: { not: 'SUBSTITUTED' }
            },
            include: {
                mission: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
            orderBy: { assignedAt: "desc" },
        });
    }

    // Employee responds to mission assignment
    async respondToAssignment(assignmentId: string, userId: string, response: 'ACCEPTED' | 'DECLINED', notes?: string) {
        const assignment = await prisma.missionAssignment.findUnique({
            where: { id: assignmentId },
            include: { mission: true },
        });

        if (!assignment) {
            throw new ApiError("Assignment not found", 404);
        }

        if (assignment.employeeId !== userId) {
            throw new ApiError("Unauthorized to respond to this assignment", 403);
        }

        if (assignment.assignmentStatus !== 'PENDING') {
            throw new ApiError("Assignment has already been responded to", 400);
        }

        const updatedAssignment = await prisma.missionAssignment.update({
            where: { id: assignmentId },
            data: {
                assignmentStatus: response,
                responseNotes: notes,
                respondedAt: new Date(),
            },
            include: {
                mission: true,
                employee: true,
            },
        });

        // Update mission status if accepted
        if (response === 'ACCEPTED') {
            await prisma.mission.update({
                where: { id: assignment.missionId },
                data: { status: 'ASSIGNED' },
            });
        }

        return updatedAssignment;
    }

    // Approve mission at different approval levels
    async approveMission(missionId: string, userId: string, userRole: string, comments?: string, approvalLevel?: string) {
        const mission = await this.getMissionById(missionId);

        if (!mission) {
            throw new ApiError("Mission not found", 404);
        }

        let newStatus: MissionStatus;

        // Determine next status based on user role and current status
        switch (userRole) {
            case 'HEAD_OF_DEPARTMENT':
            case 'DEPARTMENT_HEAD':
                if (mission.status === 'ASSIGNED') {
                    newStatus = 'IN_APPROVAL';
                } else if (mission.status !== 'IN_APPROVAL') {
                    newStatus = 'IN_APPROVAL'; // Department head can give preliminary approval, but final approval is by finance/director
                } else {
                    throw new ApiError("Mission must be assigned before department head approval", 400);
                }
                break;
            case 'FINANCE':
                if (mission.status === 'IN_APPROVAL') {
                    newStatus = 'APPROVED'; // Simplified: Finance approval leads to approved
                } else {
                    throw new ApiError("Mission must be in approval stage for finance review", 400);
                }
                break;
            case 'HR':
                // HR can approve anytime after assignment
                newStatus = 'APPROVED';
                break;
            case 'DIRECTOR':
                // Director can give final approval
                newStatus = 'APPROVED';
                break;
            case 'ADMIN':
                // Admin can approve at any stage
                newStatus = 'APPROVED';
                break;
            default:
                throw new ApiError("Unauthorized to approve missions", 403);
        }

        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: {
                status: newStatus,
                // You can add an approvals table later to track approval history
            },
            include: {
                department: true,
                createdBy: true,
                assignments: {
                    include: {
                        employee: true,
                    },
                },
            },
        });

        if (newStatus === 'APPROVED') {
            const acceptedAssignments = updatedMission.assignments.filter(
                a => a.assignmentStatus === 'ACCEPTED'
            );

            for (const assignment of acceptedAssignments) {
                try {
                    const pdfBuffer = await this.generateMissionLetter(missionId, assignment.employeeId);
                    await this.emailService.sendMissionOrderEmail(
                        assignment.employee.email,
                        `${assignment.employee.firstName} ${assignment.employee.lastName}`,
                        updatedMission.missionNumber,
                        pdfBuffer
                    );
                } catch (err) {
                    console.error(`Failed to send mission order email to ${assignment.employee.email}:`, err);
                }
            }
        }

        return updatedMission;
    }

    // Reject mission at any approval level
    async rejectMission(missionId: string, userId: string, userRole: string, comments?: string, rejectionReason?: string) {
        const mission = await this.getMissionById(missionId);

        if (!mission) {
            throw new ApiError("Mission not found", 404);
        }

        // Check authorization to reject
        const authorizedRoles = ['HEAD_OF_DEPARTMENT', 'DEPARTMENT_HEAD', 'FINANCE', 'HR', 'DIRECTOR', 'ADMIN'];
        if (!authorizedRoles.includes(userRole)) {
            throw new ApiError("Unauthorized to reject missions", 403);
        }

        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: {
                status: 'REJECTED',
                // You can add a rejections table later to track rejection history and reasons
            },
            include: {
                department: true,
                createdBy: true,
                assignments: {
                    include: {
                        employee: true,
                    },
                },
            },
        });

        return updatedMission;
    }

    // Get missions for current user's department (department head view)
    async getDepartmentMissions(userId: string) {
        // First get the user's department
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        let departmentId: string | undefined;

        // Check if user is head of department
        const headOfDepartment = await prisma.department.findFirst({
            where: { headId: userId }
        });

        if (headOfDepartment) {
            departmentId = headOfDepartment.id;
        } else if (user.departmentId) {
            // If not head, but has department, use their department
            departmentId = user.departmentId;
        } else {
            throw new ApiError("User is not associated with any department", 403);
        }

        return prisma.mission.findMany({
            where: { departmentId },
            include: {
                department: true,
                createdBy: true,
                assignments: {
                    orderBy: { assignedAt: 'desc' },
                    include: {
                        employee: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Employee declines assignment and requests substitution
    async declineWithSubstitution(
        assignmentId: string,
        userId: string,
        reasonCategory: string,
        detailedReason: string,
        supportingDocuments: string[]
    ) {
        const assignment = await prisma.missionAssignment.findUnique({
            where: { id: assignmentId },
            include: { mission: true },
        });

        if (!assignment) {
            throw new ApiError("Assignment not found", 404);
        }

        if (assignment.employeeId !== userId) {
            throw new ApiError("Unauthorized to decline this assignment", 403);
        }

        if (assignment.assignmentStatus !== 'PENDING') {
            throw new ApiError("Assignment has already been responded to", 400);
        }

        // Create substitution request
        const substitutionRequest = await prisma.substitutionRequest.create({
            data: {
                assignment: { connect: { id: assignmentId } },
                employee: { connect: { id: userId } },
                reasonCategory: reasonCategory as any,
                detailedReason,
                supportingDocuments,
                status: 'PENDING',
            },
        });

        // Update assignment status to declined (pending substitution approval)
        const updatedAssignment = await prisma.missionAssignment.update({
            where: { id: assignmentId },
            data: {
                assignmentStatus: 'DECLINED',
                responseNotes: `Substitution requested: ${detailedReason}`,
                respondedAt: new Date(),
            },
            include: {
                mission: true,
                employee: true,
                substitutionRequest: true,
            },
        });

        return {
            assignment: updatedAssignment,
            substitutionRequest,
        };
    }

    // Process (approve/reject) a substitution request
    async processSubstitutionRequest(
        requestId: string,
        userId: string,
        userRole: string,
        status: 'APPROVED' | 'REJECTED',
        reviewerComments?: string
    ) {
        const substitutionRequest = await prisma.substitutionRequest.findUnique({
            where: { id: requestId },
            include: {
                assignment: {
                    include: {
                        mission: true,
                        employee: true,
                    },
                },
            },
        });

        if (!substitutionRequest) {
            throw new ApiError("Substitution request not found", 404);
        }

        if (substitutionRequest.status !== 'PENDING') {
            throw new ApiError("Substitution request has already been processed", 400);
        }

        // Check authorization (HR, Department Head, Director, Admin)
        const authorizedRoles = ['HEAD_OF_DEPARTMENT', 'DEPARTMENT_HEAD', 'HR', 'DIRECTOR', 'ADMIN'];
        if (!authorizedRoles.includes(userRole)) {
            throw new ApiError("Unauthorized to process substitution requests", 403);
        }

        // Update substitution request
        const updatedRequest = await prisma.substitutionRequest.update({
            where: { id: requestId },
            data: {
                status,
                reviewerComments,
                reviewedAt: new Date(),
            },
        });

        // Update assignment based on decision
        let autoAssignResult: any = null;
        if (status === 'APPROVED') {
            // Mark original assignment as substituted
            await prisma.missionAssignment.update({
                where: { id: substitutionRequest.assignmentId },
                data: {
                    assignmentStatus: 'SUBSTITUTED',
                },
            });

            // Update mission status to pending assignment for re-assignment
            await prisma.mission.update({
                where: { id: substitutionRequest.assignment.missionId },
                data: {
                    status: 'PENDING_ASSIGNMENT',
                },
            });

            // Automatically attempt auto-assignment!
            try {
                autoAssignResult = await this.autoAssignMission({
                    missionId: substitutionRequest.assignment.missionId,
                    maxAssignees: 1
                });
            } catch (assignErr) {
                console.error("Auto-assignment failed during substitution approval:", assignErr);
                autoAssignResult = {
                    success: false,
                    message: assignErr instanceof Error ? assignErr.message : "Auto-assignment failed."
                };
            }
        } else {
            // Rejected - revert assignment to pending
            await prisma.missionAssignment.update({
                where: { id: substitutionRequest.assignmentId },
                data: {
                    assignmentStatus: 'PENDING',
                    respondedAt: null,
                    responseNotes: `Substitution rejected: ${reviewerComments || 'Request denied by reviewer'}`,
                },
            });
        }

        const result = {
            id: updatedRequest.id,
            reasonCategory: updatedRequest.reasonCategory,
            detailedReason: updatedRequest.detailedReason,
            supportingDocuments: updatedRequest.supportingDocuments,
            status: updatedRequest.status,
            reviewerComments: updatedRequest.reviewerComments,
            reviewedAt: updatedRequest.reviewedAt,
            assignmentId: updatedRequest.assignmentId,
            employeeId: updatedRequest.employeeId,
            createdAt: updatedRequest.createdAt,
            updatedAt: updatedRequest.updatedAt,
            autoAssignResult
        };

        return result;
    }

    // Get substitution requests (all for managers, own for employees)
    async getSubstitutionRequests(userId: string, userRole: string, status?: string) {
        const whereClause: any = {};

        // Employees can only see their own requests
        if (userRole === 'EMPLOYEE') {
            whereClause.employeeId = userId;
        }

        // Filter by status if provided
        if (status) {
            whereClause.status = status;
        }

        return prisma.substitutionRequest.findMany({
            where: whereClause,
            include: {
                assignment: {
                    include: {
                        mission: {
                            include: {
                                department: true,
                            },
                        },
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                employeeId: true,
                            },
                        },
                    },
                },
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeId: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get a specific substitution request by ID
    async getSubstitutionRequestById(requestId: string, userId: string, userRole: string) {
        const request = await prisma.substitutionRequest.findUnique({
            where: { id: requestId },
            include: {
                assignment: {
                    include: {
                        mission: {
                            include: {
                                department: true,
                            },
                        },
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                employeeId: true,
                            },
                        },
                    },
                },
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        employeeId: true,
                    },
                },
            },
        });

        if (!request) {
            throw new ApiError("Substitution request not found", 404);
        }

        // Check authorization
        if (userRole === 'EMPLOYEE' && request.employeeId !== userId) {
            throw new ApiError("Unauthorized to view this request", 403);
        }

        return request;
    }

    // Get substitution assignments for current user
    async getMySubstitutionAssignments(userId: string) {
        return prisma.missionAssignment.findMany({
            where: {
                employeeId: userId,
                isSubstitution: true,
            },
            include: {
                mission: {
                    include: {
                        department: true,
                    },
                },
                originalAssignment: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                employeeId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { assignedAt: 'desc' },
        });
    }

    async submitMissionReport(missionId: string, userId: string, activityReport: string) {
        const mission = await this.getMissionById(missionId);

        if (!mission) {
            throw new ApiError("Mission not found", 404);
        }

        // Create the report
        return prisma.missionReport.create({
            data: {
                missionId,
                employeeId: userId,
                activityReport,
                status: 'SUBMITTED',
                submittedAt: new Date(),
            }
        });
    }

    async getMissionReport(missionId: string) {
        return prisma.missionReport.findFirst({
            where: { missionId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async generateMissionLetter(missionId: string, userId: string): Promise<Buffer> {
        const mission = await this.getMissionById(missionId);

        if (!mission) {
            throw new ApiError("Mission not found", 404);
        }

        // We only allow downloading if the mission is approved or further along
        if (!['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(mission.status)) {
            throw new ApiError("Mission is not approved yet", 400);
        }

        // Find the specific assignment for this user
        let assignment = mission.assignments.find(a => a.employeeId === userId);

        // If the user isn't assigned, maybe they are a manager/admin. Just take the first valid assignment for the letter.
        if (!assignment) {
            assignment = mission.assignments.find(a => ['ACCEPTED', 'SUBSTITUTED', 'PENDING'].includes(a.assignmentStatus));
        }

        if (!assignment) {
            throw new ApiError("No valid assignment found for this mission", 400);
        }

        const employee = assignment.employee;

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // --- Header ---
                const logoPaths = [
                    path.join(__dirname, '../assets/Logo_RNP_Burundi.png'),
                    path.join(__dirname, '../../src/assets/Logo_RNP_Burundi.png'),
                    path.join(process.cwd(), 'src/assets/Logo_RNP_Burundi.png'),
                    path.join(process.cwd(), 'backend/src/assets/Logo_RNP_Burundi.png')
                ];
                let logoPath = '';
                for (const p of logoPaths) {
                    if (fs.existsSync(p)) {
                        logoPath = p;
                        break;
                    }
                }
                if (logoPath) {
                    doc.image(logoPath, 267, 30, { width: 60 });
                    doc.y = 100;
                }

                doc.font('Helvetica-Bold')
                    .fontSize(16)
                    .text('MISSION APPOINTMENT SYSTEM', { align: 'center' });

                doc.fontSize(12)
                    .text('MINISTRY OF PUBLIC SERVICE', { align: 'center' });

                doc.moveDown();
                doc.text(mission.department.name.toUpperCase(), { align: 'center' });

                doc.moveDown(2);

                // Line separator
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(2);

                // --- Title ---
                doc.font('Helvetica-Bold')
                    .fontSize(18)
                    .text('MISSION ORDER', { align: 'center', underline: true });

                doc.moveDown(2);

                // --- Content ---
                doc.font('Helvetica')
                    .fontSize(12);

                doc.text(`Reference No: `, { continued: true }).font('Helvetica-Bold').text(`${mission.missionNumber}`);
                doc.font('Helvetica').moveDown(1.5);

                const startDate = new Date(mission.startDate).toLocaleDateString('en-GB');
                const endDate = new Date(mission.endDate).toLocaleDateString('en-GB');
                const duration = Math.ceil((new Date(mission.endDate).getTime() - new Date(mission.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;

                doc.font('Helvetica').text('The Director General / Authorizing Officer hereby authorizes the following employee to proceed on official duty:', { align: 'justify' });
                doc.moveDown(1);

                doc.font('Helvetica-Bold').text(`${employee.firstName} ${employee.lastName}`, { indent: 20 });
                doc.font('Helvetica').text(`${employee.role}, ${mission.department.name}`, { indent: 20 });

                doc.moveDown(1);
                doc.font('Helvetica').text(`The employee is directed to travel to `, { continued: true, align: 'justify' })
                    .font('Helvetica-Bold').text(`${mission.destination}`, { continued: true })
                    .font('Helvetica').text(` for the purpose of executing the mission titled: `, { continued: true })
                    .font('Helvetica-Bold').text(`"${mission.title}"`, { continued: true })
                    .font('Helvetica').text(`. The scope of this mission entails: ${mission.description}`);

                doc.moveDown(1);
                doc.text(`This official mission is scheduled to commence on `, { continued: true, align: 'justify' })
                    .font('Helvetica-Bold').text(`${startDate}`, { continued: true })
                    .font('Helvetica').text(` and will conclude on `, { continued: true })
                    .font('Helvetica-Bold').text(`${endDate}`, { continued: true })
                    .font('Helvetica').text(`, spanning a total duration of `, { continued: true })
                    .font('Helvetica-Bold').text(`${duration} days`, { continued: true })
                    .font('Helvetica').text(`.`);

                doc.moveDown(1);
                const dailyBudget = (parseFloat(mission.estimatedBudget.toString()) / duration).toFixed(2);
                doc.text(`The authorized estimated budget for this mission is `, { continued: true, align: 'justify' })
                    .font('Helvetica-Bold').text(`${mission.estimatedBudget} BIF (approx. ${dailyBudget} BIF/day) `, { continued: true })
                    .font('Helvetica').text(` which will be fully covered by the institution's designated funds.`);

                doc.moveDown(3);

                // --- Footer / Signature ---
                const currentDate = new Date().toLocaleDateString('en-GB');
                doc.font('Helvetica').text(`Done in Bujumbura, on ${currentDate}`, { align: 'right' });

                doc.moveDown(1.5);

                const signatureY = doc.y;
                doc.rect(345, signatureY, 200, 80).strokeColor('#0F5A3C').lineWidth(1.5).stroke();

                doc.fillColor('#0F5A3C')
                    .font('Helvetica-Bold')
                    .fontSize(9)
                    .text('DIGITALLY SIGNED & VERIFIED', 350, signatureY + 8, { width: 190, align: 'center' });

                doc.fillColor('#2D3748')
                    .font('Helvetica')
                    .fontSize(8)
                    .text('Authorizing Authority: Ministry of Public Service', 350, signatureY + 22, { width: 190 })
                    .text(`Sign Date: ${currentDate}`, 350, signatureY + 34, { width: 190 })
                    .text(`Doc Ref: ${mission.missionNumber}`, 350, signatureY + 46, { width: 190 })
                    .text('Verification Code: RNP-SECURE-' + mission.id.substring(0, 8).toUpperCase(), 350, signatureY + 58, { width: 190 });

                doc.fillColor('#000000'); // Reset color

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}
