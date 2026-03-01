import axios from 'axios';
import { getSecureKey } from './storage';

export async function sendColdEmail({ toEmail, toName, company, role }) {
    const serviceId = await getSecureKey('EMAILJS_SERVICE_ID');
    const templateId = await getSecureKey('EMAILJS_TEMPLATE_ID');
    const publicKey = await getSecureKey('EMAILJS_PUBLIC_KEY');
    const privateKey = await getSecureKey('EMAILJS_PRIVATE_KEY');

    if (!serviceId || !templateId || !publicKey) {
        throw new Error(
            'EmailJS not configured. Go to Settings → API Keys to set up email sending.'
        );
    }

    // Send via EmailJS — template variables are handled by the EmailJS template
    const payload = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
            to_email: toEmail,
            to_name: toName || '',
            company_name: company || '',
            company: company || '',
            role: role || '',
        },
    };
    // Add private key if configured (required when 'Use Private Key' is enabled)
    if (privateKey) payload.accessToken = privateKey;

    await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload);

    return { status: 'sent' };
}

export async function sendBulkEmails(contacts, company) {
    const results = [];
    for (const contact of contacts) {
        try {
            const { status } = await sendColdEmail({
                toEmail: contact.email,
                toName: contact.name,
                company,
                role: contact.role,
            });
            results.push({ ...contact, sent: true, status });
        } catch (err) {
            results.push({ ...contact, sent: false, error: err.message });
        }
    }
    return results;
}
