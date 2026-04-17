'use client';

import { useState, useRef, useTransition } from 'react';
import { Upload, Loader2, Save, Image as ImageIcon, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/admin/actions';
import { createClient } from '@/lib/supabase/client';

interface Props {
  settings: Record<string, string>;
  locale: string;
}

export function BrandingForm({ settings, locale }: Props) {
  const isAr = locale === 'ar';
  const [faviconUrl, setFaviconUrl] = useState(settings['branding.favicon_url'] ?? '');
  const [logoUrl, setLogoUrl] = useState(settings['branding.logo_url'] ?? '');
  const [logoText, setLogoText] = useState(settings['branding.logo_text'] ?? 'RIS');
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File, type: 'favicon' | 'logo') {
    setUploading(type);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast.error('Not signed in');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const path = `${userId}/${type}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        toast.error(error.message);
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;

      if (type === 'favicon') setFaviconUrl(url);
      else setLogoUrl(url);

      toast.success(isAr ? 'تم الرفع' : 'Uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  function save() {
    startTransition(async () => {
      const results = await Promise.all([
        updateSetting('branding.favicon_url', faviconUrl),
        updateSetting('branding.logo_url', logoUrl),
        updateSetting('branding.logo_text', logoText),
      ]);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast.error(isAr ? 'فشل الحفظ' : 'Save failed');
      } else {
        toast.success(
          isAr
            ? 'تم الحفظ — أعد تحميل الصفحة لرؤية التغييرات'
            : 'Saved — reload page to see changes',
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-5" />
            {isAr ? 'أيقونة التبويب (Favicon)' : 'Tab Icon (Favicon)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-lg border bg-muted">
              {faviconUrl ? (
                <img src={faviconUrl} alt="favicon" className="size-10 object-contain" />
              ) : (
                <Globe className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label>{isAr ? 'رابط الأيقونة' : 'Favicon URL'}</Label>
              <Input
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-xs"
              />
              <input
                ref={faviconRef}
                type="file"
                accept="image/png,image/x-icon,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f, 'favicon');
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => faviconRef.current?.click()}
                disabled={uploading === 'favicon'}
              >
                {uploading === 'favicon' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {isAr ? 'رفع صورة' : 'Upload image'}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            {isAr
              ? 'PNG أو ICO أو SVG، يفضّل 32×32 بكسل.'
              : 'PNG, ICO, or SVG. Recommended: 32×32px.'}
          </p>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-5" />
            {isAr ? 'شعار الموقع (Logo)' : 'Site Logo'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-32 items-center justify-center rounded-lg border bg-muted">
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="max-h-12 max-w-28 object-contain" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">{logoText}</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label>{isAr ? 'رابط الشعار' : 'Logo URL'}</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-xs"
              />
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f, 'logo');
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoRef.current?.click()}
                disabled={uploading === 'logo'}
              >
                {uploading === 'logo' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {isAr ? 'رفع صورة' : 'Upload image'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {isAr ? 'نص الشعار (بديل عند عدم وجود صورة)' : 'Logo text (fallback when no image)'}
            </Label>
            <Input
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              placeholder="RIS"
              className="max-w-xs"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {isAr
              ? 'PNG أو SVG أو WEBP، يفضّل عرض 200 بكسل وخلفية شفافة.'
              : 'PNG, SVG, or WEBP. Recommended: 200px wide, transparent background.'}
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? 'معاينة' : 'Preview'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
            {faviconUrl ? (
              <img src={faviconUrl} alt="" className="size-5 object-contain" />
            ) : (
              <div className="size-5 rounded bg-primary" />
            )}
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 object-contain" />
            ) : (
              <span className="text-base font-semibold">{logoText}</span>
            )}
            <span className="text-muted-foreground text-sm">
              {isAr ? 'جامعة التراث' : 'AL-Turath University'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isAr ? 'حفظ التغييرات' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
