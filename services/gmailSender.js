import axios from 'axios';

/**
 * Build an RFC 2822 MIME email message
 */
function buildMimeMessage({ to, subject, body, fromEmail, fromName }) {
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const lines = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        body,
    ];
    return lines.join('\r\n');
}

/**
 * Base64url encode a string (Gmail API requires base64url, not standard base64)
 */
function base64urlEncode(str) {
    // Convert string to base64
    const base64 = btoa(unescape(encodeURIComponent(str)));
    // Convert base64 to base64url (replace + with -, / with _, remove =)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send an email via Gmail API
 * @param {Object} params
 * @param {string} params.accessToken - Valid Google access token
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Email body (plain text)
 * @param {string} params.fromEmail - Sender's email
 * @param {string} params.fromName - Sender's display name
 * @returns {{ status: string, messageId: string }}
 */
export async function sendGmail({ accessToken, to, subject, body, fromEmail, fromName }) {
    if (!accessToken) throw new Error('No access token. Please sign in with Google.');
    if (!to) throw new Error('Recipient email is required.');
    if (!subject) throw new Error('Email subject is required.');
    if (!body) throw new Error('Email body is required.');

    const mimeMessage = buildMimeMessage({ to, subject, body, fromEmail, fromName });
    const encodedMessage = base64urlEncode(mimeMessage);

    try {
        const res = await axios.post(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            { raw: encodedMessage },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return {
            status: 'sent',
            messageId: res.data.id,
        };
    } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;

        if (status === 401) {
            throw new Error('Google session expired. Please sign in again.');
        }
        if (status === 403) {
            throw new Error('Permission denied. Please sign in with Google and allow email sending.');
        }
        if (status === 429) {
            throw new Error('Too many emails sent. Please wait a moment and try again.');
        }
        throw new Error(`Failed to send email: ${msg}`);
    }
}
