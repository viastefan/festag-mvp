import type { SupabaseClient } from '@supabase/supabase-js'
import {
  issuerFromBrandingRow,
  issuerFromProfileRow,
  type InvoiceIssuer,
} from '@/lib/documents/issuer'

const PROFILE_BASE_SELECT =
  'full_name,email,phone,company_name,company_address,company_city,company_zip,company_country,vat_number,tax_number,legal_form,company_website'
const PROFILE_BANK_SELECT = `${PROFILE_BASE_SELECT},invoice_iban,invoice_bic`
const BRANDING_SELECT =
  'invoice_company_name,invoice_company_address,invoice_iban,invoice_bic,invoice_vat_id,mail_from,invoice_footer,invoice_managing_director,invoice_register_info,invoice_account_holder,invoice_default_tax_note,invoice_default_payment_terms'

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = String(error.message ?? '').toLowerCase()
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find')
  )
}

export async function resolveWorkspaceId(supa: SupabaseClient, userId: string): Promise<string | null> {
  const { data: personal } = await supa
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .maybeSingle()
  if (personal?.id) return personal.id

  const { data: owned } = await supa
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return owned?.id ?? null
}

async function selectProfile(supa: SupabaseClient, userId: string) {
  const withBank = await supa.from('profiles').select(PROFILE_BANK_SELECT).eq('id', userId).maybeSingle()
  if (!withBank.error) return withBank.data as Record<string, unknown> | null
  if (!isMissingColumnError(withBank.error)) return null
  const base = await supa.from('profiles').select(PROFILE_BASE_SELECT).eq('id', userId).maybeSingle()
  return base.data as Record<string, unknown> | null
}

async function selectBranding(supa: SupabaseClient, wsId: string) {
  const full = await supa.from('workspace_branding').select(BRANDING_SELECT).eq('workspace_id', wsId).maybeSingle()
  if (!full.error) return full.data as Record<string, unknown> | null
  if (!isMissingColumnError(full.error)) return null
  const base = await supa.from('workspace_branding')
    .select('workspace_id,mail_from')
    .eq('workspace_id', wsId)
    .maybeSingle()
  return base.data as Record<string, unknown> | null
}

export async function loadIssuerForUser(
  supa: SupabaseClient,
  userId: string,
  email: string,
  workspaceId?: string | null,
): Promise<InvoiceIssuer> {
  const wsId = workspaceId ?? await resolveWorkspaceId(supa, userId)
  const profile = await selectProfile(supa, userId)
  const branding = wsId ? await selectBranding(supa, wsId) : null
  return wsId
    ? issuerFromBrandingRow(branding, issuerFromProfileRow(profile, email))
    : issuerFromProfileRow(profile, email)
}

export async function loadDocumentEditorContext(
  supa: SupabaseClient,
  userId: string,
  email: string,
  workspaceId?: string | null,
) {
  const wsId = workspaceId || await resolveWorkspaceId(supa, userId)
  const [issuer, clientsRes, projectsRes] = await Promise.all([
    loadIssuerForUser(supa, userId, email, wsId),
    wsId
      ? supa.from('agency_clients')
        .select('id,name,primary_contact_name,primary_contact_email,primary_contact_phone')
        .eq('workspace_id', wsId)
      : Promise.resolve({ data: [] as unknown[] }),
    wsId
      ? (supa as any).from('projects')
        .select('id,title,client_id')
        .or(`workspace_id.eq.${wsId},user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100)
      : (supa as any).from('projects')
        .select('id,title,client_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
  ])

  return {
    issuer,
    clients: (clientsRes.data ?? []) as Array<{
      id: string
      name: string
      primary_contact_name?: string | null
      primary_contact_email?: string | null
      primary_contact_phone?: string | null
    }>,
    projects: (projectsRes.data ?? []) as Array<{ id: string; title: string; client_id?: string | null }>,
  }
}
