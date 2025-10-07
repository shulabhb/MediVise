import React from "react";

type Props = {
  medication: any;
  onEdit: (m: any) => void;
  onDelete: (m: any) => void;
};

export default function MedicationCard({ medication, onEdit, onDelete }: Props) {
  const {
    name,
    generic_name,
    dose_strength,
    dose_form,
    route,
    frequency,
    directions,
    indication,
    is_active,
    prescribing_provider,
    pharmacy,
    refills_remaining,
    total_refills,
    last_filled_date,
    start_date,
    end_date,
    reminder_enabled,
  } = medication;

  return (
    <div className="medication-card">
      <div className="medication-header">
        <div className="medication-title-section">
          <div className="medication-status">
            <span
              className={`status-dot ${is_active ? "active" : "inactive"}`}
              role="img"
              aria-label={is_active ? "Active medication" : "Inactive medication"}
              title={is_active ? "Active" : "Inactive"}
            />
            <h3 className="medication-name">
              {name}
              {generic_name && (
                <span className="generic-name">({generic_name})</span>
              )}
            </h3>
          </div>
        </div>
        <div className="medication-actions">
          <button
            onClick={() => onEdit(medication)}
            className="button subtle edit-btn"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(medication)}
            className="button delete-btn"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="medication-details">
        <div className="detail-row">
          <span className="detail-label">Strength:</span>
          <span className="detail-value">
            {dose_strength}
            {dose_form && ` • ${dose_form}`}
            {route && ` • ${route.toUpperCase()}`}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Frequency:</span>
          <span className="detail-value">{frequency}</span>
        </div>
        {directions && (
          <div className="detail-row full-width">
            <span className="detail-label">Directions:</span>
            <span className="detail-value">{directions}</span>
          </div>
        )}
        {indication && (
          <div className="detail-row">
            <span className="detail-label">Indication:</span>
            <span className="detail-value">{indication}</span>
          </div>
        )}
        {prescribing_provider && (
          <div className="detail-row">
            <span className="detail-label">Prescriber:</span>
            <span className="detail-value">{prescribing_provider}</span>
          </div>
        )}
        {pharmacy && (
          <div className="detail-row">
            <span className="detail-label">Pharmacy:</span>
            <span className="detail-value">{pharmacy}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Refills:</span>
          <span className="detail-value">{refills_remaining}/{total_refills}</span>
        </div>
        {last_filled_date && (
          <div className="detail-row">
            <span className="detail-label">Last filled:</span>
            <span className="detail-value">{last_filled_date}</span>
          </div>
        )}
        {(start_date || end_date) && (
          <div className="detail-row full-width">
            <span className="detail-label">Duration:</span>
            <span className="detail-value">
              {start_date ?? "—"} → {end_date ?? "—"}
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
