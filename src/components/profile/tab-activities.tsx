import { getTranslations } from 'next-intl/server';

// Schema for editorial_board / conferences / professional_memberships
// tables is not yet defined. Empty state for now.
export async function TabActivities() {
  const t = await getTranslations('profile.activities');
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{t('editorial')}</h3>
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{t('conferences')}</h3>
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{t('memberships')}</h3>
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      </section>
    </div>
  );
}
