import { getTranslations } from 'next-intl/server';

// Schema for thesis_advisory tables is not yet defined (would land in a future
// phase when the spec adds advisor_supervisions). For now: empty state.
export async function TabThesis() {
  const t = await getTranslations('profile.thesis');
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{t('phd')}</h3>
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{t('masters')}</h3>
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      </section>
    </div>
  );
}
