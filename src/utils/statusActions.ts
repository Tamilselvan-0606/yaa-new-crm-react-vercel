/**
 * Suspend / Inactive buttons are toggles: pressing "Suspend" on a Suspended record resumes it, and the same
 * goes for Inactive. These helpers keep that rule (and its wording) in one place for Branches, Products, etc.
 */
export type StatusToggle = 'Suspend' | 'Inactive';
type Status = 'Active' | 'Inactive' | 'Suspended';

const TARGET: Record<StatusToggle, Exclude<Status, 'Active'>> = { Suspend: 'Suspended', Inactive: 'Inactive' };

/** Status the record should move to when the toggle is confirmed. */
export const nextStatus = (toggle: StatusToggle, current?: string | null): Status =>
  current === TARGET[toggle] ? 'Active' : TARGET[toggle];

/** "Yes, Resume" / "Yes, Suspend" / "Yes, Activate" / "Yes, Inactive" */
export const confirmButtonLabel = (toggle: StatusToggle, current?: string | null): string => {
  if (nextStatus(toggle, current) === 'Active') return toggle === 'Suspend' ? 'Yes, Resume' : 'Yes, Activate';
  return toggle === 'Suspend' ? 'Yes, Suspend' : 'Yes, Inactive';
};
