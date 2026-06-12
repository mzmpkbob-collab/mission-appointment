"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionController = void 0;
const mission_service_1 = require("../services/mission.service");
const response_1 = require("../utils/response");
class MissionController {
    constructor() {
        this.missionService = new mission_service_1.MissionService();
    }
    async createMission(req, res, next) {
        try {
            const dto = req.body;
            const createdById = req.user.id;
            const mission = await this.missionService.createMission(dto, createdById);
            return response_1.ApiResponseHelper.created(res, mission, "Mission created successfully");
        }
        catch (error) {
            next(error);
        }
    }
    async getAllMissions(req, res, next) {
        try {
            const filters = req.query;
            const missions = await this.missionService.getAllMissions(filters);
            return response_1.ApiResponseHelper.success(res, missions, "Missions fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    async getMissionById(req, res, next) {
        try {
            const missionId = req.params.id;
            const mission = await this.missionService.getMissionById(missionId);
            return response_1.ApiResponseHelper.success(res, mission, "Mission fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    async updateMission(req, res, next) {
        try {
            const missionId = req.params.id;
            const dto = req.body;
            const mission = await this.missionService.updateMission(missionId, dto);
            return response_1.ApiResponseHelper.success(res, mission, "Mission updated successfully");
        }
        catch (error) {
            next(error);
        }
    }
    async deleteMission(req, res, next) {
        try {
            const missionId = req.params.id;
            await this.missionService.deleteMission(missionId);
            return response_1.ApiResponseHelper.success(res, { id: missionId }, "Mission cancelled successfully");
        }
        catch (error) {
            next(error);
        }
    }
    async autoAssignMission(req, res, next) {
        try {
            const missionId = req.params.id;
            const { maxAssignees, allowCrossDepartment } = req.body;
            const dto = {
                missionId,
                maxAssignees: maxAssignees || 1,
                allowCrossDepartment: !!allowCrossDepartment,
            };
            const assignments = await this.missionService.autoAssignMission(dto);
            return response_1.ApiResponseHelper.success(res, assignments, "Mission auto-assigned successfully");
        }
        catch (error) {
            next(error);
        }
    }
    async getMissionAssignments(req, res, next) {
        try {
            const missionId = req.params.id;
            const assignments = await this.missionService.getMissionAssignments(missionId);
            return response_1.ApiResponseHelper.success(res, assignments, "Mission assignments fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Get assignments for current user (employee view)
    async getUserAssignments(req, res, next) {
        try {
            const userId = req.user.id;
            const assignments = await this.missionService.getUserAssignments(userId);
            return response_1.ApiResponseHelper.success(res, assignments, "User assignments fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Employee responds to mission assignment
    async respondToAssignment(req, res, next) {
        try {
            const assignmentId = req.params.assignmentId;
            const { response, notes } = req.body;
            const userId = req.user.id;
            const assignment = await this.missionService.respondToAssignment(assignmentId, userId, response, notes);
            return response_1.ApiResponseHelper.success(res, assignment, "Response recorded successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Department head approves mission
    async approveMission(req, res, next) {
        try {
            const missionId = req.params.id;
            const { comments, approvalLevel } = req.body;
            const userId = req.user.id;
            const userRole = req.user.role;
            const mission = await this.missionService.approveMission(missionId, userId, userRole, comments, approvalLevel);
            return response_1.ApiResponseHelper.success(res, mission, "Mission approved successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Reject mission at any approval level
    async rejectMission(req, res, next) {
        try {
            const missionId = req.params.id;
            const { comments, rejectionReason } = req.body;
            const userId = req.user.id;
            const userRole = req.user.role;
            const mission = await this.missionService.rejectMission(missionId, userId, userRole, comments, rejectionReason);
            return response_1.ApiResponseHelper.success(res, mission, "Mission rejected successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Get missions for current user's department (department head view)
    async getDepartmentMissions(req, res, next) {
        try {
            const userId = req.user.id;
            const missions = await this.missionService.getDepartmentMissions(userId);
            return response_1.ApiResponseHelper.success(res, missions, "Department missions fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Employee declines assignment and requests substitution
    async declineWithSubstitution(req, res, next) {
        try {
            const assignmentId = req.params.assignmentId;
            const { reasonCategory, detailedReason, supportingDocuments } = req.body;
            const userId = req.user.id;
            const result = await this.missionService.declineWithSubstitution(assignmentId, userId, reasonCategory, detailedReason, supportingDocuments || []);
            return response_1.ApiResponseHelper.success(res, result, "Substitution request created successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Process (approve/reject) a substitution request
    async processSubstitutionRequest(req, res, next) {
        try {
            const requestId = req.params.requestId;
            const { status, reviewerComments } = req.body;
            const userId = req.user.id;
            const userRole = req.user.role;
            const result = await this.missionService.processSubstitutionRequest(requestId, userId, userRole, status, reviewerComments);
            return response_1.ApiResponseHelper.success(res, result, "Substitution request processed successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Get substitution requests (all for managers, own for employees)
    async getSubstitutionRequests(req, res, next) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;
            const { status } = req.query;
            const requests = await this.missionService.getSubstitutionRequests(userId, userRole, status);
            return response_1.ApiResponseHelper.success(res, requests, "Substitution requests fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Get a specific substitution request by ID
    async getSubstitutionRequestById(req, res, next) {
        try {
            const requestId = req.params.requestId;
            const userId = req.user.id;
            const userRole = req.user.role;
            const request = await this.missionService.getSubstitutionRequestById(requestId, userId, userRole);
            return response_1.ApiResponseHelper.success(res, request, "Substitution request fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Get substitution assignments for current user
    async getMySubstitutionAssignments(req, res, next) {
        try {
            const userId = req.user.id;
            const assignments = await this.missionService.getMySubstitutionAssignments(userId);
            return response_1.ApiResponseHelper.success(res, assignments, "Substitution assignments fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Submit mission report
    async submitReport(req, res, next) {
        try {
            const missionId = req.params.id;
            const { activityReport } = req.body;
            const userId = req.user.id;
            const report = await this.missionService.submitMissionReport(missionId, userId, activityReport);
            return response_1.ApiResponseHelper.success(res, report, "Report submitted successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Get mission report
    async getMissionReport(req, res, next) {
        try {
            const missionId = req.params.id;
            const report = await this.missionService.getMissionReport(missionId);
            return response_1.ApiResponseHelper.success(res, report, "Report fetched successfully");
        }
        catch (error) {
            next(error);
        }
    }
    // Download mission letter
    async downloadMissionLetter(req, res, next) {
        try {
            const missionId = req.params.id;
            const userId = req.user.id;
            const pdfBuffer = await this.missionService.generateMissionLetter(missionId, userId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="mission_order_${missionId}.pdf"`);
            res.send(pdfBuffer);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MissionController = MissionController;
