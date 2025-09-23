import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";

import type { SubmissionPackSummary as SubmissionPack } from "@/features/shipments/types";

interface ShareSubmissionPackDialogProps {
  pack: SubmissionPack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (link: string) => void;
}

export const ShareSubmissionPackDialog = ({ pack, open, onOpenChange, onCopy }: ShareSubmissionPackDialogProps) => {
  const shareLink = pack?.shareUrl ?? "";

  const handleCopy = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard?.writeText(shareLink);
      onCopy(shareLink);
    } catch (error) {
      console.error(error);
      onCopy(shareLink);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share submission pack</DialogTitle>
          <DialogDescription>Anyone with the link can view this pack. (Demo only)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input readOnly value={shareLink} aria-label="Share link" />
          <Button className="w-full" variant="outline" onClick={handleCopy} disabled={!shareLink}>
            <Copy className="mr-2 h-4 w-4" /> Copy link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
