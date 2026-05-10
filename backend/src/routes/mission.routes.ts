import { Router, Request, Response, NextFunction } from "express";
import { body, query, param, validationResult } from "express-validator";
import { MissionController } from "../controllers/mission.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ApiError } from "../utils/ApiError";

const router = Router();
const missionController = new MissionController();

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ApiError("Validation failed", 400, errors.array()));
    }
    return next();
};

/**
 * @swagger
 * /api/missions:
 *   get:
 *     summary: Get all missions with optional filters
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING_ASSIGNMENT, ASSIGNED, IN_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED]
 *       - in: query
 *         name: urgencyLevel
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *     responses:
 *       200:
 *         description: Missions retrieved successfully
 */
router.get(
    "/",
    authenticate,
    authorize(["ADMIN", "HR", "DIRECTOR", "HEAD_OF_DEPARTMENT"]),
    [
        query("departmentId").optional().isUUID().withMessage("departmentId must be a valid UUID"),
        query("status").optional().isIn(["DRAFT", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_APPROVAL", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED"]),
        query("urgencyLevel").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.getAllMissions(req, res, next)
);

/**
 * @swagger
 * /api/missions:
 *   post:
 *     summary: Create new mission
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - destination
 *               - startDate
 *               - endDate
 *               - departmentId
 *               - estimatedBudget
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               destination:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               estimatedBudget:
 *                 type: number
 *               urgencyLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               budgetCode:
 *                 type: string
 *               requiredQualifications:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Mission created successfully
 */
router.post(
    "/",
    authenticate,
    authorize(["ADMIN", "DIRECTOR", "HEAD_OF_DEPARTMENT"]),
    [
        body("title").notEmpty().withMessage("Title is required"),
        body("description").notEmpty().withMessage("Description is required"),
        body("destination").notEmpty().withMessage("Destination is required"),
        body("startDate").isISO8601().withMessage("Start date must be valid ISO date"),
        body("endDate").isISO8601().withMessage("End date must be valid ISO date"),
        body("departmentId").isUUID().withMessage("Department ID must be valid UUID"),
        body("estimatedBudget").isNumeric().withMessage("Estimated budget must be a number"),
        body("urgencyLevel").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
        body("requiredQualifications").optional().isArray(),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.createMission(req, res, next)
);

/**
 * @swagger
 * /api/missions/assignments:
 *   get:
 *     summary: Get assignments for current user (employee view)
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User assignments retrieved successfully
 */
router.get(
    "/assignments",
    authenticate,
    authorize(["EMPLOYEE", "HEAD_OF_DEPARTMENT", "ADMIN"]),
    (req: Request, res: Response, next: NextFunction) => missionController.getUserAssignments(req, res, next)
);

/**
 * @swagger
 * /api/missions/department:
 *   get:
 *     summary: Get missions for current user's department (department head view)
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department missions retrieved successfully
 */
router.get(
    "/department",
    authenticate,
    authorize(["HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "ADMIN"]),
    (req: Request, res: Response, next: NextFunction) => missionController.getDepartmentMissions(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}:
 *   get:
 *     summary: Get mission by ID
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mission retrieved successfully
 *       404:
 *         description: Mission not found
 */
router.get(
    "/:id",
    authenticate,
    [param("id").isUUID().withMessage("Mission ID must be valid UUID")],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.getMissionById(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}:
 *   put:
 *     summary: Update mission
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               destination:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               estimatedBudget:
 *                 type: number
 *               urgencyLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING_ASSIGNMENT, ASSIGNED, IN_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED]
 *     responses:
 *       200:
 *         description: Mission updated successfully
 */
router.put(
    "/:id",
    authenticate,
    authorize(["ADMIN", "DIRECTOR", "HEAD_OF_DEPARTMENT",'EMPLOYEE']),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
        body("startDate").optional().isISO8601().withMessage("Start date must be valid ISO date"),
        body("endDate").optional().isISO8601().withMessage("End date must be valid ISO date"),
        body("estimatedBudget").optional().isNumeric().withMessage("Estimated budget must be a number"),
        body("urgencyLevel").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.updateMission(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}:
 *   delete:
 *     summary: Cancel mission
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mission cancelled successfully
 */
router.delete(
    "/:id",
    authenticate,
    authorize(["ADMIN", "DIRECTOR"]),
    [param("id").isUUID().withMessage("Mission ID must be valid UUID")],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.deleteMission(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/auto-assign:
 *   post:
 *     summary: Auto-assign mission to eligible employees
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAssignees:
 *                 type: number
 *                 minimum: 1
 *                 default: 1
 *     responses:
 *       200:
 *         description: Mission auto-assigned successfully
 *       400:
 *         description: No eligible employees found or mission not in DRAFT status
 */
router.post(
    "/:id/auto-assign",
    authenticate,
    authorize(["ADMIN", "HR", "DIRECTOR", "HEAD_OF_DEPARTMENT"]),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
        body("maxAssignees").optional().isInt({ min: 1 }).withMessage("Max assignees must be positive integer"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.autoAssignMission(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/assignments:
 *   get:
 *     summary: Get mission assignments
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mission assignments retrieved successfully
 */
router.get(
    "/:id/assignments",
    authenticate,
    [param("id").isUUID().withMessage("Mission ID must be valid UUID")],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.getMissionAssignments(req, res, next)
);

/**
 * @swagger
 * /api/missions/assignments/{assignmentId}/respond:
 *   post:
 *     summary: Employee responds to mission assignment (Accept or Decline)
 *     tags: [Missions - Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the mission assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [ACCEPTED, DECLINED]
 *                 description: Employee's response to the assignment
 *               notes:
 *                 type: string
 *                 description: Optional notes from the employee explaining their response
 *     responses:
 *       200:
 *         description: Response recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionAssignment'
 *       400:
 *         description: Assignment already responded to or invalid response
 *       403:
 *         description: Unauthorized to respond to this assignment
 *       404:
 *         description: Assignment not found
 */
router.post(
    "/assignments/:assignmentId/respond",
    authenticate,
    authorize(["EMPLOYEE", "ADMIN"]),
    [
        param("assignmentId").isUUID().withMessage("Assignment ID must be valid UUID"),
        body("response").isIn(["ACCEPTED", "DECLINED"]).withMessage("Response must be ACCEPTED or DECLINED"),
        body("notes").optional().isString().withMessage("Notes must be a string"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.respondToAssignment(req, res, next)
);

/**
 * @swagger
 * /api/missions/assignments/{assignmentId}/decline-with-substitution:
 *   post:
 *     summary: Employee declines assignment and requests a substitution
 *     description: |
 *       Allows an employee to decline a mission assignment and request a substitution.
 *       This creates a substitution request that requires approval from management.
 *       The employee must provide a valid reason category and detailed explanation.
 *     tags: [Missions - Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the mission assignment to decline
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reasonCategory
 *               - detailedReason
 *             properties:
 *               reasonCategory:
 *                 type: string
 *                 enum: [MEDICAL, FAMILY_EMERGENCY, CONFLICT_OF_INTEREST, OTHER]
 *                 description: Category of the reason for substitution request
 *               detailedReason:
 *                 type: string
 *                 minLength: 10
 *                 description: Detailed explanation for why substitution is needed
 *               supportingDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of file paths or URLs for supporting documents
 *     responses:
 *       200:
 *         description: Substitution request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubstitutionRequest'
 *       400:
 *         description: Assignment already responded to or invalid data
 *       403:
 *         description: Unauthorized to decline this assignment
 *       404:
 *         description: Assignment not found
 */
router.post(
    "/assignments/:assignmentId/decline-with-substitution",
    authenticate,
    authorize(["EMPLOYEE", "ADMIN"]),
    [
        param("assignmentId").isUUID().withMessage("Assignment ID must be valid UUID"),
        body("reasonCategory").isIn(["MEDICAL", "FAMILY_EMERGENCY", "CONFLICT_OF_INTEREST", "OTHER"])
            .withMessage("Reason category must be one of: MEDICAL, FAMILY_EMERGENCY, CONFLICT_OF_INTEREST, OTHER"),
        body("detailedReason").notEmpty().withMessage("Detailed reason is required")
            .isLength({ min: 10 }).withMessage("Detailed reason must be at least 10 characters"),
        body("supportingDocuments").optional().isArray().withMessage("Supporting documents must be an array"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.declineWithSubstitution(req, res, next)
);

/**
 * @swagger
 * /api/missions/substitution-requests/{requestId}/approve:
 *   post:
 *     summary: Approve or reject a substitution request
 *     description: |
 *       Allows authorized personnel (HR, Department Head, Director, Admin) to approve or reject
 *       a substitution request. When approved, the original assignment is marked as declined
 *       and a new assignment process may be initiated.
 *     tags: [Missions - Substitution Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the substitution request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 description: Decision on the substitution request
 *               reviewerComments:
 *                 type: string
 *                 description: Comments from the reviewer explaining the decision
 *     responses:
 *       200:
 *         description: Substitution request processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubstitutionRequest'
 *       400:
 *         description: Request already processed or invalid status
 *       403:
 *         description: Unauthorized to approve this request
 *       404:
 *         description: Substitution request not found
 */
router.post(
    "/substitution-requests/:requestId/approve",
    authenticate,
    authorize(["HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "HR", "DIRECTOR", "ADMIN"]),
    [
        param("requestId").isUUID().withMessage("Request ID must be valid UUID"),
        body("status").isIn(["APPROVED", "REJECTED"]).withMessage("Status must be APPROVED or REJECTED"),
        body("reviewerComments").optional().isString().withMessage("Comments must be a string"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.processSubstitutionRequest(req, res, next)
);

/**
 * @swagger
 * /api/missions/substitution-requests:
 *   get:
 *     summary: Get all substitution requests (with optional filters)
 *     description: |
 *       Retrieves substitution requests. For HR, Department Heads, Directors, and Admins,
 *       this returns all requests (optionally filtered by status). For employees,
 *       this returns only their own substitution requests.
 *     tags: [Missions - Substitution Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by approval status (not applicable for employee's own requests)
 *     responses:
 *       200:
 *         description: Substitution requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubstitutionRequest'
 */
router.get(
    "/substitution-requests",
    authenticate,
    authorize(["EMPLOYEE", "HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "HR", "DIRECTOR", "ADMIN"]),
    [
        query("status").optional().isIn(["PENDING", "APPROVED", "REJECTED"])
            .withMessage("Status must be one of: PENDING, APPROVED, REJECTED"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.getSubstitutionRequests(req, res, next)
);

/**
 * @swagger
 * /api/missions/substitution-requests/{requestId}:
 *   get:
 *     summary: Get a specific substitution request by ID
 *     tags: [Missions - Substitution Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the substitution request
 *     responses:
 *       200:
 *         description: Substitution request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubstitutionRequest'
 *       403:
 *         description: Unauthorized to view this request
 *       404:
 *         description: Substitution request not found
 */
router.get(
    "/substitution-requests/:requestId",
    authenticate,
    authorize(["EMPLOYEE", "HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "HR", "DIRECTOR", "ADMIN"]),
    [
        param("requestId").isUUID().withMessage("Request ID must be valid UUID"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.getSubstitutionRequestById(req, res, next)
);

/**
 * @swagger
 * /api/missions/assignments/my-substitutions:
 *   get:
 *     summary: Get substitution assignments for current user
 *     description: |
 *       Returns mission assignments where the current user is assigned as a substitute
 *       for another employee who declined the original assignment.
 *     tags: [Missions - Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Substitution assignments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MissionAssignment'
 */
router.get(
    "/assignments/my-substitutions",
    authenticate,
    authorize(["EMPLOYEE", "HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "HR", "DIRECTOR", "ADMIN"]),
    (req: Request, res: Response, next: NextFunction) => missionController.getMySubstitutionAssignments(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/approve:
 *   post:
 *     summary: Approve mission at different approval levels
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *               approvalLevel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mission approved successfully
 */
router.post(
    "/:id/approve",
    authenticate,
    authorize(["HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "FINANCE", "HR", "DIRECTOR", "ADMIN"]),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
        body("comments").optional().isString().withMessage("Comments must be a string"),
        body("approvalLevel").optional().isString().withMessage("Approval level must be a string"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.approveMission(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/reject:
 *   post:
 *     summary: Reject mission at any approval level
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mission rejected successfully
 */
router.post(
    "/:id/reject",
    authenticate,
    authorize(["HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "FINANCE", "HR", "DIRECTOR", "ADMIN"]),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
        body("comments").optional().isString().withMessage("Comments must be a string"),
        body("rejectionReason").optional().isString().withMessage("Rejection reason must be a string"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.rejectMission(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/report:
 *   post:
 *     summary: Submit a report for a mission
 *     tags: [Missions - Reports]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/:id/report",
    authenticate,
    authorize(["EMPLOYEE", "ADMIN", "DIRECTOR"]),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
        body("activityReport").isString().withMessage("activityReport must be a string").notEmpty(),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.submitReport(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/report:
 *   get:
 *     summary: Get a report for a mission
 *     tags: [Missions - Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:id/report",
    authenticate,
    authorize(["EMPLOYEE", "HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "FINANCE", "HR", "DIRECTOR", "ADMIN"]),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.getMissionReport(req, res, next)
);

/**
 * @swagger
 * /api/missions/{id}/letter:
 *   get:
 *     summary: Download mission letter (PDF)
 *     tags: [Missions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mission letter generated and downloaded
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
    "/:id/letter",
    authenticate,
    authorize(["EMPLOYEE", "HEAD_OF_DEPARTMENT", "DEPARTMENT_HEAD", "FINANCE", "HR", "DIRECTOR", "ADMIN"]),
    [
        param("id").isUUID().withMessage("Mission ID must be valid UUID"),
    ],
    validateRequest,
    (req: Request, res: Response, next: NextFunction) => missionController.downloadMissionLetter(req, res, next)
);

export default router;