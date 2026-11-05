import type { EditorTemplate } from '../../components/common/RichTextEditor';

// Email templates offered by the announcement editor. (Announcements themselves come from the API.)
export const EMAIL_TEMPLATES: EditorTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    description: 'Greet organizations and share the next steps',
    html:
      '<h2>Welcome to the platform</h2>' +
      '<p>Hello team,</p>' +
      '<p>We are glad to have you with us. Your account is ready, and you can start managing your organization right away.</p>' +
      '<ul><li>Complete your organization profile</li><li>Add your branches and products</li><li>Invite your team</li></ul>' +
      '<p>If you need any help, our support team is always here for you.</p>' +
      '<p>Regards,<br>Platform Team</p>',
  },
  {
    id: 'maintenance',
    name: 'Scheduled Maintenance',
    description: 'Tell organizations about planned downtime',
    html:
      '<h2>Scheduled maintenance</h2>' +
      '<div class="rte-callout"><strong>Heads up:</strong> The platform will be unavailable for a short time during maintenance.</div>' +
      '<table><tbody><tr><th>Date</th><th>Time</th><th>Expected downtime</th></tr>' +
      '<tr><td>DD / MM / YYYY</td><td>00:00 - 02:00</td><td>About 2 hours</td></tr></tbody></table>' +
      '<p>Please save your work before the maintenance window starts. Thank you for your patience.</p>',
  },
  {
    id: 'feature',
    name: 'New Feature Release',
    description: 'Announce a new feature or improvement',
    html:
      '<h2>What is new</h2>' +
      '<p>We have just released an update that makes your work easier:</p>' +
      '<ul><li><strong>Feature name</strong> - short description of the benefit</li><li><strong>Improvement</strong> - what is faster or simpler now</li></ul>' +
      '<blockquote>Tell us what you think. Your feedback shapes what we build next.</blockquote>',
  },
  {
    id: 'payment',
    name: 'Subscription Renewal Reminder',
    description: 'Remind organizations about an upcoming renewal',
    html:
      '<h2>Your subscription renews soon</h2>' +
      '<p>This is a friendly reminder that your subscription is due for renewal.</p>' +
      '<div class="rte-callout"><strong>Renewal date:</strong> DD / MM / YYYY</div>' +
      '<p>Renew before the due date to continue without interruption.</p>',
  },
  {
    id: 'holiday',
    name: 'Holiday Notice',
    description: 'Share holiday timings and support availability',
    html:
      '<h2>Holiday notice</h2>' +
      '<p>Our team will be on leave on <strong>DD / MM / YYYY</strong> for the holiday.</p>' +
      '<p>Support requests raised during this time will be answered on the next working day.</p>' +
      '<p>Wishing you a wonderful holiday! 🎉</p>',
  },
];
