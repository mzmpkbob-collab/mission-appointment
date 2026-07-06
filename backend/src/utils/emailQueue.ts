import { sendEmail } from './notify';

interface EmailTask {
    email: string;
    templateId: string;
    payload: Record<string, any>;
}

interface SMSTask {
    phone: string;
    message: string;
}

// A simple local array acting as your queue
const queue: EmailTask[] = [];
const smsQueue: SMSTask[] = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;

    while (queue.length > 0) {
        const task = queue.shift(); // Get the oldest email task
        if (task) {
            try {
                await sendEmail('EMAIL', task.email, task.templateId, task.payload);
            } catch (error) {
                console.error(`In-memory queue failed for ${task.email}:`, error);
            }
        }
    }

    isProcessing = false;
}

async function processSMSQueue() {
    if (isProcessing || smsQueue.length === 0) return;
    isProcessing = true;

    while (smsQueue.length > 0) {
        const task = smsQueue.shift(); // Get the oldest email task
        if (task) {
            try {
                await sendEmail('SMS', task.phone, 'SMS', { message: task.message });
            } catch (error) {
                console.error(`In-memory queue failed for ${task.phone}:`, error);
            }
        }
    }

    isProcessing = false;
}

// Export this to use in your service
export const pushToEmailQueue = (email: string, templateId: string, payload: Record<string, any>) => {
    queue.push({ email, templateId, payload });
    processQueue(); // Start processing without awaiting it
};

export const pushToSMSQueue = (phone: string, message: string) => {
    smsQueue.push({ phone, message });
    processSMSQueue(); // Start processing without awaiting it
};