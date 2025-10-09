import React from "react";

type Props = {
  appointment: any;
  onEdit: (a: any) => void;
  onDelete: (a: any) => void;
};

export default function AppointmentCard({ appointment, onEdit, onDelete }: Props) {
  const {
    title,
    description,
    appointment_type,
    status,
    scheduled_date,
    duration_minutes,
    location,
    is_virtual,
    meeting_link,
    provider_name,
    provider_specialty,
    provider_phone,
    preparation_instructions,
    notes,
    reminder_enabled,
    estimated_cost,
    insurance_covered,
    copay_amount,
  } = appointment;

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'confirmed': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      case 'no_show': return '#f59e0b';
      case 'rescheduled': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return '📅';
      case 'confirmed': return '✅';
      case 'completed': return '✔️';
      case 'cancelled': return '❌';
      case 'no_show': return '⚠️';
      case 'rescheduled': return '🔄';
      default: return '📅';
    }
  };

  const dateTime = formatDateTime(scheduled_date);

  return (
    <div className="appointment-card">
      <div className="appointment-header">
        <div className="appointment-title-section">
          <div className="appointment-status">
            <span
              className="status-dot"
              style={{ backgroundColor: getStatusColor(status) }}
              role="img"
              aria-label={`${status} appointment`}
              title={status.charAt(0).toUpperCase() + status.slice(1)}
            >
              {getStatusIcon(status)}
            </span>
            <h3 className="appointment-name">
              {title}
              {appointment_type && (
                <span className="appointment-type">({appointment_type.replace('_', ' ')})</span>
              )}
            </h3>
          </div>
        </div>
        <div className="appointment-actions">
          <button
            onClick={() => onEdit(appointment)}
            className="button subtle edit-btn"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(appointment)}
            className="button delete-btn"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="appointment-details">
        <div className="detail-row">
          <span className="detail-label">Date:</span>
          <span className="detail-value">{dateTime.date}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Time:</span>
          <span className="detail-value">{dateTime.time} ({duration_minutes} min)</span>
        </div>
        
        {provider_name && (
          <div className="detail-row">
            <span className="detail-label">Provider:</span>
            <span className="detail-value">
              {provider_name}
              {provider_specialty && ` • ${provider_specialty}`}
            </span>
          </div>
        )}

        {location && (
          <div className="detail-row">
            <span className="detail-label">Location:</span>
            <span className="detail-value">
              {is_virtual ? '🌐 Virtual' : '📍'} {location}
            </span>
          </div>
        )}

        {meeting_link && (
          <div className="detail-row">
            <span className="detail-label">Meeting:</span>
            <span className="detail-value">
              <a href={meeting_link} target="_blank" rel="noopener noreferrer" className="meeting-link">
                Join Meeting
              </a>
            </span>
          </div>
        )}

        {provider_phone && (
          <div className="detail-row">
            <span className="detail-label">Phone:</span>
            <span className="detail-value">
              <a href={`tel:${provider_phone}`} className="phone-link">
                {provider_phone}
              </a>
            </span>
          </div>
        )}

        {description && (
          <div className="detail-row full-width">
            <span className="detail-label">Description:</span>
            <span className="detail-value">{description}</span>
          </div>
        )}

        {preparation_instructions && (
          <div className="detail-row full-width">
            <span className="detail-label">Preparation:</span>
            <span className="detail-value">{preparation_instructions}</span>
          </div>
        )}

        {notes && (
          <div className="detail-row full-width">
            <span className="detail-label">Notes:</span>
            <span className="detail-value">{notes}</span>
          </div>
        )}

        {(estimated_cost || copay_amount) && (
          <div className="detail-row">
            <span className="detail-label">Cost:</span>
            <span className="detail-value">
              {estimated_cost && `$${estimated_cost}`}
              {copay_amount && ` (Copay: $${copay_amount})`}
              {insurance_covered !== null && (
                <span className={`insurance-status ${insurance_covered ? 'covered' : 'not-covered'}`}>
                  {insurance_covered ? ' ✓ Covered' : ' ✗ Not Covered'}
                </span>
              )}
            </span>
          </div>
        )}

        <div className="detail-row">
          <span className="detail-label">Reminders:</span>
          <span className="detail-value">{reminder_enabled ? "On" : "Off"}</span>
        </div>
      </div>
    </div>
  );
}
