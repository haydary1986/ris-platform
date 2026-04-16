'use client';

import { useRef, useState, useTransition } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

interface ImageUploadProps {
  current: string | null;
  fallback: string;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ current, fallback, onChange }: ImageUploadProps) {
  const t = useTranslations('manage.basic');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(current);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error(`Allowed: ${ACCEPTED.map((m) => m.split('/')[1]).join(', ')}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Max 2 MB');
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          toast.error('Not signed in');
          return;
        }
        // Path convention enforced by FIX-07 storage policies: {bucket}/{user_id}/{filename}
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (error) {
          toast.error(error.message);
          return;
        }
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        setPreview(pub.publicUrl);
        onChange(pub.publicUrl);
        toast.success('Uploaded');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed');
      }
    });
  }

  function handleRemove() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {preview ? <AvatarImage src={preview} alt="" /> : null}
        <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {t('upload_image')}
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X className="size-4" />
              {t('remove_image')}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{t('image_hint')}</p>
      </div>
    </div>
  );
}
