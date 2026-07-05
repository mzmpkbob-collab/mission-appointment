"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const email_service_1 = require("./services/email.service");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
async function run() {
    console.log('Initializing EmailService...');
    const emailService = new email_service_1.EmailService();
    console.log('Sending test password reset email...');
    try {
        await emailService.sendPasswordResetEmail('mzmpkbob@gmail.com', 'test-token-123456');
        console.log('Test email sent successfully!');
    }
    catch (err) {
        console.error('Failed to send test email:', err);
    }
}
run();
