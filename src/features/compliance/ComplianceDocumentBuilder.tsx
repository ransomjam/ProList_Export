import { useEffect, useRef, useState } from "react";
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
import {
  useComplianceStore,
  type PhytoFormValues,
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
} from "lucide-react";

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
}: {
  attachments: ComplianceAttachment[];
  onRemove: (id: string) => void;
}) => (
  <div className="space-y-3">
    {attachments.length === 0 ? (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        No attachments yet.
      </div>
    ) : (
      attachments.map(attachment => (
        <div
          key={attachment.id}
          className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-3">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {attachment.type} • {format(new Date(attachment.uploadedAt), "dd MMM yyyy HH:mm")}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(attachment.id)}>
            Remove
          </Button>
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

const PhytoPreview = ({ values }: { values: PhytoFormValues }) => (
  <div className="space-y-4">
    <PreviewHeader title="Phytosanitary Certificate" subtitle="Republic of Cameroon" />
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
        <p className="text-xs text-muted-foreground">{values.consigneeCountry}</p>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Product summary</h4>
        <ul className="space-y-2 text-xs">
          {values.products.map(product => (
            <li key={product.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{product.description}</p>
                <p className="text-muted-foreground">HS {product.hsCode}</p>
              </div>
              <div className="text-right text-muted-foreground">
                <p>{product.quantity}</p>
                <p>{product.weightKg} kg</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <h4 className="font-semibold uppercase">Origin</h4>
          <p>{values.originCountry}</p>
          <p>{values.originPort}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 p-3">
          <h4 className="font-semibold uppercase">Destination</h4>
          <p>{values.destinationCountry}</p>
          <p>{values.destinationPort}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
        <p>Inspection date: {formatDate(values.inspectionDate)}</p>
        <p>Inspector: {values.inspectorName || "To be assigned"}</p>
      </div>
      <div className="rounded-lg border border-dashed border-muted-foreground/50 bg-background/50 p-4 text-center text-xs text-muted-foreground">
        {values.declarations.treatmentApplied ? "Treatment applied" : "Treatment pending"} ·
        {" "}
        {values.declarations.freeFromPests ? "Pest free" : "Requires pest clearance"} · {" "}
        {values.declarations.conformsToRegulations ? "Compliant" : "Check regulations"}
      </div>
      {values.declarations.additionalNotes ? (
        <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Notes</p>
          <p>{values.declarations.additionalNotes}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <PreviewStamp label="Generated for submission — Demo" />
        <span className="text-xs text-muted-foreground">Stamp area</span>
      </div>
    </div>
  </div>
);

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

  const [submissionDialog, setSubmissionDialog] = useState<SubmissionDialogState>({ open: false, confirm: false });
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!doc) {
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [doc]);

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
    updateForm(doc.id, () => getValues());
    await setDocumentStatus(doc.id, "ready", { recordTimeline: true, actor: "You", note: "All checks passed" });
    toast.success("Marked ready", { description: "All required fields captured." });
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

  const normalizedStatus = normalizeDocStatus(doc.status);

  const currentValues = watch();

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

  return (
    <div className="space-y-6">
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

      <form
        onSubmit={handleSubmit(() => {
          /* no-op handled via dialog */
        })}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
      >
        <div className="space-y-6">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Document details</CardTitle>
              <CardDescription>
                Update the official form fields. Helper text keeps everything authority-ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {doc.docKey === "PHYTO" ? (
                <div className="space-y-4">
                  <SectionTitle title="Exporter & Consignee" description="Auto-filled from shipment, editable if needed." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter name</Label>
                      <Input {...register("exporterName", { required: true })} />
                      {formState.errors.exporterName ? (
                        <p className="text-xs text-rose-500">Required: exporter name.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee name</Label>
                      <Input {...register("consigneeName", { required: true })} />
                      {formState.errors.consigneeName ? (
                        <p className="text-xs text-rose-500">Required: consignee name.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter address</Label>
                      <Textarea rows={3} {...register("exporterAddress", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee address</Label>
                      <Textarea rows={3} {...register("consigneeAddress", { required: true })} />
                      <p className="text-xs text-muted-foreground">Use Latin characters as shown on invoice.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Consignee country</Label>
                      <Input {...register("consigneeCountry", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inspection date</Label>
                      <Input type="date" {...register("inspectionDate", { required: true })} />
                      {formState.errors.inspectionDate ? (
                        <p className="text-xs text-rose-500">Required: inspection date.</p>
                      ) : null}
                    </div>
                  </div>

                  <SectionTitle
                    title="Products"
                    description="List each product with HS code, quantity and weight."
                  />
                  <div className="space-y-4">
                    {doc.docKey === "PHYTO"
                      ? phytoFieldArray.fields.map((field, index) => (
                        <div key={field.id} className="rounded-lg border border-border/60 bg-background/60 p-4">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-foreground">Product #{index + 1}</h4>
                          {phytoFieldArray.fields.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => phytoFieldArray.remove(index)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input {...register(`products.${index}.description` as const, { required: true })} />
                          </div>
                          <div className="space-y-2">
                            <Label>HS code</Label>
                            <Input {...register(`products.${index}.hsCode` as const, { required: true })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input {...register(`products.${index}.quantity` as const, { required: true })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Weight (kg)</Label>
                            <Input {...register(`products.${index}.weightKg` as const, { required: true })} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Treatment notes</Label>
                            <Input {...register(`products.${index}.treatment` as const)} placeholder="e.g. Fumigated" />
                          </div>
                        </div>
                      </div>
                      ))
                      : null}
                    {doc.docKey === "PHYTO" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          phytoFieldArray.append({
                            id: generateId("prod"),
                            description: "",
                            hsCode: "",
                            quantity: "",
                            weightKg: "",
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add product
                      </Button>
                    ) : null}
                  </div>

                  <SectionTitle title="Origin & destination" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Origin country</Label>
                      <Input {...register("originCountry", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Origin port</Label>
                      <Input {...register("originPort", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Destination country</Label>
                      <Input {...register("destinationCountry", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Destination port</Label>
                      <Input {...register("destinationPort", { required: true })} />
                    </div>
                  </div>

                  <SectionTitle title="Declarations & notes" />
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox {...register("declarations.treatmentApplied")} /> Treatment applied
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox {...register("declarations.freeFromPests")} /> Free from pests
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox {...register("declarations.conformsToRegulations")} /> Conforms to regulations
                    </label>
                    <Textarea rows={3} placeholder="Additional notes" {...register("declarations.additionalNotes")} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <SectionTitle title="Exporter & Consignee" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exporter name</Label>
                      <Input {...register("exporterName", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee name</Label>
                      <Input {...register("consigneeName", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Exporter address</Label>
                      <Textarea rows={3} {...register("exporterAddress", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consignee address</Label>
                      <Textarea rows={3} {...register("consigneeAddress", { required: true })} />
                    </div>
                  </div>
                  <SectionTitle title="Transport details" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Transport mode</Label>
                      <Input {...register("transportMode", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vessel / Flight</Label>
                      <Input {...register("vesselOrFlight")} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Departure date</Label>
                      <Input type="date" {...register("departureDate", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Origin criteria</Label>
                      <Input {...register("originCriteria", { required: true })} />
                    </div>
                  </div>
                  <SectionTitle title="Weights & packages" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Gross weight</Label>
                      <Input {...register("grossWeight", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Net weight</Label>
                      <Input {...register("netWeight", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Packages</Label>
                      <Input {...register("packages", { required: true })} />
                    </div>
                  </div>
                  <SectionTitle title="Invoice" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Invoice number</Label>
                      <Input {...register("invoiceNumber", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice date</Label>
                      <Input type="date" {...register("invoiceDate", { required: true })} />
                    </div>
                  </div>
                  <SectionTitle title="Remarks & declaration" />
                  <div className="space-y-3">
                    <Textarea rows={3} placeholder="Remarks" {...register("remarks")} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Declarant name</Label>
                        <Input {...register("declarationName", { required: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Declarant title</Label>
                        <Input {...register("declarationTitle", { required: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Declaration date</Label>
                        <Input type="date" {...register("declarationDate", { required: true })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Separator />
              <SectionTitle title="Attachments" description="Add lab results, prior certificates, or supporting files." />
              <div className="space-y-3">
                <AttachmentList
                  attachments={doc.attachments}
                  onRemove={attachmentId => removeAttachment(doc.id, attachmentId)}
                />
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/*"
                    onChange={handleAddAttachment}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Add attachment
                  </Button>
                  <p className="text-xs text-muted-foreground">PDF or images up to 10MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Review & confirm</CardTitle>
              <CardDescription>Validate before sending to the portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm">
                <p className="font-semibold text-foreground">Checklist</p>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <li>• Required fields completed</li>
                  <li>• Attachments uploaded where necessary</li>
                  <li>• Buyer & shipment details match commercial documents</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleSaveDraft}>
                  Save draft
                </Button>
                <Button type="button" variant="outline" onClick={() => form.trigger()}>
                  Validate
                </Button>
                <Button type="button" onClick={handleMarkReady}>
                  Mark ready
                </Button>
                <Button type="button" disabled={normalizedStatus === "submitted" || normalizedStatus === "under_review"} onClick={handleOpenSubmissionDialog}>
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
        </div>

        <div className="space-y-6">
          <div className="hidden lg:block">
            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Live preview</CardTitle>
                <CardDescription>Rendered with the official template look.</CardDescription>
              </CardHeader>
              <CardContent>
                {doc.docKey === "PHYTO" ? <PhytoPreview values={currentValues as PhytoFormValues} /> : <CooPreview values={currentValues as CooFormValues} />}
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

      <Dialog open={submissionDialog.open} onOpenChange={open => setSubmissionDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
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
            {doc.docKey === "PHYTO" ? <PhytoPreview values={currentValues as PhytoFormValues} /> : <CooPreview values={currentValues as CooFormValues} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
