const PRIMARY = '#EA580C';
const PRIMARY_LIGHT = '#FED7AA';
const PRIMARY_DARK = '#C2410C';
const BG = '#F8FAFC';
const CARD = '#FFFFFF';
const TEXT = '#1E293B';
const TEXT_MUTED = '#64748B';
const BORDER = '#E2E8F0';

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dabbu</title>
  <style type="text/css">
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BG}; color: ${TEXT}; }
    a { color: ${PRIMARY}; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 24px 20px !important; }
      .logo-text { font-size: 24px !important; }
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
                  <td style="background:linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK});border-radius:10px;padding:10px 24px;">
                    <span style="font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">Dabbu</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="content" style="background-color:${CARD};border-radius:12px;padding:40px 40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <span style="font-size:13px;color:${TEXT_MUTED};">
                      &copy; ${new Date().getFullYear()} Dabbu. All rights reserved.
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:4px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="{{privacyUrl}}" style="font-size:13px;color:${TEXT_MUTED};text-decoration:underline;">Privacy Policy</a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="{{termsUrl}}" style="font-size:13px;color:${TEXT_MUTED};text-decoration:underline;">Terms of Service</a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="mailto:support@dabbu.app" style="font-size:13px;color:${TEXT_MUTED};text-decoration:underline;">Support</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <span style="font-size:12px;color:${TEXT_MUTED};line-height:18px;">
                      Made with &hearts; in India
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
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
    <tr>
      <td align="center" style="background:linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK});border-radius:8px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;line-height:20px;letter-spacing:0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;" />`;
}

function featureList(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
      <td style="padding:6px 0;font-size:14px;color:${TEXT};">
        <span style="color:${PRIMARY};font-weight:700;margin-right:8px;">&#10003;</span>${item}
      </td>
    </tr>`,
    )
    .join('');
  return `<table cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

export function welcomeEmail(name: string, dashboardUrl: string): string {
  return baseTemplate(`
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Welcome to Dabbu, ${name}! 🎉
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      We're thrilled to have you on board. Dabbu helps you track expenses, manage budgets, 
      and take control of your finances — all in one place.
    </p>
    ${divider()}
    <h2 style="font-size:16px;font-weight:600;color:${TEXT};margin:0 0 16px;">What you can do with Dabbu:</h2>
    ${featureList([
      'Track income & expenses effortlessly',
      'Create and manage budgets',
      'Scan receipts with OCR',
      'Share expenses with family & groups',
      'Get AI-powered insights',
      'Set financial goals',
    ])}
    ${button(dashboardUrl, 'Go to Dashboard')}
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:16px 0 0;">
      If you have any questions, just reply to this email or reach out to 
      <a href="mailto:support@dabbu.app" style="color:${PRIMARY};font-weight:500;">support@dabbu.app</a>.
    </p>
  `);
}

export function forgotPasswordEmail(
  name: string,
  resetUrl: string,
  expiresInMinutes: number,
): string {
  return baseTemplate(`
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Reset Your Password
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      Hi ${name}, we received a request to reset your Dabbu account password. 
      Click the button below to create a new password.
    </p>
    ${button(resetUrl, 'Reset Password')}
    <p style="font-size:14px;color:${TEXT_MUTED};line-height:1.6;margin:16px 0 0;">
      This link expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't request 
      this, you can safely ignore this email.
    </p>
    ${divider()}
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.5;margin:0;">
      <strong>Security notice:</strong> Never share this link with anyone. Dabbu will 
      never ask for your password or reset link via email or phone.
    </p>
  `);
}

export function passwordChangedEmail(name: string, timestamp: string): string {
  return baseTemplate(`
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Password Changed Successfully
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      Hi ${name}, your Dabbu account password was changed on <strong>${timestamp}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border-radius:8px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:14px;color:#991B1B;line-height:1.5;">
          <strong>&#9888; Didn't do this?</strong> If you didn't change your password, 
          please <a href="mailto:support@dabbu.app" style="color:${PRIMARY};font-weight:600;">contact support</a> 
          immediately to secure your account.
        </td>
      </tr>
    </table>
    ${button('https://web-omega-snowy-80.vercel.app/login', 'Go to Login')}
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.5;margin:16px 0 0;">
      This is an automated security notification. No action is needed if you made this change.
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
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Welcome to Dabbu Premium! 🚀
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      Congratulations ${name}! You're now on the <strong>${planName}</strong> plan. 
      Your premium features are active and ready to use.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#FEF7EE,#FFEDD5);border-radius:8px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:14px;color:${TEXT};line-height:1.8;">
          <strong style="color:${PRIMARY};">Plan:</strong> ${planName}<br />
          <strong style="color:${PRIMARY};">Billing:</strong> ${billingCycle}<br />
          <strong style="color:${PRIMARY};">Started:</strong> ${startDate}
        </td>
      </tr>
    </table>
    <h2 style="font-size:16px;font-weight:600;color:${TEXT};margin:0 0 12px;">Premium Features Unlocked:</h2>
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
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Premium Subscription Renewed
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      Hi ${name}, your Dabbu Premium subscription has been successfully renewed.
      All your premium features are active.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#FEF7EE,#FFEDD5);border-radius:8px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:14px;color:${TEXT};line-height:1.8;">
          <strong style="color:${PRIMARY};">Renewal Date:</strong> ${renewalDate}<br />
          <strong style="color:${PRIMARY};">Next Billing:</strong> ${nextBillingDate}<br />
          <strong style="color:${PRIMARY};">Amount Charged:</strong> ${amount}
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
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Your Premium Plan Is Expiring Soon
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      Hi ${name}, your Dabbu Premium subscription will expire in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong> 
      on <strong>${expiryDate}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border-radius:8px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:14px;color:#991B1B;line-height:1.5;">
          After expiry, you'll lose access to premium features including unlimited groups, 
          advanced analytics, OCR scanning, and more.
        </td>
      </tr>
    </table>
    ${button(renewUrl, 'Renew Premium')}
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.5;margin:16px 0 0;">
      No action needed if you've already renewed.
    </p>
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
    <h1 style="font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.3;">
      Action Required: Payment Failed
    </h1>
    <p style="font-size:15px;color:${TEXT_MUTED};line-height:1.6;margin:0 0 20px;">
      Hi ${name}, we were unable to process the payment for your <strong>${planName}</strong> 
      subscription of <strong>${amount}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border-radius:8px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:14px;color:#991B1B;line-height:1.5;">
          <strong>&#9888; What happened?</strong> Your payment method was declined. 
          Your premium features will remain active for now, but please update your 
          payment method to avoid interruption.
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
      <tr>
        <td align="center" style="background:linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK});border-radius:8px;">
          <a href="${retryUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;line-height:20px;letter-spacing:0.3px;">Retry Payment</a>
        </td>
        <td width="12"></td>
        <td align="center" style="border:2px solid ${PRIMARY};border-radius:8px;">
          <a href="${updatePaymentUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:${PRIMARY};text-decoration:none;line-height:20px;letter-spacing:0.3px;">Update Payment Method</a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.5;margin:20px 0 0;">
      Need help? <a href="mailto:support@dabbu.app" style="color:${PRIMARY};font-weight:500;">Contact support</a>
    </p>
  `);
}
