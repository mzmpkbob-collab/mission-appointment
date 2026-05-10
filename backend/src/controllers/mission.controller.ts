import { Request, Response, NextFunction } from "express";
import { MissionService } from "../services/mission.service";
import { ApiResponseHelper } from "../utils/response";
import { AuthenticatedRequest } from "../middleware/auth";
import { CreateMissionDto, UpdateMissionDto, MissionFilterDto, AutoAssignmentDto } from "../types/mission.dto";

export class MissionController {
    private missionService: MissionService;

    constructor() {
        this.missionService = new MissionService();
    }

    async createMission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const dto: CreateMissionDto = req.body;
            const createdById = req.user!.id;
            
            const mission = await this.missionService.createMission(dto, createdById);
            return ApiResponseHelper.created(res, mission, "Mission created successfully");
        } catch (error) {
            next(error);
        }
    }

    async getAllMissions(req: Request, res: Response, next: NextFunction) {
        try {
            const filters: MissionFilterDto = req.query;
            const missions = await this.missionService.getAllMissions(filters);
            return ApiResponseHelper.success(res, missions, "Missions fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    async getMissionById(req: Request, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const mission = await this.missionService.getMissionById(missionId);
            return ApiResponseHelper.success(res, mission, "Mission fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    async updateMission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const dto: UpdateMissionDto = req.body;
            
            const mission = await this.missionService.updateMission(missionId, dto);
            return ApiResponseHelper.success(res, mission, "Mission updated successfully");
        } catch (error) {
            next(error);
        }
    }

    async deleteMission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            await this.missionService.deleteMission(missionId);
            return ApiResponseHelper.success(res, { id: missionId }, "Mission cancelled successfully");
        } catch (error) {
            next(error);
        }
    }

    async autoAssignMission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const { maxAssignees } = req.body;
            
            const dto: AutoAssignmentDto = {
                missionId,
                maxAssignees: maxAssignees || 1,
            };
            
            const assignments = await this.missionService.autoAssignMission(dto);
            return ApiResponseHelper.success(res, assignments, "Mission auto-assigned successfully");
        } catch (error) {
            next(error);
        }
    }

    async getMissionAssignments(req: Request, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const assignments = await this.missionService.getMissionAssignments(missionId);
            return ApiResponseHelper.success(res, assignments, "Mission assignments fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    // Get assignments for current user (employee view)
    async getUserAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const assignments = await this.missionService.getUserAssignments(userId);
            return ApiResponseHelper.success(res, assignments, "User assignments fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    // Employee responds to mission assignment
    async respondToAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const assignmentId = req.params.assignmentId as string;
            const { response, notes } = req.body;
            const userId = req.user!.id;
            
            const assignment = await this.missionService.respondToAssignment(assignmentId, userId, response, notes);
            return ApiResponseHelper.success(res, assignment, "Response recorded successfully");
        } catch (error) {
            next(error);
        }
    }

    // Department head approves mission
    async approveMission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const { comments, approvalLevel } = req.body;
            const userId = req.user!.id;
            const userRole = req.user!.role;
            
            const mission = await this.missionService.approveMission(missionId, userId, userRole, comments, approvalLevel);
            return ApiResponseHelper.success(res, mission, "Mission approved successfully");
        } catch (error) {
            next(error);
        }
    }

    // Reject mission at any approval level
    async rejectMission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const { comments, rejectionReason } = req.body;
            const userId = req.user!.id;
            const userRole = req.user!.role;
            
            const mission = await this.missionService.rejectMission(missionId, userId, userRole, comments, rejectionReason);
            return ApiResponseHelper.success(res, mission, "Mission rejected successfully");
        } catch (error) {
            next(error);
        }
    }

    // Get missions for current user's department (department head view)
    async getDepartmentMissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const missions = await this.missionService.getDepartmentMissions(userId);
            return ApiResponseHelper.success(res, missions, "Department missions fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    // Employee declines assignment and requests substitution
    async declineWithSubstitution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const assignmentId = req.params.assignmentId as string;
            const { reasonCategory, detailedReason, supportingDocuments } = req.body;
            const userId = req.user!.id;

            const result = await this.missionService.declineWithSubstitution(
                assignmentId,
                userId,
                reasonCategory,
                detailedReason,
                supportingDocuments || []
            );
            return ApiResponseHelper.success(res, result, "Substitution request created successfully");
        } catch (error) {
            next(error);
        }
    }

    // Process (approve/reject) a substitution request
    async processSubstitutionRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const requestId = req.params.requestId as string;
            const { status, reviewerComments } = req.body;
            const userId = req.user!.id;
            const userRole = req.user!.role;

            const result = await this.missionService.processSubstitutionRequest(
                requestId,
                userId,
                userRole,
                status,
                reviewerComments
            );
            return ApiResponseHelper.success(res, result, "Substitution request processed successfully");
        } catch (error) {
            next(error);
        }
    }

    // Get substitution requests (all for managers, own for employees)
    async getSubstitutionRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const userRole = req.user!.role;
            const { status } = req.query;

            const requests = await this.missionService.getSubstitutionRequests(
                userId,
                userRole,
                status as string
            );
            return ApiResponseHelper.success(res, requests, "Substitution requests fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    // Get a specific substitution request by ID
    async getSubstitutionRequestById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const requestId = req.params.requestId as string;
            const userId = req.user!.id;
            const userRole = req.user!.role;

            const request = await this.missionService.getSubstitutionRequestById(
                requestId,
                userId,
                userRole
            );
            return ApiResponseHelper.success(res, request, "Substitution request fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    // Get substitution assignments for current user
    async getMySubstitutionAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const assignments = await this.missionService.getMySubstitutionAssignments(userId);
            return ApiResponseHelper.success(res, assignments, "Substitution assignments fetched successfully");
        } catch (error) {
            next(error);
        }
    }

    // Submit mission report
    async submitReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const { activityReport } = req.body;
            const userId = req.user!.id;

            const report = await this.missionService.submitMissionReport(missionId, userId, activityReport);
            return ApiResponseHelper.success(res, report, "Report submitted successfully");
        } catch (error) {
            next(error);
        }
    }

    // Get mission report
    async getMissionReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const report = await this.missionService.getMissionReport(missionId);
            return ApiResponseHelper.success(res, report, "Report fetched successfully");
        } catch (error) {
            next(error);
        }
    }
    // Download mission letter
    async downloadMissionLetter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const missionId = req.params.id as string;
            const userId = req.user!.id;
            
            const pdfBuffer = await this.missionService.generateMissionLetter(missionId, userId);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="mission_order_${missionId}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    }
}
