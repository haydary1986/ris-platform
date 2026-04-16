'use client';

import { QrCode } from 'lucide-react';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QrCodeButtonProps {
  url: string;
  title: string;
  share: string;
}

export function QrCodeButton({ url, title, share }: QrCodeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="size-4" />
        {share}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="break-all text-xs">{url}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center bg-white p-4">
            <QRCodeSVG value={url} size={224} marginSize={2} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
