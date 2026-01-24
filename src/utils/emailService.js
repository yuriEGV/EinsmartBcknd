
// Stub for email service
export const sendEmail = async (to, subject, html) => {
    // In a real app, integrate with SendGrid, SES, Mailgun, etc.
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
    // console.log(`[EMAIL BODY]:`, html); // Uncomment for debugging
    return true;
};
