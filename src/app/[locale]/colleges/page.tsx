import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ChevronRight } from 'lucide-react';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

interface College {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}

interface Department {
  id: string;
  name_en: string;
  name_ar: string;
  college_id: string;
}

export default async function CollegesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const isAr = locale === 'ar';

  let colleges: College[] = [];
  let departments: Department[] = [];
  const researcherCounts: Record<string, number> = {};

  try {
    const supabase = await createClient();
    const [colRes, deptRes, countRes] = await Promise.all([
      supabase.from('colleges').select('id, slug, name_en, name_ar').order('name_en'),
      supabase.from('departments').select('id, name_en, name_ar, college_id').order('name_en'),
      supabase.from('researchers').select('college_id').not('college_id', 'is', null),
    ]);
    colleges = (colRes.data ?? []) as College[];
    departments = (deptRes.data ?? []) as Department[];

    for (const r of countRes.data ?? []) {
      const cid = r.college_id as string;
      researcherCounts[cid] = (researcherCounts[cid] ?? 0) + 1;
    }
  } catch {}

  const deptsByCollege = new Map<string, Department[]>();
  for (const d of departments) {
    const list = deptsByCollege.get(d.college_id) ?? [];
    list.push(d);
    deptsByCollege.set(d.college_id, list);
  }

  const totalDepts = departments.length;

  return (
    <main className="container mx-auto flex flex-col gap-8 px-4 py-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isAr ? 'كليات وأقسام جامعة التراث' : 'AL-Turath University Colleges & Departments'}
        </h1>
        <p className="text-muted-foreground">
          {isAr
            ? `${colleges.length} كلية — ${totalDepts} قسم`
            : `${colleges.length} Colleges — ${totalDepts} Departments`}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {colleges.map((college) => {
          const collegeName = isAr ? college.name_ar : college.name_en;
          const depts = deptsByCollege.get(college.id) ?? [];
          const count = researcherCounts[college.id] ?? 0;

          return (
            <Card
              key={college.id}
              className="overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
            >
              <Link href={`/college/${college.slug}`} className="block">
                <div className="flex items-center gap-3 border-b bg-primary/5 px-5 py-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-sm leading-tight">{collegeName}</h2>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>
                        {depts.length} {isAr ? 'قسم' : 'departments'}
                      </span>
                      {count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Users className="size-3" /> {count} {isAr ? 'باحث' : 'researchers'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
              {depts.length > 0 && (
                <CardContent className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {depts.map((d) => (
                      <Badge key={d.id} variant="secondary" className="text-[10px] font-normal">
                        {isAr ? d.name_ar : d.name_en}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
