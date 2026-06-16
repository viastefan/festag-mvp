// ─────────────────────────────────────────────────────────────────────────────
// Dev Console Relay — WP4: client asset tray
//
// Everything the dev wants to hand to the client: uploaded files/images,
// external links (Figma/Loom/Drive/PR), screen captures, or assets picked from
// the project. Each lands in project_assets (visibility team_only until sent),
// and is bound to a console message via message_assets with a per-asset
// "send to client" flag. Dispatch (WP5) flips visibility to client_visible.
//
// The actual storage upload happens in the API route (it owns the storage
// client); this module records the asset rows and the message bindings.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

export type AssetKind =
  | 'file' | 'figma' | 'link' | 'loom' | 'video' | 'audio' | 'image'
  | 'pdf' | 'document' | 'spreadsheet' | 'code' | 'screenshot'

export type MessageAssetView = {
  id: string
  asset_id: string
  send_to_client: boolean
  title: string | null
  kind: string | null
  external_url: string | null
  preview_url: string | null
}

// Infer an asset_kind from a MIME type for uploads.
export function kindFromMime(mime: string | null | undefined): AssetKind {
  if (!mime) return 'file'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') return 'spreadsheet'
  if (mime.includes('word') || mime === 'text/plain' || mime.includes('document')) return 'document'
  return 'file'
}

// Guess kind from an external URL host.
export function kindFromUrl(url: string): AssetKind {
  const u = url.toLowerCase()
  if (u.includes('figma.com')) return 'figma'
  if (u.includes('loom.com')) return 'loom'
  if (u.includes('github.com')) return 'code'
  return 'link'
}

// Register an externally-hosted asset (Figma/Loom/Drive/PR link).
export async function createExternalAsset(
  supa: SupabaseClient<any>,
  { projectId, developerId, url, title }: { projectId: string; developerId: string; url: string; title?: string },
): Promise<{ id: string } | null> {
  const kind = kindFromUrl(url)
  const { data, error } = await (supa as any).from('project_assets').insert({
    project_id: projectId,
    uploaded_by: developerId,
    title: (title || defaultTitleFromUrl(url)).slice(0, 200),
    kind,
    category: 'client_files',
    visibility: 'team_only',
    external_url: url,
  }).select('id').single()
  if (error) { console.error('createExternalAsset failed', error.message); return null }
  return data
}

// Register an already-uploaded storage object as a project asset.
export async function registerUploadedAsset(
  supa: SupabaseClient<any>,
  args: { projectId: string; developerId: string; storagePath: string; title: string; mime?: string | null; sizeBytes?: number | null },
): Promise<{ id: string } | null> {
  const { data, error } = await (supa as any).from('project_assets').insert({
    project_id: args.projectId,
    uploaded_by: args.developerId,
    title: args.title.slice(0, 200),
    kind: kindFromMime(args.mime),
    category: 'client_files',
    visibility: 'team_only',
    storage_path: args.storagePath,
    mime_type: args.mime ?? null,
    size_bytes: args.sizeBytes ?? null,
  }).select('id').single()
  if (error) { console.error('registerUploadedAsset failed', error.message); return null }
  return data
}

// Bind an asset to a console message (pre-dispatch).
export async function attachAssetToMessage(
  supa: SupabaseClient<any>,
  { inboxItemId, assetId, sendToClient = true }: { inboxItemId: string; assetId: string; sendToClient?: boolean },
): Promise<void> {
  await (supa as any).from('message_assets').upsert(
    { inbox_item_id: inboxItemId, asset_id: assetId, send_to_client: sendToClient },
    { onConflict: 'inbox_item_id,asset_id' },
  )
}

// List the assets bound to a console message (for the tray + preview).
export async function listMessageAssets(
  supa: SupabaseClient<any>,
  inboxItemId: string,
): Promise<MessageAssetView[]> {
  const { data } = await (supa as any)
    .from('message_assets')
    .select('id, asset_id, send_to_client, project_assets(title, kind, external_url, preview_url)')
    .eq('inbox_item_id', inboxItemId)
  return (data ?? []).map((r: any) => ({
    id: r.id,
    asset_id: r.asset_id,
    send_to_client: r.send_to_client,
    title: r.project_assets?.title ?? null,
    kind: r.project_assets?.kind ?? null,
    external_url: r.project_assets?.external_url ?? null,
    preview_url: r.project_assets?.preview_url ?? null,
  }))
}

function defaultTitleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.hostname.replace('www.', '')} — Link`
  } catch {
    return 'Externer Link'
  }
}
