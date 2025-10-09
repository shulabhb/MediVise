import React, { useState, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: any; // undefined for create
  onSubmit: (payload: any) => Promise<void>;
  isSubmitting?: boolean;
};

const appointmentTypes = ["consultation","follow_up","checkup","procedure","emergency","therapy","other"];
const appointmentStatuses = ["scheduled","confirmed","completed","cancelled","no_show","rescheduled"];

export default function AppointmentFormModal({ open, onClose, initial, onSubmit, isSubmitting = false }: Props) {
  const [form, setForm] = useState<any>({
    title: "",
    description: null,
    appointment_type: null,
    status: "scheduled",
    scheduled_date: "",
    duration_minutes: 30,
    end_time: null,
    location: null,
    address: null,
    phone: null,
    is_virtual: false,
    meeting_link: null,
    provider_name: null,
    provider_specialty: null,
    provider_phone: null,
    provider_email: null,
    preparation_instructions: null,
    notes: null,
    symptoms: null,
    questions_for_provider: null,
    reminder_enabled: true,
    reminder_minutes_before: 60,
    email_reminder: true,
    sms_reminder: false,
    related_medication_ids: null,
    related_document_ids: null,
    follow_up_required: false,
    follow_up_date: null,
    estimated_cost: null,
    insurance_covered: null,
    copay_amount: null,
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title || "",
          description: initial.description || null,
          appointment_type: initial.appointment_type || null,
          status: initial.status || "scheduled",
          scheduled_date: initial.scheduled_date ? new Date(initial.scheduled_date).toISOString().slice(0, 16) : "",
          duration_minutes: initial.duration_minutes ?? 30,
          end_time: initial.end_time ? new Date(initial.end_time).toISOString().slice(0, 16) : null,
          location: initial.location || null,
          address: initial.address || null,
          phone: initial.phone || null,
          is_virtual: initial.is_virtual ?? false,
          meeting_link: initial.meeting_link || null,
          provider_name: initial.provider_name || null,
          provider_specialty: initial.provider_specialty || null,
          provider_phone: initial.provider_phone || null,
          provider_email: initial.provider_email || null,
          preparation_instructions: initial.preparation_instructions || null,
          notes: initial.notes || null,
          symptoms: initial.symptoms || null,
          questions_for_provider: initial.questions_for_provider || null,
          reminder_enabled: initial.reminder_enabled ?? true,
          reminder_minutes_before: initial.reminder_minutes_before ?? 60,
          email_reminder: initial.email_reminder ?? true,
          sms_reminder: initial.sms_reminder ?? false,
          related_medication_ids: initial.related_medication_ids || null,
          related_document_ids: initial.related_document_ids || null,
          follow_up_required: initial.follow_up_required ?? false,
          follow_up_date: initial.follow_up_date ? new Date(initial.follow_up_date).toISOString().slice(0, 16) : null,
          estimated_cost: initial.estimated_cost || null,
          insurance_covered: initial.insurance_covered || null,
          copay_amount: initial.copay_amount || null,
        });
      } else {
        // Reset form when no initial data
        setForm({
          title: "",
          description: null,
          appointment_type: null,
          status: "scheduled",
          scheduled_date: "",
          duration_minutes: 30,
          end_time: null,
          location: null,
          address: null,
          phone: null,
          is_virtual: false,
          meeting_link: null,
          provider_name: null,
          provider_specialty: null,
          provider_phone: null,
          provider_email: null,
          preparation_instructions: null,
          notes: null,
          symptoms: null,
          questions_for_provider: null,
          reminder_enabled: true,
          reminder_minutes_before: 60,
          email_reminder: true,
          sms_reminder: false,
          related_medication_ids: null,
          related_document_ids: null,
          follow_up_required: false,
          follow_up_date: null,
          estimated_cost: null,
          insurance_covered: null,
          copay_amount: null,
        });
      }
    }
    // eslint-disable-next-line
  }, [initial, open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    
    // Ensure required fields are not empty
    if (!payload.title || !payload.scheduled_date) {
      alert("Please fill in all required fields (Title, Scheduled Date)");
      return;
    }
    
    // Convert empty strings to null for optional fields
    const optionalFields = [
      "description", "appointment_type", "end_time", "location", "address", "phone", 
      "meeting_link", "provider_name", "provider_specialty", "provider_phone", 
      "provider_email", "preparation_instructions", "notes", "symptoms", 
      "questions_for_provider", "related_medication_ids", "related_document_ids", 
      "follow_up_date", "estimated_cost", "copay_amount"
    ];
    
    optionalFields.forEach(field => {
      if (payload[field] === "" || payload[field] === null || payload[field] === undefined) {
        payload[field] = null;
      }
    });
    
    // Convert boolean fields
    if (payload.insurance_covered === null) {
      delete payload.insurance_covered;
    }
    
    // Convert datetime fields
    if (payload.scheduled_date) {
      payload.scheduled_date = new Date(payload.scheduled_date).toISOString();
    }
    if (payload.end_time) {
      payload.end_time = new Date(payload.end_time).toISOString();
    }
    if (payload.follow_up_date) {
      payload.follow_up_date = new Date(payload.follow_up_date).toISOString();
    }
    
    console.log('Submitting appointment:', payload);
    await onSubmit(payload);
    onClose();
  };

  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">{initial ? "Edit appointment" : "Add appointment"}</h2>
          <button onClick={onClose} aria-label="Close" className="modal-close">✕</button>
        </div>

        <form onSubmit={submit} className="modal-form">
          <label>
            Title*
            <input required
              value={form.title} onChange={e=>set("title", e.target.value)} placeholder="Annual Checkup" />
          </label>
          <label>
            Appointment Type
            <select value={form.appointment_type || ""} onChange={e=>set("appointment_type", e.target.value || null)}>
              <option value="">—</option>
              {appointmentTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label>
            Scheduled Date & Time*
            <input type="datetime-local" required
              value={form.scheduled_date} onChange={e=>set("scheduled_date", e.target.value)} />
          </label>
          <label>
            Duration (minutes)
            <input type="number" min={1}
              value={form.duration_minutes} onChange={e=>set("duration_minutes", Number(e.target.value))} />
          </label>

          <label>
            Status
            <select value={form.status} onChange={e=>set("status", e.target.value)}>
              {appointmentStatuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label className="full-width">
            Description
            <textarea rows={2}
              value={form.description || ""} onChange={e=>set("description", e.target.value || null)} placeholder="Brief description of the appointment" />
          </label>

          <label>
            Provider Name
            <input
              value={form.provider_name || ""} onChange={e=>set("provider_name", e.target.value || null)} placeholder="Dr. Smith" />
          </label>
          <label>
            Provider Specialty
            <input
              value={form.provider_specialty || ""} onChange={e=>set("provider_specialty", e.target.value || null)} placeholder="Cardiology" />
          </label>

          <label>
            Provider Phone
            <input type="tel"
              value={form.provider_phone || ""} onChange={e=>set("provider_phone", e.target.value || null)} placeholder="(555) 123-4567" />
          </label>
          <label>
            Provider Email
            <input type="email"
              value={form.provider_email || ""} onChange={e=>set("provider_email", e.target.value || null)} placeholder="doctor@clinic.com" />
          </label>

          <label>
            Location
            <input
              value={form.location || ""} onChange={e=>set("location", e.target.value || null)} placeholder="Main Clinic" />
          </label>
          <label className="full-width">
            <input type="checkbox" checked={!!form.is_virtual} onChange={e=>set("is_virtual", e.target.checked)} />
            Virtual Appointment
          </label>

          {form.is_virtual && (
            <label className="full-width">
              Meeting Link
              <input type="url"
                value={form.meeting_link || ""} onChange={e=>set("meeting_link", e.target.value || null)} placeholder="https://zoom.us/j/..." />
            </label>
          )}

          <label className="full-width">
            Address
            <textarea rows={2}
              value={form.address || ""} onChange={e=>set("address", e.target.value || null)} placeholder="123 Main St, City, State 12345" />
          </label>

          <label className="full-width">
            Preparation Instructions
            <textarea rows={2}
              value={form.preparation_instructions || ""} onChange={e=>set("preparation_instructions", e.target.value || null)} placeholder="Fast for 12 hours before appointment" />
          </label>

          <label className="full-width">
            Symptoms/Concerns
            <textarea rows={2}
              value={form.symptoms || ""} onChange={e=>set("symptoms", e.target.value || null)} placeholder="Describe any symptoms or concerns" />
          </label>

          <label className="full-width">
            Questions for Provider
            <textarea rows={2}
              value={form.questions_for_provider || ""} onChange={e=>set("questions_for_provider", e.target.value || null)} placeholder="Questions you want to ask during the appointment" />
          </label>

          <label>
            Estimated Cost
            <input type="number" step="0.01" min="0"
              value={form.estimated_cost || ""} onChange={e=>set("estimated_cost", e.target.value ? Number(e.target.value) : null)} placeholder="150.00" />
          </label>
          <label>
            Copay Amount
            <input type="number" step="0.01" min="0"
              value={form.copay_amount || ""} onChange={e=>set("copay_amount", e.target.value ? Number(e.target.value) : null)} placeholder="25.00" />
          </label>

          <label>
            Insurance Coverage
            <select value={form.insurance_covered === null ? "" : form.insurance_covered ? "true" : "false"} onChange={e=>set("insurance_covered", e.target.value === "" ? null : e.target.value === "true")}>
              <option value="">—</option>
              <option value="true">Covered</option>
              <option value="false">Not Covered</option>
            </select>
          </label>

          <label className="full-width">
            <input type="checkbox" checked={!!form.reminder_enabled} onChange={e=>set("reminder_enabled", e.target.checked)} />
            Enable Reminders
          </label>

          {form.reminder_enabled && (
            <>
              <label>
                Reminder (minutes before)
                <input type="number" min={1}
                  value={form.reminder_minutes_before} onChange={e=>set("reminder_minutes_before", Number(e.target.value))} />
              </label>
              <label className="full-width">
                <input type="checkbox" checked={!!form.email_reminder} onChange={e=>set("email_reminder", e.target.checked)} />
                Email Reminder
              </label>
              <label className="full-width">
                <input type="checkbox" checked={!!form.sms_reminder} onChange={e=>set("sms_reminder", e.target.checked)} />
                SMS Reminder
              </label>
            </>
          )}

          <label className="full-width">
            <input type="checkbox" checked={!!form.follow_up_required} onChange={e=>set("follow_up_required", e.target.checked)} />
            Follow-up Required
          </label>

          {form.follow_up_required && (
            <label>
              Follow-up Date
              <input type="datetime-local"
                value={form.follow_up_date || ""} onChange={e=>set("follow_up_date", e.target.value || null)} />
            </label>
          )}

          <label className="full-width">
            Notes
            <textarea rows={2}
              value={form.notes || ""} onChange={e=>set("notes", e.target.value || null)} placeholder="Additional notes..." />
          </label>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button subtle" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (initial ? "Save changes" : "Add appointment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
