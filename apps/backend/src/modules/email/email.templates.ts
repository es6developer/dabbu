const ACCENT = '#6C3EF4';
const ACCENT_DARK = '#5B2ED9';
const ACCENT_LIGHT = '#EDE9FE';
const BG = '#0F172A';
const CARD = '#1E293B';
const CARD_BORDER = '#334155';
const TEXT = '#F1F5F9';
const TEXT_MUTED = '#94A3B8';
const SUCCESS = '#22C55E';
const ERROR = '#EF4444';
const WARNING = '#F59E0B';

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dabbu</title>
  <style type="text/css">
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BG}; color: ${TEXT}; }
    a { color: ${ACCENT}; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,${ACCENT},${ACCENT_DARK});border-radius:12px;padding:12px 28px;">
                    <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">dabbu</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="content" style="background-color:${CARD};border:1px solid ${CARD_BORDER};border-radius:16px;padding:40px 40px 36px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0 10px;">
                          <a href="https://dabbu.app" style="font-size:13px;color:${TEXT_MUTED};text-decoration:none;">Website</a>
                        </td>
                        <td style="padding:0 10px;">
                          <a href="mailto:support@dabbu.app" style="font-size:13px;color:${TEXT_MUTED};text-decoration:none;">Support</a>
                        </td>
                        <td style="padding:0 10px;">
                          <a href="{{privacyUrl}}" style="font-size:13px;color:${TEXT_MUTED};text-decoration:none;">Privacy</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:4px;">
                    <span style="font-size:12px;color:${TEXT_MUTED};line-height:18px;">
                      &copy; ${new Date().getFullYear()} Dabbu. All rights reserved.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, text: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="background:linear-gradient(135deg,${ACCENT},${ACCENT_DARK});border-radius:10px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;line-height:20px;letter-spacing:0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function secondaryButton(href: string, text: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;">
    <tr>
      <td align="center" style="border:1.5px solid ${CARD_BORDER};border-radius:10px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 36px;font-size:14px;font-weight:500;color:${TEXT_MUTED};text-decoration:none;line-height:20px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${CARD_BORDER};margin:28px 0;" />`;
}

function featureList(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
      <td style="padding:6px 0;font-size:14px;color:${TEXT};">
        <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:${ACCENT_LIGHT};color:${ACCENT_DARK};font-size:11px;font-weight:700;margin-right:10px;">&#10003;</span>${item}
      </td>
    </tr>`,
    )
    .join('');
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 8px;">${rows}</table>`;
}

export function welcomeEmail(name: string, dashboardUrl: string): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;line-height:1;margin-bottom:16px;">&#127881;</div>
      <h1 style="font-size:26px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Welcome to Dabbu!
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0;">
        Hey ${name}, we're thrilled to have you on board.
      </p>
    </div>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 20px;">
      Dabbu helps you track expenses, manage budgets, and take control of your finances — 
      all in one place. Here's what you can do right away:
    </p>
    ${featureList([
      'Track income & expenses effortlessly',
      'Create and manage budgets',
      'Share expenses with family & friends',
      'Set financial goals',
      'Get AI-powered insights',
    ])}
    ${button(dashboardUrl, 'Go to Dashboard')}
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.6;margin:20px 0 0;text-align:center;">
      Questions? <a href="mailto:support@dabbu.app" style="color:${ACCENT};font-weight:500;">We're here to help</a>
    </p>
  `);
}

export function forgotPasswordEmail(
  name: string,
  resetUrl: string,
  expiresInMinutes: number,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${ACCENT_LIGHT};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128274;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Reset Your Password
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 8px;">
      Hi ${name}, we received a request to reset your Dabbu account password. 
      Click the button below to create a new one.
    </p>
    ${button(resetUrl, 'Reset Password')}
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.6;margin:16px 0 0;text-align:center;">
      This link expires in <strong style="color:${WARNING};">${expiresInMinutes} minutes</strong>.
      If you didn't request this, you can safely ignore this email.
    </p>
    ${divider()}
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.1);border-radius:10px;padding:16px;margin:0;">
      <tr>
        <td style="font-size:13px;color:${ERROR};line-height:1.5;">
          <strong>&#9888; Security notice:</strong> Never share this link with anyone. 
          Dabbu will never ask for your password or reset link via email or phone.
        </td>
      </tr>
    </table>
  `);
}

export function passwordChangedEmail(name: string, timestamp: string): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#9989;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Password Changed
      </h1>
      <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:0;">
        Your Dabbu account password was changed on <strong style="color:${TEXT};">${timestamp}</strong>.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.1);border-radius:10px;padding:16px;margin:0 0 20px;">
      <tr>
        <td style="font-size:14px;color:${ERROR};line-height:1.5;">
          <strong>&#9888; Didn't do this?</strong> If you didn't change your password, 
          please <a href="mailto:support@dabbu.app" style="color:${ACCENT};font-weight:600;">contact support</a> 
          immediately to secure your account.
        </td>
      </tr>
    </table>
    ${secondaryButton('https://web-omega-snowy-80.vercel.app/login', 'Go to Login')}
    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.5;margin:16px 0 0;text-align:center;">
      This is an automated security notification. No action needed if you made this change.
    </p>
  `);
}

export function premiumActivatedEmail(
  name: string,
  planName: string,
  billingCycle: string,
  startDate: string,
  features: string[],
  manageUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;line-height:1;margin-bottom:12px;">&#128640;</div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Welcome to Premium!
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0;">
        You're now on the <strong style="color:${ACCENT};">${planName}</strong> plan.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(249,115,22,0.1),rgba(234,88,12,0.05));border:1px solid ${CARD_BORDER};border-radius:12px;padding:18px;margin:0 0 24px;">
      <tr>
        <td style="font-size:14px;color:${TEXT_MUTED};line-height:2;">
          <strong style="color:${ACCENT};">Plan:</strong> ${planName}<br />
          <strong style="color:${ACCENT};">Billing:</strong> ${billingCycle}<br />
          <strong style="color:${ACCENT};">Started:</strong> ${startDate}
        </td>
      </tr>
    </table>
    <h2 style="font-size:16px;font-weight:600;color:${TEXT};margin:0 0 4px;">What's included:</h2>
    ${featureList(features)}
    ${button(manageUrl, 'Manage Subscription')}
  `);
}

export function premiumRenewedEmail(
  name: string,
  renewalDate: string,
  nextBillingDate: string,
  amount: string,
  manageUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128176;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Renewed Successfully
      </h1>
      <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:0;">
        Your Dabbu Premium has been renewed. All features are active.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.02));border:1px solid ${CARD_BORDER};border-radius:12px;padding:18px;margin:0 0 24px;">
      <tr>
        <td style="font-size:14px;color:${TEXT_MUTED};line-height:2;">
          <strong style="color:${SUCCESS};">Renewed:</strong> ${renewalDate}<br />
          <strong style="color:${SUCCESS};">Next Billing:</strong> ${nextBillingDate}<br />
          <strong style="color:${SUCCESS};">Amount:</strong> ${amount}
        </td>
      </tr>
    </table>
    ${button(manageUrl, 'Manage Subscription')}
  `);
}

export function premiumExpiryReminderEmail(
  name: string,
  daysRemaining: number,
  expiryDate: string,
  renewUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#9200;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Premium Expiring Soon
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0;">
        Your plan ends in <strong style="color:${WARNING};">${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>
        on <strong style="color:${TEXT};">${expiryDate}</strong>.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.1);border-radius:10px;padding:16px;margin:0 0 20px;">
      <tr>
        <td style="font-size:14px;color:${ERROR};line-height:1.5;">
          After expiry, you'll lose access to premium features including unlimited groups, 
          advanced analytics, and more.
        </td>
      </tr>
    </table>
    ${button(renewUrl, 'Renew Premium')}
    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.5;margin:12px 0 0;text-align:center;">
      No action needed if you've already renewed.
    </p>
  `);
}

export function groupInviteEmail(
  name: string,
  groupName: string,
  inviterName: string,
  groupUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${ACCENT_LIGHT};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128101;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        You've Been Added!
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
        <strong style="color:${TEXT};">${inviterName}</strong> added you to 
        <strong style="color:${ACCENT};">${groupName}</strong> on Dabbu.
      </p>
    </div>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 0;text-align:center;">
      You can now track shared expenses, split bills, and settle up together — all from one place.
    </p>
    ${button(groupUrl, 'Open Group')}
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(249,115,22,0.08);border-radius:10px;padding:14px 18px;margin:20px 0 0;">
      <tr>
        <td style="font-size:13px;color:${TEXT_MUTED};line-height:1.6;text-align:center;">
          Add expenses, see what others are spending, and settle up — right from the group.
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.5;margin:16px 0 0;text-align:center;">
      Need help? <a href="mailto:support@dabbu.app" style="color:${ACCENT};font-weight:500;">Contact support</a>
    </p>
  `);
}

export function otpEmail(name: string, otpCode: string, purpose: string): string {
  const purposeText =
    purpose === 'login' ? 'logging into your Dabbu account' : 'verifying your email address';
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${ACCENT_LIGHT};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128274;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Verification Code
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 8px;">
      Hi ${name}, use the code below for ${purposeText}:
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
      <tr>
        <td style="background:linear-gradient(135deg,${ACCENT},${ACCENT_DARK});border-radius:14px;padding:20px 40px;letter-spacing:12px;">
          <span style="font-size:36px;font-weight:800;color:#FFFFFF;font-family:monospace;">${otpCode}</span>
        </td>
      </tr>
    </table>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:20px 0 0;text-align:center;">
      This code expires in <strong style="color:${WARNING};">5 minutes</strong>.
      If you didn't request this, you can safely ignore this email.
    </p>
    ${divider()}
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.1);border-radius:10px;padding:16px;margin:0;">
      <tr>
        <td style="font-size:13px;color:${ERROR};line-height:1.5;">
          <strong>&#9888; Security notice:</strong> Never share this code with anyone.
          Dabbu will never ask for your verification code via phone or social media.
        </td>
      </tr>
    </table>
  `);
}

export function paymentFailedEmail(
  name: string,
  planName: string,
  amount: string,
  retryUrl: string,
  updatePaymentUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#9888;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Payment Failed
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
        Hi ${name}, we couldn't process <strong style="color:${TEXT};">${amount}</strong> 
        for your <strong style="color:${ACCENT};">${planName}</strong> plan.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.08);border-radius:10px;padding:16px;margin:0 0 24px;">
      <tr>
        <td style="font-size:14px;color:${ERROR};line-height:1.5;">
          <strong>&#9888; What happened?</strong> Your payment method was declined. 
          Your premium features are still active for now — update your payment method 
          to avoid any interruption.
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="background:linear-gradient(135deg,${ACCENT},${ACCENT_DARK});border-radius:10px;">
          <a href="${retryUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;line-height:20px;letter-spacing:0.3px;">Retry Payment</a>
        </td>
        <td width="12"></td>
        <td align="center" style="border:1.5px solid ${CARD_BORDER};border-radius:10px;">
          <a href="${updatePaymentUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:${TEXT_MUTED};text-decoration:none;line-height:20px;">Update Card</a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.5;margin:20px 0 0;text-align:center;">
      Need help? <a href="mailto:support@dabbu.app" style="color:${ACCENT};font-weight:500;">Contact support</a>
    </p>
  `);
}

export function settlementCompletedEmail(
  name: string,
  groupName: string,
  amount: string,
  settledWithName: string,
  groupUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#9989;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Settlement Completed
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 8px;">
      Hi ${name}, a settlement of <strong style="color:${SUCCESS};font-size:20px;">${amount}</strong>
      has been completed with <strong style="color:${TEXT};">${settledWithName}</strong>
      in <strong style="color:${ACCENT};">${groupName}</strong>.
    </p>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 0;text-align:center;">
      All cleared up! Check the group to see updated balances.
    </p>
    ${button(groupUrl, 'View Group')}
  `);
}

export function settlementRequestedEmail(
  name: string,
  groupName: string,
  amount: string,
  requestedByName: string,
  groupUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${ACCENT_LIGHT};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128176;</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Settlement Requested
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
        <strong style="color:${TEXT};">${requestedByName}</strong> requested
        <strong style="color:${ACCENT};font-size:20px;">${amount}</strong> from you
        in <strong style="color:${ACCENT};">${groupName}</strong>.
      </p>
    </div>
    ${button(groupUrl, 'View & Pay')}
    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.5;margin:16px 0 0;text-align:center;">
      You can pay via UPI, cash, or any method you prefer.
    </p>
  `);
}

export function groupExpenseAddedEmail(
  name: string,
  groupName: string,
  description: string,
  amount: string,
  addedByName: string,
  groupUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${ACCENT_LIGHT};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128221;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        New Expense Added
      </h1>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(108,62,244,0.08),rgba(91,46,217,0.04));border:1px solid ${CARD_BORDER};border-radius:12px;padding:20px;margin:0 0 24px;">
      <tr>
        <td style="font-size:15px;color:${TEXT_MUTED};line-height:2;">
          <strong style="color:${ACCENT};">Description:</strong> ${description}<br />
          <strong style="color:${ACCENT};">Amount:</strong> <span style="color:${TEXT};font-weight:600;">${amount}</span><br />
          <strong style="color:${ACCENT};">Added by:</strong> ${addedByName}<br />
          <strong style="color:${ACCENT};">Group:</strong> ${groupName}
        </td>
      </tr>
    </table>
    ${button(groupUrl, 'View Expense')}
    <p style="font-size:12px;color:${TEXT_MUTED};line-height:1.5;margin:16px 0 0;text-align:center;">
      This expense has been split among all active members.
    </p>
  `);
}

export function loginAlertEmail(
  name: string,
  deviceName: string,
  platform: string,
  timestamp: string,
  ipAddress: string,
  location: string,
  securityUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128274;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        New Login Detected
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 8px;">
      Hi ${name}, a new login was detected on your Dabbu account.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(108,62,244,0.05);border:1px solid ${CARD_BORDER};border-radius:12px;padding:18px;margin:0 0 24px;">
      <tr>
        <td style="font-size:14px;color:${TEXT_MUTED};line-height:2;">
          <strong style="color:${ACCENT};">Device:</strong> ${deviceName}<br />
          <strong style="color:${ACCENT};">Platform:</strong> ${platform}<br />
          <strong style="color:${ACCENT};">Time:</strong> ${timestamp}<br />
          <strong style="color:${ACCENT};">IP:</strong> ${ipAddress}${location ? `<br /><strong style="color:${ACCENT};">Location:</strong> ${location}` : ''}
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.1);border-radius:10px;padding:16px;margin:0 0 20px;">
      <tr>
        <td style="font-size:13px;color:${ERROR};line-height:1.5;">
          <strong>&#9888; Wasn't you?</strong> Secure your account immediately by changing your password and reviewing active sessions.
        </td>
      </tr>
    </table>
    ${button(securityUrl, 'Review Activity')}
  `);
}

export function budgetAlertEmail(
  name: string,
  category: string,
  spent: string,
  budget: string,
  percentage: number,
  dashboardUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#9200;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Budget Alert
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 8px;">
      You've used <strong style="color:${WARNING};">${percentage}%</strong> of your
      <strong style="color:${ACCENT};">${category}</strong> budget.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(108,62,244,0.08),rgba(91,46,217,0.04));border:1px solid ${CARD_BORDER};border-radius:12px;padding:18px;margin:0 0 24px;">
      <tr>
        <td style="font-size:14px;color:${TEXT_MUTED};line-height:2;">
          <strong style="color:${SUCCESS};">Spent:</strong> ${spent}<br />
          <strong style="color:${ACCENT};">Budget:</strong> ${budget}<br />
          <strong style="color:${WARNING};">Used:</strong> ${percentage}%
        </td>
      </tr>
    </table>
    ${button(dashboardUrl, 'View Budget')}
  `);
}

export function billReminderEmail(
  name: string,
  billName: string,
  amount: string,
  dueDate: string,
  daysRemaining: number,
  groupName: string,
  dashboardUrl: string,
): string {
  const urgencyColor = daysRemaining <= 1 ? ERROR : daysRemaining <= 3 ? WARNING : ACCENT;
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128197;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Bill Reminder
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0 0 8px;">
      <strong style="color:${TEXT};">${billName}</strong> of <strong style="color:${urgencyColor};font-size:20px;">${amount}</strong>
      is due in <strong style="color:${urgencyColor};">${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>
      ${groupName ? `in <strong style="color:${ACCENT};">${groupName}</strong>` : ''}.
    </p>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 0;text-align:center;">
      Due date: ${dueDate}
    </p>
    ${button(dashboardUrl, 'Pay Now')}
  `);
}

export function memberRemovedEmail(
  name: string,
  groupName: string,
  removedByName: string,
  supportUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128683;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Removed From Group
      </h1>
    </div>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
      Hi ${name}, you've been removed from <strong style="color:${ACCENT};">${groupName}</strong>
      by <strong style="color:${TEXT};">${removedByName}</strong>.
    </p>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:18px 0 0;text-align:center;">
      If you have any outstanding balances, please settle them directly with the group admin.
      If you think this was a mistake, contact support.
    </p>
    ${button(supportUrl, 'Contact Support')}
  `);
}

export function accountDeactivatedEmail(
  name: string,
  supportUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128683;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Account Deactivated
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
        Hi ${name}, your Dabbu account has been deactivated.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.1);border-radius:10px;padding:16px;margin:0 0 20px;">
      <tr>
        <td style="font-size:14px;color:${TEXT};line-height:1.5;">
          Your data will be retained for 30 days. After that, all your data will be permanently deleted.
          If you want to reactivate your account, please contact support within 30 days.
        </td>
      </tr>
    </table>
    ${button(supportUrl, 'Contact Support')}
  `);
}

export function accountReactivatedEmail(
  name: string,
  dashboardUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,0.15);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#127881;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        Account Reactivated
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
        Welcome back, ${name}! Your Dabbu account has been reactivated.
      </p>
    </div>
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 0;text-align:center;">
      All your data is intact. Pick up right where you left off.
    </p>
    ${button(dashboardUrl, 'Go to Dashboard')}
  `);
}

export function newDeviceLoginEmail(
  name: string,
  deviceName: string,
  platform: string,
  timestamp: string,
  ipAddress: string,
  securityUrl: string,
): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${ACCENT_LIGHT};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">&#128187;</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
        New Device Login
      </h1>
      <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.7;margin:0;">
        A new device signed into your Dabbu account.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(108,62,244,0.08),rgba(91,46,217,0.04));border:1px solid ${CARD_BORDER};border-radius:12px;padding:18px;margin:0 0 24px;">
      <tr>
        <td style="font-size:14px;color:${TEXT_MUTED};line-height:2;">
          <strong style="color:${ACCENT};">Device:</strong> ${deviceName}<br />
          <strong style="color:${ACCENT};">Platform:</strong> ${platform}<br />
          <strong style="color:${ACCENT};">Time:</strong> ${timestamp}<br />
          <strong style="color:${ACCENT};">IP:</strong> ${ipAddress}
        </td>
      </tr>
    </table>
    ${button(securityUrl, 'Review Activity')}
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.6;margin:16px 0 0;text-align:center;">
      Didn't recognize this device? <a href="${securityUrl}" style="color:${ERROR};font-weight:600;">Secure your account</a>
    </p>
  `);
}
