import React from 'react';
import { BadgeCheck, FlaskConical } from 'lucide-react';
import { STATUS_LABEL } from '../../utils/format.js';

export const VerifiedBadge = ({ small }) => (
  <span className={`badge verified ${small ? 'sm' : ''}`} title="Approved by an administrator">
    <BadgeCheck size={small ? 13 : 15} aria-hidden="true" /> Verified
  </span>
);

export const DemoBadge = ({ small }) => (
  <span className={`badge demo ${small ? 'sm' : ''}`} title="An illustrative example, not a confirmed business">
    <FlaskConical size={small ? 12 : 14} aria-hidden="true" /> Demo Listing
  </span>
);

/** Open / Closed / Opens Soon (the server works this out from the stored business hours). */
export function OpenStatusPill({ status, withDetail = false }) {
  if (!status || status.state === 'unknown') return null;
  return (
    <span className={`openpill ${status.state}`}>
      <i aria-hidden="true" />
      {status.label}
      {withDetail && status.detail ? <span className="openpill-detail"> · {status.detail}</span> : null}
    </span>
  );
}

export const StatusChip = ({ status }) => <span className={`statuschip ${status}`}>{STATUS_LABEL[status] || status}</span>;
