import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useComplianceStore } from "@/stores/compliance";
import { DocStatusBadge } from "@/components/documents/DocStatusBadge";
import { normalizeDocStatus } from "@/utils/docStatus";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { Inbox, MailCheck } from "lucide-react";

type InboxTab = "all" | "waiting" | "submitted" | "under_review" | "rejected" | "signed";

interface InboxRow {
  id: string;
  title: string;
  docKey: string;
  shipmentId: string;
  shipmentRef: string;
  normalizedStatus: ReturnType<typeof normalizeDocStatus>;
  updatedAt: string;
  owner: string;
  ownerRole: string;
  portalBehavior: string;
}

const buildInboxRows = (
  documents: ReturnType<typeof useComplianceStore.getState>["documents"]
): InboxRow[] =>
  Object.values(documents)
    .map(doc => ({
      id: doc.id,
      title: doc.title,
      docKey: doc.docKey,
      shipmentId: doc.shipmentId,
      shipmentRef: doc.shipmentRef,
      normalizedStatus: normalizeDocStatus(doc.status),
      updatedAt: doc.lastUpdated,
      owner: doc.owner,
      ownerRole: doc.ownerRole,
      portalBehavior: doc.portalBehavior,
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

const filterByTab = (rows: InboxRow[], tab: InboxTab) => {
  switch (tab) {
    case "waiting":
      return rows.filter(row => ["required", "draft", "ready"].includes(row.normalizedStatus));
    case "submitted":
      return rows.filter(row => row.normalizedStatus === "submitted");
    case "under_review":
      return rows.filter(row => row.normalizedStatus === "under_review");
    case "rejected":
      return rows.filter(row => row.normalizedStatus === "rejected");
    case "signed":
      return rows.filter(row => ["signed", "active"].includes(row.normalizedStatus));
    default:
      return rows;
  }
};

const updatedLabel = (updatedAt: string) => {
  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) return "--";
  const diffMinutes = differenceInMinutes(new Date(), updatedDate);
  if (diffMinutes < 1) return "just now";
  return `${formatDistanceToNow(updatedDate, { addSuffix: true })}`;
};

export const ComplianceInboxPage = () => {
  const documents = useComplianceStore(state => state.documents);
  const initialize = useComplianceStore(state => state.initialize);
  const [tab, setTab] = useState<InboxTab>("all");
  const navigate = useNavigate();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const rows = useMemo(() => buildInboxRows(documents), [documents]);
  const filteredRows = useMemo(() => filterByTab(rows, tab), [rows, tab]);

  const totalWaiting = rows.filter(row => ["required", "draft", "ready"].includes(row.normalizedStatus)).length;
  const totalSubmitted = rows.filter(row => row.normalizedStatus === "submitted").length;
  const totalRejected = rows.filter(row => row.normalizedStatus === "rejected").length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Compliance inbox</h1>
        <p className="text-muted-foreground">Process submissions and document reviews from one place.</p>
      </header>

      <Card className="border border-border/70">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Work queue</CardTitle>
            <p className="text-sm text-muted-foreground">Prioritised view of documents by status.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Mark as reviewed
            </Button>
            <Button variant="outline" size="sm">
              Assign to…
            </Button>
            <Button size="sm">Create issue</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={value => setTab(value as InboxTab)}>
            <TabsList className="mb-4 flex flex-wrap gap-2 bg-muted/40 p-1">
              <TabsTrigger value="all" className="text-xs">
                All ({rows.length})
              </TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs">
                Waiting for me ({totalWaiting})
              </TabsTrigger>
              <TabsTrigger value="submitted" className="text-xs">
                Submitted ({totalSubmitted})
              </TabsTrigger>
              <TabsTrigger value="under_review" className="text-xs">
                Under review
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs text-rose-600">
                Rejected ({totalRejected})
              </TabsTrigger>
              <TabsTrigger value="signed" className="text-xs">
                Signed
              </TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <Inbox className="h-8 w-8" />
                            <p>No pending items. You’re all set.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map(row => (
                        <TableRow key={row.id} className="align-top">
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-foreground">{row.title}</span>
                              <span className="text-xs uppercase text-muted-foreground">{row.docKey}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/shipments/${row.shipmentId}?tab=documents`)}
                                className="text-left text-sm text-primary hover:underline"
                              >
                                {row.shipmentRef}
                              </button>
                              <span className="text-xs text-muted-foreground">Portal: {row.portalBehavior}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DocStatusBadge status={row.normalizedStatus} />
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">{updatedLabel(row.updatedAt)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MailCheck className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {row.owner} • {row.ownerRole}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/documents/${row.id}`)}>
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
