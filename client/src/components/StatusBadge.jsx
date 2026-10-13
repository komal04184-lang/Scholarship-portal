import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  CreditCard,
  FileText,
} from 'lucide-react';

export default function StatusBadge({ status, size = 'sm' }) {
  const norm = (status || '').toUpperCase();

  switch (norm) {
    case 'APPROVED':
      return (
        <span className={`badge badge-approved ${size === 'lg' ? 'btn-lg' : ''}`}>
          <CheckCircle size={14} /> Approved
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`badge badge-review ${size === 'lg' ? 'btn-lg' : ''}`}>
          <Clock size={14} /> Under Review
        </span>
      );
    case 'SUBMITTED':
    case 'PENDING':
      return (
        <span className={`badge badge-pending ${size === 'lg' ? 'btn-lg' : ''}`}>
          <FileText size={14} /> Submitted
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`badge badge-rejected ${size === 'lg' ? 'btn-lg' : ''}`}>
          <XCircle size={14} /> Rejected
        </span>
      );
    case 'DISBURSED':
      return (
        <span className={`badge badge-disbursed ${size === 'lg' ? 'btn-lg' : ''}`}>
          <CreditCard size={14} /> Disbursed
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="badge badge-approved">
          <CheckCircle size={12} /> Active
        </span>
      );
    default:
      return (
        <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#94A3B8' }}>
          {status || 'Unknown'}
        </span>
      );
  }
}
