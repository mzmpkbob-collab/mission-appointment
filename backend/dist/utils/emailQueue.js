"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushToSMSQueue = exports.pushToEmailQueue = void 0;
const notify_1 = require("./notify");
// A simple local array acting as your queue
const queue = [];
const smsQueue = [];
let isProcessing = false;
async function processQueue() {
    if (isProcessing || queue.length === 0)
        return;
    isProcessing = true;
    while (queue.length > 0) {
        const task = queue.shift(); // Get the oldest email task
        if (task) {
            try {
                await (0, notify_1.sendEmail)('EMAIL', task.email, task.templateId, task.payload);
            }
            catch (error) {
                console.error(`In-memory queue failed for ${task.email}:`, error);
            }
        }
    }
    isProcessing = false;
}
async function processSMSQueue() {
    if (isProcessing || smsQueue.length === 0)
        return;
    isProcessing = true;
    while (smsQueue.length > 0) {
        const task = smsQueue.shift(); // Get the oldest email task
        if (task) {
            try {
                await (0, notify_1.sendEmail)('SMS', task.phone, 'SMS', { message: task.message });
            }
            catch (error) {
                console.error(`In-memory queue failed for ${task.phone}:`, error);
            }
        }
    }
    isProcessing = false;
}
// Export this to use in your service
const pushToEmailQueue = (email, templateId, payload) => {
    queue.push({ email, templateId, payload });
    processQueue(); // Start processing without awaiting it
};
exports.pushToEmailQueue = pushToEmailQueue;
const pushToSMSQueue = (phone, message) => {
    smsQueue.push({ phone, message });
    processSMSQueue(); // Start processing without awaiting it
};
exports.pushToSMSQueue = pushToSMSQueue;
