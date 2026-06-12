"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const department_controller_1 = require("../controllers/department.controller");
const auth_1 = require("../middleware/auth");
const ApiError_1 = require("../utils/ApiError");
const router = (0, express_1.Router)();
const departmentController = new department_controller_1.DepartmentController();
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return next(new ApiError_1.ApiError("Validation failed", 400, errors.array()));
    }
    return next();
};
/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "HR", "HEAD_OF_DEPARTMENT", "DIRECTOR"]), (req, res, next) => departmentController.getAllDepartments(req, res, next));
/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Department'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.get("/:id", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "HR", "HEAD_OF_DEPARTMENT", "DIRECTOR"]), (req, res, next) => departmentController.getDepartmentById(req, res, next));
/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentDto'
 *     responses:
 *       201:
 *         description: Department created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       409:
 *         description: Department already exists
 */
router.post("/", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "DIRECTOR"]), [
    (0, express_validator_1.body)("name").notEmpty().withMessage("name is required"),
    (0, express_validator_1.body)("budgetAllocation").optional().isNumeric().withMessage("budgetAllocation must be numeric"),
    (0, express_validator_1.body)("headId").optional().isUUID().withMessage("headId must be a valid UUID"),
], validateRequest, (req, res, next) => departmentController.createDepartment(req, res, next));
/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Update department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDepartmentDto'
 *     responses:
 *       200:
 *         description: Department updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Department not found
 *       409:
 *         description: Department name or code already exists
 */
router.put("/:id", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "DIRECTOR"]), [
    (0, express_validator_1.param)("id").notEmpty(),
    (0, express_validator_1.body)("budgetAllocation").optional().isNumeric().withMessage("budgetAllocation must be numeric"),
    (0, express_validator_1.body)("headId").optional().isUUID().withMessage("headId must be a valid UUID"),
], validateRequest, (req, res, next) => departmentController.updateDepartment(req, res, next));
/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     summary: Delete department (soft delete)
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Department not found
 */
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "DIRECTOR"]), (req, res, next) => departmentController.deleteDepartment(req, res, next));
/**
 * @swagger
 * /api/departments/{id}/users:
 *   get:
 *     summary: Get all users in a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department ID
 *     responses:
 *       200:
 *         description: List of users in the department
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.get("/:id/users", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "HR", "HEAD_OF_DEPARTMENT", "DIRECTOR"]), (req, res, next) => departmentController.getDepartmentUsers(req, res, next));
/**
 * @swagger
 * /api/departments/{id}/remove-head:
 *   patch:
 *     summary: Remove department head
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department head removed successfully
 *       400:
 *         description: Department has no head to remove
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.patch("/:id/remove-head", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "DIRECTOR"]), (req, res, next) => departmentController.removeDepartmentHead(req, res, next));
/**
 * @swagger
 * /api/departments/{id}/transfer-users:
 *   post:
 *     summary: Bulk transfer users between departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Source Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toDepartmentId
 *               - userIds
 *             properties:
 *               toDepartmentId:
 *                 type: string
 *                 format: uuid
 *                 description: Target department ID
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of user IDs to transfer
 *     responses:
 *       200:
 *         description: User transfer completed
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.post("/:id/transfer-users", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN", "HR", "DIRECTOR"]), [
    (0, express_validator_1.body)("toDepartmentId").isUUID().withMessage("toDepartmentId must be a valid UUID"),
    (0, express_validator_1.body)("userIds").isArray().withMessage("userIds must be an array"),
    (0, express_validator_1.body)("userIds.*").isUUID().withMessage("Each user ID must be a valid UUID"),
], validateRequest, (req, res, next) => departmentController.bulkTransferUsers(req, res, next));
exports.default = router;
