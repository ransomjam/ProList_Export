import { Fragment } from "react";
import { ArrowRight, CheckCircle2, Clock, QrCode } from "lucide-react";

import { DOC_METADATA } from "@/features/shipments/docMeta";
import type { SubmissionPackDocumentSummary } from "@/features/shipments/types";

interface SubmissionPackPreviewProps {
  packName: string;
  shipmentReference: string;
  submittedAtText: string;
  submittedBy: string;
  route: string;
  mode: string;
  incoterm: string;
  buyer: string;
  readinessHighlights: string[];
  documents: SubmissionPackDocumentSummary[];
  helperLine?: string;
}

const modeLabelMap: Record<string, string> = {
  AIR: "Air freight",
  SEA: "Sea freight",
  ROAD: "Road freight",
};

const modeAccentMap: Record<string, string> = {
  AIR: "bg-sky-50 text-sky-700",
  SEA: "bg-blue-50 text-blue-700",
  ROAD: "bg-amber-50 text-amber-700",
};

export const SubmissionPackPreview = ({
  packName,
  shipmentReference,
  submittedAtText,
  submittedBy,
  route,
  mode,
  incoterm,
  buyer,
  readinessHighlights,
  documents,
  helperLine,
}: SubmissionPackPreviewProps) => {
  const [origin, destination] = route.split("→").map(part => part.trim());
  const modeLabel = modeLabelMap[mode] ?? mode;
  const modeAccent = modeAccentMap[mode] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="text-sm font-medium text-muted-foreground">{packName} · Cover sheet preview</div>
      <div className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_25px_65px_-35px_rgba(15,23,42,0.45)]">
        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 md:p-12">
          <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                ProList Export · Submission Pack
              </span>
              <div>
                <h2 className="text-3xl font-semibold text-slate-900">{shipmentReference}</h2>
                <p className="text-sm text-slate-500">Submitted {submittedAtText} by {submittedBy}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  Submitted
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-widest text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> Generated on {helperLine ?? submittedAtText}
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 text-right shadow-inner">
              <p className="text-xs uppercase tracking-widest text-slate-500">Prepared for</p>
              <p className="text-lg font-semibold text-slate-900">{buyer}</p>
              <p className="text-sm text-slate-500">Incoterm {incoterm}</p>
            </div>
          </header>

          <section className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Route
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-sm font-medium text-slate-800">
                    {origin && destination ? (
                      <Fragment>
                        <span>{origin}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>{destination}</span>
                      </Fragment>
                    ) : (
                      route
                    )}
                  </span>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${modeAccent}`}>
                    {modeLabel}
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  <p className="text-sm font-medium uppercase tracking-widest text-slate-500">Readiness checklist</p>
                  <div className="space-y-2">
                    {readinessHighlights.map((line, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span>{line}</span>
                      </div>
                    ))}
                    {readinessHighlights.length === 0 && (
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span>All submission checks passed.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-widest text-slate-500">Quick indices</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {documents.slice(0, 6).map(doc => {
                    const meta = DOC_METADATA[doc.key];
                    const Icon = meta?.icon ?? DOC_METADATA.INVOICE.icon;
                    return (
                      <span
                        key={doc.key}
                        className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm`}
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${meta?.accentBg ?? "bg-slate-100"}`}>
                          <Icon className={`h-3.5 w-3.5 ${meta?.accent ?? "text-slate-600"}`} />
                        </span>
                        {doc.label}
                      </span>
                    );
                  })}
                </div>
                {documents.length > 6 && (
                  <p className="mt-3 text-xs text-slate-500">+{documents.length - 6} more included</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-widest text-slate-500">Included documents</p>
              <div className="mt-4 space-y-4">
                {documents.map(doc => {
                  const meta = DOC_METADATA[doc.key];
                  const Icon = meta?.icon ?? DOC_METADATA.INVOICE.icon;
                  return (
                    <div key={doc.key} className="flex items-start gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${meta?.accentBg ?? "bg-slate-100"}`}>
                        <Icon className={`h-5 w-5 ${meta?.accent ?? "text-slate-600"}`} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{doc.label}</p>
                        <p className="text-xs text-slate-500">
                          {doc.versionLabel ? `${doc.versionLabel}` : "Latest version"}
                          {doc.statusLabel ? ` · ${doc.statusLabel}` : ""}
                        </p>
                        {doc.note && <p className="text-xs text-slate-400">{doc.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-xs text-slate-500">Latest approved versions are included.</p>
            </div>
          </section>
        </div>
        <footer className="flex flex-col gap-4 border-t border-slate-200 bg-slate-900/95 px-8 py-6 text-slate-100 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
              <QrCode className="h-6 w-6 text-slate-200" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Pack ID</p>
              <p className="text-sm font-medium">{packName.replace(/\s+/g, "-")}</p>
            </div>
          </div>
          <p className="text-xs text-slate-300">Generated by ProList Demo · Not a legal document</p>
        </footer>
      </div>
    </div>
  );
};
