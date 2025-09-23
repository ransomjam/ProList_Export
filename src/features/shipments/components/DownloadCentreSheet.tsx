import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DOC_METADATA, getDocumentLabel } from "@/features/shipments/docMeta";
import type { SubmissionPackSummary as SubmissionPack } from "@/features/shipments/types";
import { CalendarIcon, Download, Filter, FolderArchive, MoreVertical, Share2, Trash2 } from "lucide-react";

interface DownloadCentreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packs: SubmissionPack[];
  onDownload: (pack: SubmissionPack) => void;
  onShare: (pack: SubmissionPack) => void;
  onDelete: (pack: SubmissionPack) => void;
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return format(date, "dd MMM yyyy, HH:mm");
};

export const DownloadCentreSheet = ({ open, onOpenChange, packs, onDownload, onShare, onDelete }: DownloadCentreSheetProps) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [containsDoc, setContainsDoc] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<SubmissionPack | null>(null);

  const filteredPacks = useMemo(() => {
    return packs.filter(pack => {
      const created = new Date(pack.createdAt).getTime();
      if (fromDate) {
        const from = new Date(fromDate).setHours(0, 0, 0, 0);
        if (created < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate).setHours(23, 59, 59, 999);
        if (created > to) return false;
      }
      if (containsDoc !== "all") {
        return pack.contents.some(doc => doc.key === containsDoc);
      }
      return true;
    });
  }, [packs, fromDate, toDate, containsDoc]);

  const handleDelete = (pack: SubmissionPack) => {
    if (pack.isPrimary) return;
    setPendingDelete(pack);
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) {
      onDelete(pendingDelete);
      setPendingDelete(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-l p-0 sm:max-w-xl">
        <SheetHeader className="space-y-2 border-b px-6 pb-6 pt-8 text-left">
          <SheetTitle className="text-2xl font-semibold">Download Centre</SheetTitle>
          <SheetDescription className="text-base text-muted-foreground">
            Re-download submission packs, share secure links and keep past exports tidy.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 border-b px-6 py-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filter-from" className="text-xs uppercase tracking-wide text-muted-foreground">
                From
              </Label>
              <div className="relative">
                <Input id="filter-from" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-to" className="text-xs uppercase tracking-wide text-muted-foreground">
                To
              </Label>
              <div className="relative">
                <Input id="filter-to" type="date" value={toDate} onChange={event => setToDate(event.target.value)} />
                <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Contains</Label>
              <Select value={containsDoc} onValueChange={setContainsDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Any document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any document</SelectItem>
                  {Object.entries(DOC_METADATA).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-6">
            {filteredPacks.length === 0 ? (
              <Card className="flex h-56 flex-col items-center justify-center gap-3 border-dashed text-center">
                <FolderArchive className="h-8 w-8 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">No packs yet.</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Submit a shipment to generate a submission pack. They will appear here automatically.
                </p>
              </Card>
            ) : (
              filteredPacks.map(pack => (
                <Card key={pack.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{pack.name}</h3>
                        {pack.isPrimary && <Badge className="bg-emerald-100 text-emerald-700">Latest</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(pack.createdAt)} · Created by {pack.createdBy}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                      <Button size="sm" onClick={() => onDownload(pack)}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onShare(pack)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(pack)}
                        disabled={pack.isPrimary}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onDownload(pack)}>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onShare(pack)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => handleDelete(pack)}
                            disabled={pack.isPrimary}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Contents</p>
                    <div className="space-y-2">
                      {pack.contents.map(doc => {
                        const meta = DOC_METADATA[doc.key];
                        const Icon = meta?.icon ?? DOC_METADATA.INVOICE.icon;
                        return (
                          <div key={doc.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${meta?.accentBg ?? "bg-slate-100"}`}>
                              <Icon className={`h-5 w-5 ${meta?.accent ?? "text-slate-700"}`} />
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{getDocumentLabel(doc.key)}</span>
                              <span className="text-xs text-muted-foreground">
                                {doc.versionLabel ?? "Latest version"}
                                {doc.statusLabel ? ` · ${doc.statusLabel}` : ""}
                              </span>
                              {doc.note && <span className="text-xs text-muted-foreground/80">{doc.note}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {pack.helperLine && <p className="text-xs text-muted-foreground">Generated on {pack.helperLine}</p>}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>

      <AlertDialog open={!!pendingDelete} onOpenChange={openDialog => !openDialog && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission pack?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} will be removed from this shipment. You can always generate a new pack by resubmitting.`
                : "This pack will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmDelete}>
              Delete pack
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
