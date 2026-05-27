// SDG keyword-based classifier — assigns one or more of the 17 UN
// Sustainable Development Goals to a publication based on its title +
// abstract. Bilingual (EN + AR) keyword lists.
//
// Match rule: a publication is tagged with an SDG if the combined
// title + abstract text contains at least 2 distinct keywords from that
// SDG's vocabulary. The 2-keyword threshold keeps false positives low
// (a passing mention of "energy" alone doesn't earn SDG 7).
//
// This is intentionally simple — a Python ML model would be more
// accurate, but a curated keyword map is auditable, runs in ms, and
// is good enough to seed the initial tags. We can upgrade later
// without changing the consumers.

interface SdgVocab {
  number: number;
  keywords: string[];
}

// Keywords MUST be lowercase. Arabic keywords are matched after the
// haystack is lowercased too (lowercasing is a no-op for Arabic letters
// but normalises any embedded ASCII).
const VOCAB: SdgVocab[] = [
  {
    number: 1,
    keywords: ['poverty', 'low-income', 'microfinance', 'social safety', 'فقر', 'دخل منخفض'],
  },
  {
    number: 2,
    keywords: [
      'hunger',
      'food security',
      'malnutrition',
      'agriculture',
      'crop',
      'farming',
      'جوع',
      'أمن غذائي',
      'زراعة',
      'محصول',
    ],
  },
  {
    number: 3,
    keywords: [
      'health',
      'disease',
      'patient',
      'medical',
      'medicine',
      'clinical',
      'hospital',
      'drug',
      'cancer',
      'diabetes',
      'covid',
      'vaccine',
      'mental health',
      'pharmac',
      'صحة',
      'صحي',
      'مرض',
      'طبي',
      'دواء',
      'مستشفى',
      'سرطان',
      'سكري',
      'لقاح',
      'صيدلة',
    ],
  },
  {
    number: 4,
    keywords: [
      'education',
      'teaching',
      'learning',
      'pedagogy',
      'curriculum',
      'student',
      'school',
      'university',
      'e-learning',
      'تعليم',
      'تدريس',
      'تعلم',
      'منهج',
      'طالب',
      'مدرسة',
      'جامعة',
    ],
  },
  {
    number: 5,
    keywords: [
      'gender',
      'women',
      'female',
      'feminism',
      'equality',
      'نوع اجتماعي',
      'المرأة',
      'النساء',
      'المساواة',
    ],
  },
  {
    number: 6,
    keywords: [
      'water',
      'sanitation',
      'wastewater',
      'hygiene',
      'drinking water',
      'water quality',
      'مياه',
      'صرف صحي',
      'مياه الشرب',
    ],
  },
  {
    number: 7,
    keywords: [
      'energy',
      'solar',
      'wind',
      'renewable',
      'photovoltaic',
      'biofuel',
      'electricity',
      'power grid',
      'طاقة',
      'طاقة شمسية',
      'طاقة متجددة',
      'كهرباء',
    ],
  },
  {
    number: 8,
    keywords: [
      'employment',
      'labor',
      'labour',
      'wage',
      'economic growth',
      'gdp',
      'productivity',
      'workforce',
      'تشغيل',
      'عمالة',
      'أجور',
      'اقتصاد',
      'إنتاجية',
    ],
  },
  {
    number: 9,
    keywords: [
      'innovation',
      'industry',
      'infrastructure',
      'manufacturing',
      'engineering',
      'robot',
      'automation',
      'ابتكار',
      'صناعة',
      'بنية تحتية',
      'هندسة',
      'أتمتة',
    ],
  },
  {
    number: 10,
    keywords: [
      'inequality',
      'inequalities',
      'income gap',
      'discrimination',
      'inclusion',
      'عدم المساواة',
      'تمييز',
      'إدماج',
    ],
  },
  {
    number: 11,
    keywords: [
      'urban',
      'city',
      'cities',
      'transportation',
      'housing',
      'smart city',
      'sustainable city',
      'حضري',
      'مدينة',
      'إسكان',
      'نقل',
    ],
  },
  {
    number: 12,
    keywords: [
      'recycling',
      'waste',
      'circular economy',
      'sustainable production',
      'sustainable consumption',
      'تدوير',
      'نفايات',
      'استهلاك مستدام',
    ],
  },
  {
    number: 13,
    keywords: [
      'climate',
      'global warming',
      'carbon',
      'greenhouse',
      'emission',
      'co2',
      'مناخ',
      'احتباس حراري',
      'انبعاثات',
      'كربون',
    ],
  },
  {
    number: 14,
    keywords: [
      'ocean',
      'marine',
      'fish',
      'coral',
      'sea',
      'aquatic',
      'محيط',
      'بحر',
      'بحري',
      'أسماك',
      'مرجان',
    ],
  },
  {
    number: 15,
    keywords: [
      'biodiversity',
      'forest',
      'wildlife',
      'desertification',
      'soil',
      'ecosystem',
      'تنوع بيولوجي',
      'غابة',
      'تربة',
      'نظام بيئي',
      'تصحر',
    ],
  },
  {
    number: 16,
    keywords: [
      'governance',
      'justice',
      'corruption',
      'human rights',
      'rule of law',
      'institution',
      'peace',
      'حوكمة',
      'عدالة',
      'فساد',
      'حقوق إنسان',
      'مؤسسات',
      'سلام',
    ],
  },
  {
    number: 17,
    keywords: [
      'partnership',
      'cooperation',
      'collaboration',
      'international development',
      'شراكة',
      'تعاون دولي',
    ],
  },
];

const MIN_HITS = 2;

export function classifySdg(title: string, abstract: string | null): number[] {
  const haystack = `${title} ${abstract ?? ''}`.toLowerCase();
  const matched: number[] = [];
  for (const v of VOCAB) {
    const distinctHits = new Set<string>();
    for (const kw of v.keywords) {
      if (haystack.includes(kw)) distinctHits.add(kw);
      if (distinctHits.size >= MIN_HITS) break;
    }
    if (distinctHits.size >= MIN_HITS) matched.push(v.number);
  }
  return matched;
}
