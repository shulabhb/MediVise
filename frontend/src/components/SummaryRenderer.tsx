import React from 'react';

// Minimal type to avoid cross-file import churn
export type SummaryResponse = {
  doc_id?: number;
  style?: string;
  sections: { title: string; bullets?: string[]; citations?: string[] }[];
  risks?: { code: string; severity: string; rationale: string; citations?: string[] }[];
};

export default function SummaryRenderer({ data }: { data: SummaryResponse }) {
  if (!data || !Array.isArray(data.sections) || data.sections.length === 0) return null;
  return (
    <div className="prose prose-invert max-w-none">
      {data.sections.map((sec, i) => (
        <section key={i} className="mb-4">
          <h4 className="font-semibold mb-1">{sec.title}</h4>
          {Array.isArray(sec.bullets) && sec.bullets.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {sec.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      {Array.isArray(data.risks) && data.risks.length > 0 ? (
        <section className="mt-4">
          <h4 className="font-semibold mb-1">Risks</h4>
          <ul className="list-disc pl-5 space-y-1">
            {data.risks.map((r, k) => (
              <li key={k}>
                <span className="font-medium">{r.code}</span> — {r.severity}. {r.rationale}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
