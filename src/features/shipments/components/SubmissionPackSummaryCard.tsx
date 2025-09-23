import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightCircle, Download, FolderOpen, Share2 } from "lucide-react";

import type { SubmissionPackSummary as SubmissionPack } from "@/features/shipments/types";

interface SubmissionPackSummaryProps {
  pack: SubmissionPack;
  submittedAtText: string;
  submittedBy: string;
  documentsCount: number;
  onDownload: () => void;
  onViewDetails: () => void;
  onOpenDownloadCentre: () => void;
  onShare: () => void;
  helperLine?: string;
  onReopen?: () => void;
  isReopening?: boolean;
}

export const SubmissionPackSummaryCard = ({
  pack,
  submittedAtText,
  submittedBy,
  documentsCount,
  onDownload,
  onViewDetails,
  onOpenDownloadCentre,
  onShare,
  helperLine,
  onReopen,
  isReopening,
}: SubmissionPackSummaryProps) => {
  return (
    <Card className="border-green-200 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-[0_20px_55px_-40px_rgba(16,185,129,0.75)]">
      <CardContent className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Submission pack ready</Badge>
            <h2 className="text-2xl font-semibold text-emerald-900">{pack.name}</h2>
            <p className="text-sm text-emerald-700">
              Generated {helperLine ?? submittedAtText}. Latest approved versions are bundled for quick customs review.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={onDownload} className="min-w-[200px] shadow-sm">
              <Download className="mr-2 h-4 w-4" /> Download submission pack
            </Button>
            <Button variant="outline" onClick={onShare} className="border-emerald-200 text-emerald-700 hover:bg-emerald-100">
              <Share2 className="mr-2 h-4 w-4" /> Share link
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-500">Submitted</p>
            <p className="text-sm font-semibold text-emerald-900">{submittedAtText}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-500">Submitted by</p>
            <p className="text-sm font-semibold text-emerald-900">{submittedBy}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-500">Documents included</p>
            <p className="text-sm font-semibold text-emerald-900">{documentsCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-500">Manage</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-emerald-700 hover:bg-emerald-100" onClick={onViewDetails}>
                <ArrowRightCircle className="mr-1 h-3.5 w-3.5" /> View pack details
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-emerald-700 hover:bg-emerald-100"
                onClick={onOpenDownloadCentre}
              >
                <FolderOpen className="mr-1 h-3.5 w-3.5" /> Download Centre
              </Button>
              {onReopen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-amber-700 hover:bg-amber-100"
                  onClick={onReopen}
                  disabled={isReopening}
                >
                  {isReopening ? 'Reopening…' : 'Reopen for edits'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
