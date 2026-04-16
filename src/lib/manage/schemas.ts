import { z } from 'zod';

const optionalString = (max: number) =>
  z
    .string()
    .max(max, { message: `max:${max}` })
    .optional()
    .or(z.literal('').transform(() => undefined));

const optionalUrl = z
  .string()
  .max(500)
  .url({ message: 'url' })
  .optional()
  .or(z.literal('').transform(() => undefined));

export const basicSchema = z.object({
  full_name_en: z.string().min(1, 'required').max(200),
  full_name_ar: z.string().min(1, 'required').max(200),
  employee_id: optionalString(64),
  gender_id: z.string().uuid().optional().nullable(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  academic_title_id: z.string().uuid().optional().nullable(),
  profile_image: optionalUrl,
});

export const academicSchema = z.object({
  workplace_type_id: z.string().uuid().optional().nullable(),
  college_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  university_center_id: z.string().uuid().optional().nullable(),
  degree_en: optionalString(200),
  degree_ar: optionalString(200),
  degree_minor_en: optionalString(200),
  degree_minor_ar: optionalString(200),
});

export const researchSchema = z.object({
  bio_en: optionalString(4000),
  bio_ar: optionalString(4000),
  field_of_interest_en: optionalString(2000),
  field_of_interest_ar: optionalString(2000),
  website: optionalUrl,
  skills_csv: optionalString(2000),
  languages_csv: optionalString(1000),
  socials_block: optionalString(4000),
});

export const contactSchema = z.object({
  show_public_contact: z.boolean(),
  private_email: optionalString(320),
  private_phone: optionalString(64),
  private_office_location: optionalString(200),
  private_office_hours: optionalString(200),
  private_mailing_address: optionalString(500),
  public_email: optionalString(320),
  public_phone: optionalString(64),
  public_office_location: optionalString(200),
  public_office_hours: optionalString(200),
  public_mailing_address: optionalString(500),
});

export const visibilitySchema = z.object({
  is_public: z.boolean(),
});

export const educationSchema = z.object({
  id: z.string().uuid().optional(),
  degree_type: z.string().min(1).max(40),
  field_en: optionalString(200),
  field_ar: optionalString(200),
  institution_en: z.string().min(1).max(200),
  institution_ar: optionalString(200),
  country: optionalString(80),
  start_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  end_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  thesis_title: optionalString(500),
  supervisor: optionalString(200),
});

export const workSchema = z.object({
  id: z.string().uuid().optional(),
  position_en: z.string().min(1).max(200),
  position_ar: optionalString(200),
  organization_en: z.string().min(1).max(200),
  organization_ar: optionalString(200),
  location: optionalString(200),
  start_date: optionalString(10),
  end_date: optionalString(10),
  is_current: z.boolean().default(false),
  description_en: optionalString(2000),
  description_ar: optionalString(2000),
});

export const certSchema = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(200),
  name_ar: optionalString(200),
  issuing_org: optionalString(200),
  issue_date: optionalString(10),
  expiry_date: optionalString(10),
  credential_id: optionalString(120),
  credential_url: optionalUrl,
});

export const awardSchema = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(200),
  name_ar: optionalString(200),
  issuer_en: optionalString(200),
  issuer_ar: optionalString(200),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  description_en: optionalString(1000),
  description_ar: optionalString(1000),
});

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title_en: z.string().min(1).max(300),
  title_ar: optionalString(300),
  description_en: optionalString(2000),
  description_ar: optionalString(2000),
  role: optionalString(120),
  funding_agency: optionalString(200),
  status: z.enum(['active', 'completed', 'planned', 'paused']).default('active'),
  start_date: optionalString(10),
  end_date: optionalString(10),
  url: optionalUrl,
});

export const publicationSchema = z.object({
  title: z.string().min(1).max(500),
  abstract: optionalString(5000),
  publication_type_id: z.string().uuid().optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  journal_name: optionalString(300),
  conference_name: optionalString(300),
  publisher: optionalString(300),
  publication_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  doi: optionalString(200),
  url: optionalUrl,
  is_open_access: z.boolean().default(false),
  authors: optionalString(4000),
});

export type BasicInput = z.infer<typeof basicSchema>;
export type AcademicInput = z.infer<typeof academicSchema>;
export type ResearchInput = z.infer<typeof researchSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type VisibilityInput = z.infer<typeof visibilitySchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type WorkInput = z.infer<typeof workSchema>;
export type CertInput = z.infer<typeof certSchema>;
export type AwardInput = z.infer<typeof awardSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type PublicationInput = z.infer<typeof publicationSchema>;
