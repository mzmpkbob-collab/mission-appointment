import axios from 'axios';

const { NOTIFY_API_URL, NOTIFY_API_KEY } = process.env;

export const sendEmail = async (
    channel: string,
    email: string,
    templateId: string,
    payload: Record<string, any>
): Promise<any> => {
    const response = await axios.post(
        NOTIFY_API_URL as string,
        { channel, recipient: email, templateId, payload },
        {
            headers: {
                Authorization: `Bearer ${NOTIFY_API_KEY}`,
                'Content-Type': 'application/json',
            },
        }
    );

    console.log('Notify API response:', response.status, response.data);
    return response.data;
};