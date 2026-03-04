import { getAccessToken, getAuthState } from './googleAuth';
import { sendGmail } from './gmailSender';

/**
 * Send a cold email to an HR contact via Gmail API
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.toName - Recipient name
 * @param {string} params.company - Company name
 * @param {string} params.role - Contact's role
 * @param {string} params.subject - Email subject (with variables already replaced)
 * @param {string} params.body - Email body (with variables already replaced)
 */
export async function sendColdEmail({ toEmail, toName, company, role, subject, body }) {
    const auth = await getAuthState();

    if (!auth.isSignedIn) {
        throw new Error('Please sign in with Google to send emails. Go to Settings → Email Sending.');
    }

    if (!subject || !body) {
        throw new Error('Email subject and body are required. Please select a template or write your email.');
    }

    const accessToken = await getAccessToken();

    return sendGmail({
        accessToken,
        to: toEmail,
        subject,
        body,
        fromEmail: auth.userEmail,
        fromName: auth.userName,
    });
}

/**
 * Send emails to multiple contacts
 */
export async function sendBulkEmails(contacts, company, { subject, body }) {
    const results = [];
    for (const contact of contacts) {
        try {
            const result = await sendColdEmail({
                toEmail: contact.email,
                toName: contact.name,
                company,
                role: contact.role,
                subject,
                body,
            });
            results.push({ ...contact, sent: true, status: result.status });
        } catch (err) {
            results.push({ ...contact, sent: false, error: err.message });
        }
    }
    return results;
}
