import React, { useState, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: any; // undefined for create
  onSubmit: (payload: any) => Promise<void>;
  isSubmitting?: boolean;
};

const doseForms = ["tablet","capsule","liquid","patch","injection","inhaler","other"];
const routes = ["po","sl","iv","im","topical","inh","other"];

export default function MedicationFormModal({ open, onClose, initial, onSubmit, isSubmitting = false }: Props) {
  const [form, setForm] = useState<any>({
    name: "",
    generic_name: "",
    dose_strength: "",
    dose_form: "",
    route: "",
    frequency: "",
    directions: "",
    indication: "",
    start_date: "",
    end_date: "",
    is_active: true,
    prescribing_provider: "",
    pharmacy: "",
    ndc_code: "",
    refills_remaining: 0,
    total_refills: 0,
    last_filled_date: "",
    notes: "",
    source_document_id: "",
    reminder_enabled: false,
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || "",
          generic_name: initial.generic_name || "",
          dose_strength: initial.dose_strength || "",
          dose_form: initial.dose_form || "",
          route: initial.route || "",
          frequency: initial.frequency || "",
          directions: initial.directions || "",
          indication: initial.indication || "",
          start_date: initial.start_date || "",
          end_date: initial.end_date || "",
          is_active: initial.is_active ?? true,
          prescribing_provider: initial.prescribing_provider || "",
          pharmacy: initial.pharmacy || "",
          ndc_code: initial.ndc_code || "",
          refills_remaining: initial.refills_remaining ?? 0,
          total_refills: initial.total_refills ?? 0,
          last_filled_date: initial.last_filled_date || "",
          notes: initial.notes || "",
          source_document_id: initial.source_document_id || "",
          reminder_enabled: initial.reminder_enabled ?? false,
        });
      } else {
        // Reset form when no initial data
        setForm({
          name: "",
          generic_name: "",
          dose_strength: "",
          dose_form: "",
          route: "",
          frequency: "",
          directions: "",
          indication: "",
          start_date: "",
          end_date: "",
          is_active: true,
          prescribing_provider: "",
          pharmacy: "",
          ndc_code: "",
          refills_remaining: 0,
          total_refills: 0,
          last_filled_date: "",
          notes: "",
          source_document_id: "",
          reminder_enabled: false,
        });
      }
    }
    // eslint-disable-next-line
  }, [initial, open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    // Convert empty strings to null for date fields, but keep other fields as empty strings
    ["start_date","end_date","last_filled_date"].forEach(k => {
      if (payload[k] === "") payload[k] = null;
    });
    // Ensure all string fields are never null
    const stringFields = ["name", "generic_name", "dose_strength", "dose_form", "route", "frequency", "directions", "indication", "prescribing_provider", "pharmacy", "ndc_code", "notes"];
    stringFields.forEach(field => {
      if (payload[field] === null || payload[field] === undefined) {
        payload[field] = "";
      }
    });
    await onSubmit(payload);
    onClose();
  };

  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">{initial ? "Edit medication" : "Add medication"}</h2>
          <button onClick={onClose} aria-label="Close" className="modal-close">✕</button>
        </div>

        <form onSubmit={submit} className="modal-form">
          <label>
            Name*
            <input required
              value={form.name} onChange={e=>set("name", e.target.value)} placeholder="Lipitor" />
          </label>
          <label>
            Generic name
            <input
              value={form.generic_name} onChange={e=>set("generic_name", e.target.value)} placeholder="Atorvastatin" />
          </label>

          <label>
            Dose strength*
            <input required
              value={form.dose_strength} onChange={e=>set("dose_strength", e.target.value)} placeholder="20 mg" />
          </label>
          <label>
            Frequency*
            <input required
              value={form.frequency} onChange={e=>set("frequency", e.target.value)} placeholder="1 tab daily" />
          </label>

          <label>
            Dose form
            <select value={form.dose_form} onChange={e=>set("dose_form", e.target.value)}>
              <option value="">—</option>
              {doseForms.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>
            Route
            <select value={form.route} onChange={e=>set("route", e.target.value)}>
              <option value="">—</option>
              {routes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label className="full-width">
            Directions
            <textarea rows={2}
              value={form.directions} onChange={e=>set("directions", e.target.value)} placeholder="Take with food in the morning" />
          </label>

          <label>
            Indication
            <input
              value={form.indication} onChange={e=>set("indication", e.target.value)} placeholder="Hyperlipidemia" />
          </label>

          <label>
            Start date
            <input type="date"
              value={form.start_date ?? ""} onChange={e=>set("start_date", e.target.value)} />
          </label>
          <label>
            End date
            <input type="date"
              value={form.end_date ?? ""} onChange={e=>set("end_date", e.target.value)} />
          </label>

          <label className="full-width">
            <input type="checkbox" checked={!!form.is_active} onChange={e=>set("is_active", e.target.checked)} />
            Active
          </label>
          <label className="full-width">
            <input type="checkbox" checked={!!form.reminder_enabled} onChange={e=>set("reminder_enabled", e.target.checked)} />
            Enable reminders
          </label>

          <label>
            Prescriber
            <input
              value={form.prescribing_provider} onChange={e=>set("prescribing_provider", e.target.value)} placeholder="Dr. Smith" />
          </label>
          <label>
            Pharmacy
            <input
              value={form.pharmacy} onChange={e=>set("pharmacy", e.target.value)} placeholder="Walgreens #1234" />
          </label>

          <label>
            NDC code
            <input
              value={form.ndc_code} onChange={e=>set("ndc_code", e.target.value)} placeholder="00071-0155-23" />
          </label>
          <label>
            Last filled
            <input type="date"
              value={form.last_filled_date ?? ""} onChange={e=>set("last_filled_date", e.target.value)} />
          </label>

          <label>
            Refills remaining
            <input type="number" min={0}
              value={form.refills_remaining} onChange={e=>set("refills_remaining", Number(e.target.value))} />
          </label>
          <label>
            Total refills
            <input type="number" min={0}
              value={form.total_refills} onChange={e=>set("total_refills", Number(e.target.value))} />
          </label>

          <label className="full-width">
            Notes
            <textarea rows={2}
              value={form.notes} onChange={e=>set("notes", e.target.value)} placeholder="Any special notes..." />
          </label>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button subtle" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (initial ? "Save changes" : "Add medication")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
