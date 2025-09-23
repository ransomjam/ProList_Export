import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray, Controller, type Control } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  useComplianceStore,
  type PhytoFormValues,
  type PhytoProductLine,
  type CooFormValues,
  type ComplianceAttachment,
  type ComplianceEvidence,
  type ComplianceTimelineEntry,
  type ComplianceSubmissionInfo,
} from "@/stores/compliance";
import {
  docStatusLabel,
  normalizeDocStatus,
  type NormalizedDocStatus,
} from "@/utils/docStatus";
import { format } from "date-fns";
import { addDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  ArrowRight,
  ArrowLeft,
  FileText,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

type BuilderFormValues = PhytoFormValues | CooFormValues;

type SubmissionDialogState = {
  open: boolean;
  confirm: boolean;
};

type TimelineEntry = ComplianceTimelineEntry;

type EvidenceItem = ComplianceEvidence;

const submissionStatusMeta: Record<
  NormalizedDocStatus,
  { icon: JSX.Element; tone: string; label: string }
> = {
  submitted: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-sky-500" />,
    tone: "text-sky-600",
    label: "Submitted",
  },
  under_review: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-amber-500" />,
    tone: "text-amber-600",
    label: "Under review",
  },
  rejected: {
    icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
    tone: "text-rose-600",
    label: "Rejected",
  },
  signed: {
    icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
    tone: "text-emerald-600",
    label: "Signed",
  },
  active: {
    icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
    tone: "text-emerald-600",
    label: "Active",
  },
  required: {
    icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
    tone: "text-muted-foreground",
    label: "Required",
  },
  draft: {
    icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
    tone: "text-muted-foreground",
    label: "Draft",
  },
  ready: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    tone: "text-emerald-600",
    label: "Ready",
  },
  expired: {
    icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
    tone: "text-rose-600",
    label: "Expired",
  },
};

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="flex flex-col gap-1">
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
  </div>
);

const PreviewHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-center">
    <p className="text-xs uppercase tracking-widest text-primary">{subtitle}</p>
    <p className="text-lg font-semibold text-foreground">{title}</p>
  </div>
);

const formatDate = (value?: string) => {
  if (!value) return "";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return value;
  }
};

const parseQuantityValue = (value?: string): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value.toString().replace(/,/g, ""));
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const computeProductTotals = (products: PhytoProductLine[]) => {
  const totals = new Map<string, number>();
  products.forEach(product => {
    const quantity = parseQuantityValue(product.quantityValue);
    if (quantity === null) return;
    const unit = product.quantityUnit?.trim() || "unit";
    totals.set(unit, (totals.get(unit) ?? 0) + quantity);
  });
  return Array.from(totals.entries()).map(([unit, total]) => ({ unit, total }));
};

const formatTotalsLabel = (products: PhytoProductLine[]) => {
  const totals = computeProductTotals(products);
  if (totals.length === 0) return "—";
  return totals
    .map(({ unit, total }) => {
      const formatted = new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: 2,
      }).format(total);
      return `${formatted} ${unit}`;
    })
    .join(" • ");
};

const buildPhytoWarnings = (values: PhytoFormValues): string[] => {
  const warnings: string[] = [];
  if (!values.exporterName?.trim()) {
    warnings.push("Add the exporter name exactly as it appears on paperwork.");
  }
  if (!values.consigneeName?.trim()) {
    warnings.push("Add the consignee name before submission.");
  }
  if (!values.destinationCountry?.trim()) {
    warnings.push("Destination country is required for the certificate.");
  }
  const hasValidProduct = values.products.some(
    product => product.botanicalName?.trim() && product.commonName?.trim() && product.quantityValue?.trim()
  );
  if (!hasValidProduct) {
    warnings.push("Capture at least one product with botanical & common name plus quantity.");
  }
  if (!values.inspectionDate) {
    warnings.push("Inspection date required before submission.");
  }
  return warnings;
};

const SubmissionSteps = ({
  trackingId,
  status,
  submittedAt,
  steps,
  ackUrl,
  packetUrl,
}: ComplianceSubmissionInfo) => {
  const normalizedStatus = normalizeDocStatus(status);
  const statusMeta = submissionStatusMeta[normalizedStatus] ?? submissionStatusMeta.submitted;

  return (
    <Card className="border border-border/80">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Submission tracking</CardTitle>
        <CardDescription>
          Submitted on {format(new Date(submittedAt), "dd MMM yyyy HH:mm")}. Tracking ID: {trackingId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex items-center gap-2 text-sm font-medium ${statusMeta.tone}`}>
          {statusMeta.icon}
          {statusMeta.label}
        </div>
        <div className="space-y-3">
          {steps.map(step => {
            const stepStatus =
              step.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : step.status === "rejected" ? (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              );
            return (
              <div key={step.id} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">{stepStatus}</div>
                <div>
                  <p className="font-medium text-foreground">{step.label}</p>
                  {step.timestamp ? (
                    <p className="text-xs text-muted-foreground">{format(new Date(step.timestamp), "dd MMM yyyy HH:mm")}</p>
                  ) : null}
                  {step.note ? <p className="text-xs text-muted-foreground">{step.note}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          {ackUrl ? (
            <Button size="sm" variant="outline" asChild>
              <a href={ackUrl} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" /> Download ACK
              </a>
            </Button>
          ) : null}
          {packetUrl ? (
            <Button size="sm" variant="ghost" asChild>
              <a href={packetUrl} target="_blank" rel="noreferrer">
                View request
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const AttachmentList = ({
  attachments,
  onRemove,
  readOnly = false,
}: {
  attachments: ComplianceAttachment[];
  onRemove: (id: string) => void;
  readOnly?: boolean;
}) => (
  <div className="flex flex-wrap gap-3">
    {attachments.length === 0 ? (
      <div className="rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs text-muted-foreground">
        No attachments yet.
      </div>
    ) : (
      attachments.map(attachment => (
        <div
          key={attachment.id}
          className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs shadow-sm"
        >
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-foreground">{attachment.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {(attachment.sizeLabel ?? attachment.type) || "Support"} • {format(new Date(attachment.uploadedAt), "dd MMM yyyy HH:mm")}
            </span>
          </div>
          {readOnly ? null : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => onRemove(attachment.id)}
            >
              Remove
            </Button>
          )}
        </div>
      ))
    )}
  </div>
);

const TimelineList = ({ timeline }: { timeline: TimelineEntry[] }) => (
  <div className="space-y-3 text-sm">
    {timeline
      .slice()
      .reverse()
      .map(entry => (
        <div key={entry.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{format(new Date(entry.at), "dd MMM yyyy HH:mm")}</span>
            <span>{entry.actor}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">{entry.action}</p>
          {entry.description ? <p className="text-xs text-muted-foreground">{entry.description}</p> : null}
        </div>
      ))}
  </div>
);

const EvidenceList = ({ evidence }: { evidence: EvidenceItem[] }) => (
  <div className="space-y-3 text-sm">
    {evidence.length === 0 ? (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        No evidence captured yet.
      </div>
    ) : (
      evidence.map(item => (
        <div key={item.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.type} • {format(new Date(item.uploadedAt), "dd MMM yyyy HH:mm")}
              </p>
            </div>
            {item.link ? (
              <Button size="sm" variant="ghost" asChild>
                <a href={item.link} target="_blank" rel="noreferrer">
                  View
                </a>
              </Button>
            ) : null}
          </div>
          {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
        </div>
      ))
    )}
  </div>
);

const PreviewStamp = ({ label }: { label: string }) => (
  <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
    {label}
  </div>
);

const PhytoPreview = ({
  values,
  status,
  trackingId,
  submittedAt,
}: {
  values: PhytoFormValues;
  status: NormalizedDocStatus;
  trackingId?: string;
  submittedAt?: string;
}) => {
  const totalsLabel = formatTotalsLabel(values.products);

  return (
    <div className="space-y-4 text-slate-900">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {status === "signed" ? (
          <div className="pointer-events-none absolute -right-6 bottom-20 rotate-[-12deg] rounded-full border-2 border-emerald-500 px-10 py-2.5 text-sm font-semibold uppercase tracking-wide text-emerald-600 shadow">
            Signed
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border border-slate-300 bg-white" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-600">Republic of Cameroon</p>
              <p className="text-lg font-semibold text-slate-900">PHYTOSANITARY CERTIFICATE</p>
            </div>
          </div>
          <div className="text-right text-[10px] uppercase leading-tight text-slate-500">
            <p>{values.originCountry || "Origin TBD"}</p>
            <p className="font-semibold">→ {values.destinationCountry || "Destination TBD"}</p>
            {submittedAt ? (
              <p className="mt-1 text-[9px] text-slate-400">Submitted {formatDate(submittedAt)}</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 px-4 py-5 text-[11px] leading-relaxed text-slate-700">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-slate-200 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Exporter</p>
              <p className="font-medium text-slate-900">{values.exporterName || "—"}</p>
              <p className="mt-1 whitespace-pre-wrap text-[11px]">{values.exporterAddress || "—"}</p>
              <p className="text-[10px] text-slate-500">{values.exporterCountry || "—"}</p>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Consignee</p>
              <p className="font-medium text-slate-900">{values.consigneeName || "—"}</p>
              <p className="mt-1 whitespace-pre-wrap text-[11px]">{values.consigneeAddress || "—"}</p>
              <p className="text-[10px] text-slate-500">{values.consigneeCountry || "—"}</p>
            </div>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Contact for notifications</p>
            <p className="text-[10px] text-slate-600">Email: {values.contactEmail || "—"}</p>
            <p className="text-[10px] text-slate-600">Phone: {values.contactPhone || "—"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-slate-200 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Origin</p>
              <p className="font-medium text-slate-900">{values.originCountry || "—"}</p>
              <p className="text-[10px] text-slate-600">Port of loading: {values.portOfLoading || "—"}</p>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Destination</p>
              <p className="font-medium text-slate-900">{values.destinationCountry || "—"}</p>
              <p className="text-[10px] text-slate-600">Port of discharge: {values.portOfDischarge || "—"}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-slate-200 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Mode & departure</p>
              <p className="font-medium text-slate-900">{values.mode || "—"}</p>
              <p className="text-[10px] text-slate-600">Departure date: {formatDate(values.departureDate)}</p>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Inspection</p>
              <p className="text-[10px] text-slate-600">Date: {formatDate(values.inspectionDate) || "—"}</p>
              <p className="text-[10px] text-slate-600">Place: {values.placeOfInspection || "—"}</p>
              <p className="text-[10px] text-slate-600">Inspector: {values.inspectorName || "To be assigned"}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded border border-slate-200">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-slate-100 text-[9px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Botanical name</th>
                  <th className="px-3 py-2 font-semibold">HS code</th>
                  <th className="px-3 py-2 font-semibold">Quantity</th>
                  <th className="px-3 py-2 font-semibold">Packaging</th>
                </tr>
              </thead>
              <tbody>
                {values.products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-[10px] text-slate-400">
                      No product lines captured.
                    </td>
                  </tr>
                ) : (
                  values.products.map(product => (
                    <tr key={product.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{product.botanicalName || "—"}</p>
                        <p className="text-[10px] text-slate-500">{product.commonName || "—"}</p>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-slate-600">{product.hsCode || "—"}</td>
                      <td className="px-3 py-2 text-[10px] text-slate-600">
                        {product.quantityValue ? `${product.quantityValue} ${product.quantityUnit}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-slate-600">{product.packaging || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-300 bg-slate-50">
                  <td className="px-3 py-2 text-[10px] font-semibold text-slate-600" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-2 text-[10px] font-semibold text-slate-900">{totalsLabel}</td>
                  <td className="px-3 py-2 text-right text-[9px] text-slate-400">Packaging as declared</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Treatment</p>
            {values.treatment.applied ? (
              <div className="mt-2 grid gap-2 text-[10px] md:grid-cols-2">
                <p>Type: {values.treatment.type || "—"}</p>
                <p>Date: {formatDate(values.treatment.date) || "—"}</p>
                <p>Chemical: {values.treatment.chemical || "—"}</p>
                <p>Duration: {values.treatment.duration || "—"}</p>
                <p>Temperature: {values.treatment.temperature || "—"}</p>
                <p className="md:col-span-2">Notes: {values.treatment.notes || "—"}</p>
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-slate-500">No treatment declared.</p>
            )}
          </div>
          {values.additionalDeclarations ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-600">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Additional declarations</p>
              <p className="mt-1 whitespace-pre-wrap">{values.additionalDeclarations}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-300 px-2 py-0.5 uppercase tracking-wide text-[10px] text-slate-600">
              Generated for submission — Demo
            </span>
            {trackingId ? <span>Tracking ID: {trackingId}</span> : null}
          </div>
          <div className="flex items-center gap-2 text-[9px] uppercase">
            <div className="h-8 w-8 rounded border border-slate-300 bg-white" />
            QR / ID
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-5 pt-4">
          <div className="text-[10px] text-slate-500">
            Place of inspection: {values.placeOfInspection || "—"}
          </div>
          <div className="h-20 w-28 rounded border border-slate-300 p-2 text-center text-[9px] uppercase text-slate-500">
            Stamp & signature
          </div>
        </div>
      </div>
    </div>
  );
};

const CooPreview = ({ values }: { values: CooFormValues }) => (
  <div className="space-y-4">
    <PreviewHeader title="Certificate of Origin" subtitle="Chamber of Commerce" />
    <div className="grid gap-4 text-sm">
      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Exporter</h4>
        <p className="font-medium text-foreground">{values.exporterName}</p>
        <p className="text-sm text-muted-foreground">{values.exporterAddress}</p>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Consignee</h4>
        <p className="font-medium text-foreground">{values.consigneeName}</p>
        <p className="text-sm text-muted-foreground">{values.consigneeAddress}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <h4 className="font-semibold uppercase">Transport</h4>
          <p>{values.transportMode}</p>
          <p>{values.vesselOrFlight}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <h4 className="font-semibold uppercase">Departure</h4>
          <p>{formatDate(values.departureDate)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <h4 className="font-semibold uppercase">Weights</h4>
          <p>Gross: {values.grossWeight}</p>
          <p>Net: {values.netWeight}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <h4 className="font-semibold uppercase">Packages</h4>
          <p>{values.packages}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
        <p>Invoice: {values.invoiceNumber}</p>
        <p>Date: {formatDate(values.invoiceDate)}</p>
        <p>Origin criteria: {values.originCriteria}</p>
      </div>
      {values.remarks ? (
        <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Remarks</p>
          <p>{values.remarks}</p>
        </div>
      ) : null}
      <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Declaration</p>
        <p>{values.declarationName}</p>
        <p>{values.declarationTitle}</p>
        <p>{formatDate(values.declarationDate)}</p>
      </div>
      <div className="flex items-center justify-between">
        <PreviewStamp label="Generated for submission — Demo" />
        <span className="text-xs text-muted-foreground">Seal / signature</span>
      </div>
    </div>
  </div>
);

export const ComplianceDocumentBuilder = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const doc = useComplianceStore(state => (docId ? state.documents[docId] : undefined));
  const initialize = useComplianceStore(state => state.initialize);
  const updateForm = useComplianceStore(state => state.updateForm);
  const addAttachment = useComplianceStore(state => state.addAttachment);
  const removeAttachment = useComplianceStore(state => state.removeAttachment);
  const addEvidence = useComplianceStore(state => state.addEvidence);
  const addVersion = useComplianceStore(state => state.addVersion);
  const addTimelineEntry = useComplianceStore(state => state.addTimelineEntry);
  const setDocumentStatus = useComplianceStore(state => state.setDocumentStatus);
  const startSubmission = useComplianceStore(state => state.startSubmission);
  const updateSubmission = useComplianceStore(state => state.updateSubmission);
  const clearSubmission = useComplianceStore(state => state.clearSubmission);

  const [submissionDialog, setSubmissionDialog] = useState<SubmissionDialogState>({ open: false, confirm: false });
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const phytoSteps = useMemo(
    () => [
      { key: "parties", label: "Parties" },
      { key: "shipment", label: "Shipment" },
      { key: "products", label: "Products" },
      { key: "treatment", label: "Inspection" },
      { key: "attachments", label: "Attachments" },
      { key: "review", label: "Review" },
    ],
    []
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmCheckboxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!doc) {
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [doc]);

  useEffect(() => {
    setActiveStep(0);
  }, [doc?.id]);

  const form = useForm<BuilderFormValues>({
    defaultValues: doc?.form as BuilderFormValues | undefined,
    mode: "onBlur",
  });

  const { control, register, handleSubmit, formState, getValues, watch } = form;
  const phytoFieldArray = useFieldArray({
    control: control as unknown as Control<PhytoFormValues>,
    name: "products" as const,
  });

  const docIdValue = doc?.id;
  const portalBehavior = doc?.portalBehavior;
  const submission = doc?.submission;
  const docKey = doc?.docKey;
  const shipmentRef = doc?.shipmentRef;

  const handleSaveDraft = async () => {
    if (!doc) return;
    updateForm(doc.id, () => getValues());
    await setDocumentStatus(doc.id, "draft", { recordTimeline: true, actor: "You", note: "Form saved as draft" });
    toast.success("Draft saved", { description: "Your entries are stored locally." });
    queryClient.invalidateQueries({ queryKey: ["shipment-documents", doc.shipmentId] });
  };

  const handleMarkReady = async () => {
    if (!doc) return;
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Validation required", { description: "Please resolve the highlighted fields." });
      return;
    }
    if (isPhyto) {
      const warnings = buildPhytoWarnings(getValues() as PhytoFormValues);
      if (warnings.length > 0) {
        toast.error("Validation required", { description: "Please resolve the highlighted fields." });
        focusFirstWarning(warnings);
        return;
      }
    }
    updateForm(doc.id, () => getValues());
    await setDocumentStatus(doc.id, "ready", { recordTimeline: true, actor: "You", note: "All checks passed" });
    toast.success("Marked ready", { description: "All required fields captured." });
    queryClient.invalidateQueries({ queryKey: ["shipment-documents", doc.shipmentId] });
  };

  const handleValidate = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Check required fields", { description: "Fix the highlighted items before continuing." });
      return;
    }
    if (isPhyto) {
      const warnings = buildPhytoWarnings(getValues() as PhytoFormValues);
      if (warnings.length > 0) {
        focusFirstWarning(warnings);
        toast.error("Check warnings", { description: "Complete the missing information before submission." });
        return;
      }
    }
    toast.success("Validation passed", { description: "All required fields are complete." });
  };

  const handleFixResubmit = async () => {
    if (!doc) return;
    clearSubmission(doc.id);
    await setDocumentStatus(doc.id, "draft", {
      recordTimeline: true,
      actor: "You",
      note: "Reopened after rejection",
    });
    toast.success("Document reopened", { description: "Resolve the issues and submit again." });
    setActiveStep(0);
    queryClient.invalidateQueries({ queryKey: ["shipment-documents", doc.shipmentId] });
  };

  const handleAddAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!doc) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const attachment = {
      id: generateId("att"),
      name: file.name,
      type: "supporting" as const,
      uploadedAt: new Date().toISOString(),
      sizeLabel: `${(file.size / 1024).toFixed(1)} KB`,
    };
    addAttachment(doc.id, attachment);
    toast.success("Attachment added", { description: attachment.name });
    event.target.value = "";
  };

  const handleOpenSubmissionDialog = async () => {
    if (!doc) return;
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Validation required", { description: "Please resolve the highlighted fields." });
      return;
    }
    if (isPhyto) {
      const warnings = buildPhytoWarnings(getValues() as PhytoFormValues);
      if (warnings.length > 0) {
        toast.error("Validation required", { description: "Please resolve the highlighted fields." });
        focusFirstWarning(warnings);
        return;
      }
    }
    setSubmissionDialog({ open: true, confirm: false });
  };

  const handleSubmitToPortal = async () => {
    if (!doc) return;
    const values = getValues();
    updateForm(doc.id, () => values);
    const trackingId = doc.submission?.trackingId ?? `TRK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const submittedAt = new Date().toISOString();
    setIsSubmitting(true);
    await startSubmission(doc.id, {
      trackingId,
      status: "submitted",
      submittedAt,
      ackAt: submittedAt,
      steps: [
        { id: "submitted", label: "Submitted", status: "completed", timestamp: submittedAt },
        { id: "received", label: "Received", status: "completed", timestamp: submittedAt },
        { id: "under_review", label: "Under review", status: "pending" },
        { id: "decision", label: "Signed & returned", status: "pending" },
      ],
      packetUrl: "#",
    });
    setIsSubmitting(false);
    setSubmissionDialog({ open: false, confirm: false });
    toast.success("Submitted to state portal", { description: `Tracking ID: ${trackingId}` });
    queryClient.invalidateQueries({ queryKey: ["shipment-documents", doc.shipmentId] });
  };

  useEffect(() => {
    if (!docIdValue || !submission || !portalBehavior) return;
    const status = submission.status;
    if (portalBehavior === "manual" || status === "signed" || status === "rejected") {
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    if (status === "submitted") {
      timers.push(
        setTimeout(() => {
          updateSubmission(docIdValue, submissionState => ({
            ...submissionState,
            status: "under_review",
            steps: submissionState.steps.map(step =>
              step.id === "under_review"
                ? { ...step, status: "completed", timestamp: new Date().toISOString() }
                : step
            ),
          }));
        }, 2000)
      );
    }

    if (status === "under_review") {
      const decisionDelay = portalBehavior === "auto-sign" ? 3200 : 2800;
      timers.push(
        setTimeout(() => {
          if (portalBehavior === "auto-sign") {
            const decisionTime = new Date().toISOString();
            updateSubmission(docIdValue, submissionState => ({
              ...submissionState,
              status: "signed",
              decisionAt: decisionTime,
              steps: submissionState.steps.map(step =>
                step.id === "decision"
                  ? { ...step, status: "completed", timestamp: decisionTime }
                  : step
              ),
            }));
            addTimelineEntry(docIdValue, {
              id: generateId("tl"),
              at: decisionTime,
              actor: "State Portal",
              action: "Signed copy returned",
            });
            const latestDoc = useComplianceStore.getState().documents[docIdValue];
            const versionNumber = (latestDoc?.versions.length ?? 0) + 1;
            const latestDocKey = latestDoc?.docKey ?? docKey ?? "DOC";
            const latestRef = latestDoc?.shipmentRef ?? shipmentRef ?? "REF";
            addVersion(
              docIdValue,
              {
                id: generateId("ver"),
                version: versionNumber,
                label: "Signed official",
                createdAt: decisionTime,
                createdBy: "State Portal",
                status: "signed",
                official: true,
                note: "Signed copy received — replaced as current version.",
                fileName: `${latestDocKey}-${latestRef}-signed.pdf`,
              },
              true
            );
            addEvidence(docIdValue, {
              id: generateId("evi"),
              name: `${latestDocKey} signed copy.pdf`,
              type: "certificate",
              uploadedAt: decisionTime,
              source: "portal",
            });
            void setDocumentStatus(docIdValue, "active", {
              recordTimeline: true,
              actor: "System",
              note: "Signed copy returned",
            });
            toast.success("Signed copy received", { description: "Document moved to Active." });
          } else if (portalBehavior === "auto-reject") {
            const decisionTime = new Date().toISOString();
            updateSubmission(docIdValue, submissionState => ({
              ...submissionState,
              status: "rejected",
              decisionAt: decisionTime,
              rejectionReason:
                submissionState.rejectionReason ?? "HS description doesn’t match invoice. Fix & resubmit.",
              steps: submissionState.steps.map(step =>
                step.id === "decision"
                  ? { ...step, status: "rejected", timestamp: decisionTime, note: submissionState.rejectionReason }
                  : step
              ),
            }));
            void setDocumentStatus(docIdValue, "rejected", {
              recordTimeline: true,
              actor: "State Portal",
              note: "Fix & resubmit",
            });
            toast.error("Submission rejected", { description: "Portal returned a rejection." });
          }
        }, decisionDelay)
      );
    }

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [
    docIdValue,
    portalBehavior,
    submission,
    docKey,
    shipmentRef,
    updateSubmission,
    addTimelineEntry,
    addVersion,
    addEvidence,
    setDocumentStatus,
  ]);

  const normalizedStatus = normalizeDocStatus(doc?.status ?? "draft");

  const isPhyto = doc?.docKey === "PHYTO";

  const currentValues = watch();
  const phytoValues = isPhyto ? (currentValues as PhytoFormValues) : undefined;
  const phytoWarnings = isPhyto && phytoValues ? buildPhytoWarnings(phytoValues) : [];
  const itemsCount = isPhyto && phytoValues ? phytoValues.products.filter(product => product.botanicalName || product.commonName).length : 0;
  const totalsLabel = isPhyto && phytoValues ? formatTotalsLabel(phytoValues.products) : "";
  const isReadOnly = normalizedStatus === "under_review" || normalizedStatus === "signed";
  const expiryDisplay =
    isPhyto && phytoValues?.inspectionDate
      ? format(addDays(new Date(phytoValues.inspectionDate), 90), "dd MMM yyyy")
      : undefined;

  const statusTone: Record<NormalizedDocStatus, string> = {
    required: "bg-rose-100 text-rose-700",
    draft: "bg-amber-100 text-amber-700",
    ready: "bg-sky-100 text-sky-700",
    submitted: "bg-indigo-100 text-indigo-700",
    under_review: "bg-amber-100 text-amber-700",
    rejected: "bg-rose-100 text-rose-700",
    signed: "bg-emerald-100 text-emerald-700",
    active: "bg-emerald-100 text-emerald-700",
    expired: "bg-rose-100 text-rose-700",
  };

  const renderMobileNav = (stepIndex: number) => {
    if (!isPhyto || activeStep !== stepIndex) return null;
    const lastIndex = phytoSteps.length - 1;
    return (
      <div className="mt-6 flex items-center justify-between md:hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveStep(prev => Math.max(prev - 1, 0))}
          disabled={activeStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setActiveStep(prev => Math.min(prev + 1, lastIndex))}
          disabled={activeStep === lastIndex}
        >
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  };

  useEffect(() => {
    if (normalizedStatus === "rejected") {
      void form.trigger();
    }
  }, [normalizedStatus, form]);

  const focusFirstWarning = (warnings: string[]) => {
    if (!isPhyto || warnings.length === 0) return;
    if (warnings.some(w => w.includes("exporter") || w.includes("consignee"))) {
      setActiveStep(0);
    } else if (warnings.some(w => w.includes("Destination"))) {
      setActiveStep(1);
    } else if (warnings.some(w => w.includes("product"))) {
      setActiveStep(2);
    } else if (warnings.some(w => w.includes("Inspection"))) {
      setActiveStep(3);
    }
  };

  if (!doc) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <div>
          <p className="text-lg font-semibold text-foreground">Document not found</p>
          <p className="text-sm text-muted-foreground">Select a shipment from the overview to open a builder.</p>
        </div>
        <Button onClick={() => navigate("/compliance")}>Back to overview</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 md:pb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">{doc.shipmentRef}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`px-3 py-1 text-xs ${statusTone[normalizedStatus] ?? "bg-muted text-muted-foreground"}`}>
            {docStatusLabel(doc.status)}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate(`/compliance`)}>
            Back to overview
          </Button>
          <Button size="sm" className="md:hidden" onClick={() => setPreviewOpen(true)}>
            <Smartphone className="mr-2 h-4 w-4" /> Preview
          </Button>
      </div>
    </div>

      {submission ? (
        <div className="rounded-lg border border-border/70 bg-background/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {submissionStatusMeta[normalizeDocStatus(submission.status)].icon}
              {submissionStatusMeta[normalizeDocStatus(submission.status)].label}
            </div>
            <div className="text-xs text-muted-foreground">
              Submitted {format(new Date(submission.submittedAt), "dd MMM yyyy HH:mm")} • Tracking ID: {submission.trackingId}
            </div>
          </div>
          {submission.status === "rejected" && submission.rejectionReason ? (
            <p className="mt-2 text-xs text-rose-600">Reason: {submission.rejectionReason}</p>
          ) : null}
          {submission.status === "signed" && submission.decisionAt ? (
            <p className="mt-2 text-xs text-emerald-600">
              Signed copy returned {format(new Date(submission.decisionAt), "dd MMM yyyy HH:mm")}
            </p>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit(() => {
          /* no-op handled via dialog */
        })}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
      >
        <div className="space-y-6">
          {isPhyto ? (
            <>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 md:hidden">
                <p className="mb-3 text-xs font-medium text-muted-foreground">Sections</p>
                <div className="flex flex-wrap gap-2">
                  {phytoSteps.map((step, index) => (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={cn(
                        "flex-1 min-w-[120px] rounded-full border px-3 py-2 text-xs font-medium transition",
                        activeStep === index
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px]">
                        {index + 1}
                      </span>
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <Card className={cn("border border-border/70", activeStep === 0 ? "block" : "hidden", "md:block")}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Exporter &amp; Consignee</CardTitle>
                  <CardDescription>Auto-filled from shipment, editable if needed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter name</Label>
                      <Input {...register("exporterName", { required: true })} disabled={isReadOnly} />
                      {formState.errors.exporterName ? (
                        <p className="text-xs text-rose-500">Required: exporter name.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee name</Label>
                      <Input {...register("consigneeName", { required: true })} disabled={isReadOnly} />
                      {formState.errors.consigneeName ? (
                        <p className="text-xs text-rose-500">Required: consignee name.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter address</Label>
                      <Textarea rows={3} {...register("exporterAddress", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee address</Label>
                      <Textarea rows={3} {...register("consigneeAddress", { required: true })} disabled={isReadOnly} />
                      <p className="text-xs text-muted-foreground">Use Latin characters as they appear on your invoice.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter country</Label>
                      <Input {...register("exporterCountry")} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee country</Label>
                      <Input {...register("consigneeCountry", { required: true })} disabled={isReadOnly} />
                      {formState.errors.consigneeCountry ? (
                        <p className="text-xs text-rose-500">Required: consignee country.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Contact email</Label>
                      <Input
                        type="email"
                        placeholder="export@company.example"
                        {...register("contactEmail")}
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-muted-foreground">Used for notifications.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact phone</Label>
                      <Input placeholder="+237 000 000" {...register("contactPhone")} disabled={isReadOnly} />
                    </div>
                  </div>
                  {renderMobileNav(0)}
                </CardContent>
              </Card>

              <Card className={cn("border border-border/70", activeStep === 1 ? "block" : "hidden", "md:block")}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Shipment &amp; Route</CardTitle>
                  <CardDescription>Origin, destination and transport details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Shipment reference</Label>
                      <Input value={doc.shipmentRef} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Country of origin</Label>
                      <Input {...register("originCountry", { required: true })} disabled={isReadOnly} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Destination country</Label>
                      <Input {...register("destinationCountry", { required: true })} disabled={isReadOnly} />
                      {formState.errors.destinationCountry ? (
                        <p className="text-xs text-rose-500">Required: destination country.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <Controller
                        control={control as unknown as Control<PhytoFormValues>}
                        name="mode"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SEA">Sea</SelectItem>
                              <SelectItem value="AIR">Air</SelectItem>
                              <SelectItem value="ROAD">Road</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Port of loading</Label>
                      <Input {...register("portOfLoading", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Port of discharge / entry</Label>
                      <Input {...register("portOfDischarge", { required: true })} disabled={isReadOnly} />
                    </div>
                  </div>
                  <div className="space-y-2 md:w-1/2">
                    <Label>Departure date</Label>
                    <Input type="date" {...register("departureDate")} disabled={isReadOnly} />
                  </div>
                  {renderMobileNav(1)}
                </CardContent>
              </Card>

              <Card className={cn("border border-border/70", activeStep === 2 ? "block" : "hidden", "md:block")}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Products</CardTitle>
                  <CardDescription>Latin botanical names help authorities verify species.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phytoFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">Product #{index + 1}</h4>
                        {phytoFieldArray.fields.length > 1 && !isReadOnly ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => phytoFieldArray.remove(index)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Botanical name</Label>
                          <Input
                            placeholder="e.g., Theobroma cacao"
                            {...register(`products.${index}.botanicalName` as const, { required: true })}
                            disabled={isReadOnly}
                          />
                          <p className="text-xs text-muted-foreground">Latin name preferred.</p>
                          {formState.errors.products?.[index]?.botanicalName ? (
                            <p className="text-xs text-rose-500">Required: botanical name.</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label>Common name</Label>
                          <Input
                            placeholder="e.g., Cocoa beans"
                            {...register(`products.${index}.commonName` as const, { required: true })}
                            disabled={isReadOnly}
                          />
                          {formState.errors.products?.[index]?.commonName ? (
                            <p className="text-xs text-rose-500">Required: common name.</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label>HS code</Label>
                          <Input
                            placeholder="HS code"
                            {...register(`products.${index}.hsCode` as const)}
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                            <Input
                              type="number"
                              step="any"
                              {...register(`products.${index}.quantityValue` as const, { required: true })}
                              disabled={isReadOnly}
                            />
                            <Controller
                              control={control as unknown as Control<PhytoFormValues>}
                              name={`products.${index}.quantityUnit` as const}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="tonne">tonne</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          {formState.errors.products?.[index]?.quantityValue ? (
                            <p className="text-xs text-rose-500">Required: quantity.</p>
                          ) : null}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Packaging description</Label>
                          <Input
                            placeholder="e.g., 25kg bags"
                            {...register(`products.${index}.packaging` as const)}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!isReadOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        phytoFieldArray.append({
                          id: generateId("prod"),
                          botanicalName: "",
                          commonName: "",
                          hsCode: "",
                          quantityValue: "",
                          quantityUnit: "kg",
                          packaging: "",
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add product line
                    </Button>
                  ) : null}
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    Totals: {totalsLabel}
                  </div>
                  {renderMobileNav(2)}
                </CardContent>
              </Card>

              <Card className={cn("border border-border/70", activeStep === 3 ? "block" : "hidden", "md:block")}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Treatments &amp; Inspection</CardTitle>
                  <CardDescription>Record treatment and inspection details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    control={control as unknown as Control<PhytoFormValues>}
                    name="treatment.applied"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">Treatment applied?</p>
                          <p className="text-xs text-muted-foreground">Record fumigation, heat or other treatment.</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />
                      </div>
                    )}
                  />
                  {phytoValues?.treatment.applied ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Treatment type</Label>
                        <Input {...register("treatment.type")} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2">
                        <Label>Treatment date</Label>
                        <Input type="date" {...register("treatment.date")} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2">
                        <Label>Chemical (if applicable)</Label>
                        <Input {...register("treatment.chemical")} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input {...register("treatment.duration")} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2">
                        <Label>Temperature</Label>
                        <Input {...register("treatment.temperature")} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Notes</Label>
                        <Textarea rows={2} {...register("treatment.notes")} disabled={isReadOnly} />
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Place of inspection</Label>
                      <Input {...register("placeOfInspection", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inspection date</Label>
                      <Input type="date" {...register("inspectionDate", { required: true })} disabled={isReadOnly} />
                      {formState.errors.inspectionDate ? (
                        <p className="text-xs text-rose-500">Inspection date required before submission.</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Inspection date required before submission.</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 md:w-1/2">
                    <Label>Inspector name</Label>
                    <Input {...register("inspectorName")} disabled={isReadOnly} placeholder="Optional" />
                  </div>
                  {renderMobileNav(3)}
                </CardContent>
              </Card>

              <Card className={cn("border border-border/70", activeStep === 4 ? "block" : "hidden", "md:block")}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Attachments</CardTitle>
                  <CardDescription>Add lab test, fumigation certificate or permits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AttachmentList
                    attachments={doc.attachments}
                    onRemove={id => removeAttachment(doc.id, id)}
                    readOnly={isReadOnly}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/*"
                      onChange={handleAddAttachment}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isReadOnly}
                    >
                      <Upload className="mr-2 h-4 w-4" /> Add file
                    </Button>
                    <p className="text-xs text-muted-foreground">PDF or images up to 10MB.</p>
                  </div>
                  {renderMobileNav(4)}
                </CardContent>
              </Card>

              <Card className={cn("border border-border/70", activeStep === 5 ? "block" : "hidden", "md:block")}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Review &amp; Confirm</CardTitle>
                  <CardDescription>Final check before submitting to the state portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {normalizedStatus === "signed" ? (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-600">
                      Expires in 90 days{expiryDisplay ? ` • ${expiryDisplay}` : ""}
                    </Badge>
                  ) : null}
                  <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Exporter</p>
                        <p className="font-medium text-foreground">{phytoValues?.exporterName || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-muted-foreground">Consignee</p>
                        <p className="font-medium text-foreground">{phytoValues?.consigneeName || "—"}</p>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                      <p>Items: {itemsCount}</p>
                      <p>Totals: {totalsLabel || "—"}</p>
                      <p>Inspection date: {formatDate(phytoValues?.inspectionDate) || "—"}</p>
                      <p>Mode: {phytoValues?.mode || "—"}</p>
                    </div>
                  </div>
                  {phytoWarnings.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      <p className="font-medium">Before submission</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                        {phytoWarnings.map(warning => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      All required information is captured.
                    </div>
                  )}
                  <div className="hidden flex-wrap gap-2 md:flex">
                    <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isReadOnly}>
                      Save draft
                    </Button>
                    <Button type="button" variant="outline" onClick={handleValidate} disabled={isReadOnly}>
                      Validate
                    </Button>
                    <Button type="button" onClick={handleMarkReady} disabled={isReadOnly}>
                      Mark ready
                    </Button>
                    <Button
                      type="button"
                      onClick={handleOpenSubmissionDialog}
                      disabled={isReadOnly || normalizedStatus === "submitted"}
                    >
                      <Send className="mr-2 h-4 w-4" /> Submit to state portal
                    </Button>
                  </div>
                  {normalizedStatus === "rejected" ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-2">
                      <p>Rejected: {doc.submission?.rejectionReason ?? "See portal feedback."}</p>
                      <Button type="button" variant="outline" onClick={handleFixResubmit}>
                        Fix &amp; resubmit
                      </Button>
                    </div>
                  ) : null}
                  {renderMobileNav(5)}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Document details</CardTitle>
                  <CardDescription>Update the certificate before submitting to the chamber.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SectionTitle title="Exporter & Consignee" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter name</Label>
                      <Input {...register("exporterName", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee name</Label>
                      <Input {...register("consigneeName", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Exporter address</Label>
                      <Textarea rows={3} {...register("exporterAddress", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee address</Label>
                      <Textarea rows={3} {...register("consigneeAddress", { required: true })} disabled={isReadOnly} />
                    </div>
                  </div>
                  <SectionTitle title="Transport details" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Transport mode</Label>
                      <Input {...register("transportMode", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vessel / Flight</Label>
                      <Input {...register("vesselOrFlight")} placeholder="Optional" disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Departure date</Label>
                      <Input type="date" {...register("departureDate", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Origin criteria</Label>
                      <Input {...register("originCriteria", { required: true })} disabled={isReadOnly} />
                    </div>
                  </div>
                  <SectionTitle title="Weights & packages" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Gross weight</Label>
                      <Input {...register("grossWeight", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Net weight</Label>
                      <Input {...register("netWeight", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Packages</Label>
                      <Input {...register("packages", { required: true })} disabled={isReadOnly} />
                    </div>
                  </div>
                  <SectionTitle title="Invoice" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Invoice number</Label>
                      <Input {...register("invoiceNumber", { required: true })} disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice date</Label>
                      <Input type="date" {...register("invoiceDate", { required: true })} disabled={isReadOnly} />
                    </div>
                  </div>
                  <SectionTitle title="Remarks & declaration" />
                  <div className="space-y-3">
                    <Textarea rows={3} placeholder="Remarks" {...register("remarks")} disabled={isReadOnly} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Declarant name</Label>
                        <Input {...register("declarationName", { required: true })} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2">
                        <Label>Declarant title</Label>
                        <Input {...register("declarationTitle", { required: true })} disabled={isReadOnly} />
                      </div>
                      <div className="space-y-2">
                        <Label>Declaration date</Label>
                        <Input type="date" {...register("declarationDate", { required: true })} disabled={isReadOnly} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Attachments</CardTitle>
                  <CardDescription>Add supporting files for the chamber review.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AttachmentList
                    attachments={doc.attachments}
                    onRemove={id => removeAttachment(doc.id, id)}
                    readOnly={isReadOnly}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="application/pdf,image/*"
                      onChange={handleAddAttachment}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isReadOnly}
                    >
                      <Upload className="mr-2 h-4 w-4" /> Add attachment
                    </Button>
                    <p className="text-xs text-muted-foreground">PDF or images up to 10MB.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Review &amp; confirm</CardTitle>
                  <CardDescription>Validate before sending to the portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
                    <p className="font-semibold text-foreground">Checklist</p>
                    <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                      <li>• Required fields completed</li>
                      <li>• Attachments uploaded where necessary</li>
                      <li>• Buyer &amp; shipment details match commercial documents</li>
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isReadOnly}>
                      Save draft
                    </Button>
                    <Button type="button" variant="outline" onClick={handleValidate} disabled={isReadOnly}>
                      Validate
                    </Button>
                    <Button type="button" onClick={handleMarkReady} disabled={isReadOnly}>
                      Mark ready
                    </Button>
                    <Button
                      type="button"
                      onClick={handleOpenSubmissionDialog}
                      disabled={isReadOnly || normalizedStatus === "submitted"}
                    >
                      <Send className="mr-2 h-4 w-4" /> Submit to portal
                    </Button>
                  </div>
                  {normalizedStatus === "under_review" ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Waiting on portal review. We’ll update once the decision arrives.
                    </div>
                  ) : null}
                  {normalizedStatus === "rejected" ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      Rejected: {doc.submission?.rejectionReason ?? "See portal feedback."}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="hidden lg:block">
            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Live preview</CardTitle>
                <CardDescription>Rendered with the official template look.</CardDescription>
              </CardHeader>
              <CardContent>
                {doc.docKey === "PHYTO" ? (
                  <PhytoPreview
                    values={(phytoValues ?? (currentValues as PhytoFormValues)) as PhytoFormValues}
                    status={normalizedStatus}
                    trackingId={doc.submission?.trackingId}
                    submittedAt={doc.submission?.submittedAt}
                  />
                ) : (
                  <CooPreview values={currentValues as CooFormValues} />
                )}
              </CardContent>
            </Card>
          </div>

          {doc.submission ? <SubmissionSteps {...doc.submission} /> : null}

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Evidence & receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceList evidence={doc.evidence} />
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {doc.versions
                .slice()
                .sort((a, b) => b.version - a.version)
                .map(version => (
                  <div
                    key={version.id}
                    className={`rounded-lg border border-border/60 bg-background/60 px-3 py-2 ${
                      doc.currentVersionId === version.id ? "border-primary/40" : ""
                    }`}
                  >
                    <p className="font-medium text-foreground">
                      v{version.version} • {version.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(version.createdAt), "dd MMM yyyy HH:mm")} by {version.createdBy}
                    </p>
                    {version.note ? <p className="text-xs text-muted-foreground">{version.note}</p> : null}
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Timeline & audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineList timeline={doc.timeline} />
            </CardContent>
          </Card>
        </div>
      </form>

      <Dialog
        open={submissionDialog.open}
        onOpenChange={open =>
          setSubmissionDialog(prev => ({
            open,
            confirm: open ? prev.confirm : false,
          }))
        }
      >
        <DialogContent
          onOpenAutoFocus={event => {
            event.preventDefault();
            confirmCheckboxRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Submit to state portal</DialogTitle>
            <DialogDescription>Final check before we package and transmit the request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="font-medium text-foreground">{doc.title}</p>
              <p className="text-xs text-muted-foreground">Shipment {doc.shipmentRef}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="font-semibold text-foreground">Attachments included</p>
              <p className="text-xs text-muted-foreground">{doc.attachments.length} file(s)</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                ref={confirmCheckboxRef}
                checked={submissionDialog.confirm}
                onCheckedChange={value => setSubmissionDialog(prev => ({ ...prev, confirm: value === true }))}
              />
              I confirm the information is correct
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionDialog({ open: false, confirm: false })}>
              Cancel
            </Button>
            <Button onClick={handleSubmitToPortal} disabled={!submissionDialog.confirm || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit to state portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isPreviewOpen} onOpenChange={setPreviewOpen}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Live preview</SheetTitle>
          <SheetDescription>Official layout preview for quick review.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {doc.docKey === "PHYTO" ? (
            <PhytoPreview
              values={(phytoValues ?? (currentValues as PhytoFormValues)) as PhytoFormValues}
              status={normalizedStatus}
              trackingId={doc.submission?.trackingId}
              submittedAt={doc.submission?.submittedAt}
            />
          ) : (
            <CooPreview values={currentValues as CooFormValues} />
          )}
        </div>
      </SheetContent>
    </Sheet>

    {isPhyto ? (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-lg md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft} disabled={isReadOnly}>
            Save
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleValidate} disabled={isReadOnly}>
            Validate
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenSubmissionDialog}
            disabled={isReadOnly || normalizedStatus === "submitted"}
          >
            Submit
          </Button>
        </div>
      </div>
    ) : null}
  </div>
);
};
