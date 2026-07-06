"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const { NOTIFY_API_URL, NOTIFY_API_KEY } = process.env;
const sendEmail = async (channel, email, templateId, payload) => {
    const response = await axios_1.default.post(NOTIFY_API_URL, { channel, recipient: email, templateId, payload }, {
        headers: {
            Authorization: `Bearer ${NOTIFY_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    console.log('Notify API response:', response.status, response.data);
    return response.data;
};
exports.sendEmail = sendEmail;
