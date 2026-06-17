import type { SupabaseClient } from '@supabase/supabase-js'

export async function nextInvoiceNumber(
  sb: SupabaseClient<any>,
  workspaceId: string
): Promise<string> {
  const year = new Date().getFullYear()

  const { data: counter } = await (sb as any)
    .from('invoice_counters')
    .select('year,last_number')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  let nextNum: number
  if (!counter || counter.year !== year) {
    nextNum = 1
    await (sb as any).from('invoice_counters').upsert({
      workspace_id: workspaceId,
      year,
      last_number: 1,
    }, { onConflict: 'workspace_id' })
  } else {
    nextNum = (counter.last_number ?? 0) + 1
    await (sb as any)
      .from('invoice_counters')
      .update({ last_number: nextNum })
      .eq('workspace_id', workspaceId)
  }

  return `RE-${year}-${String(nextNum).padStart(4, '0')}`
}
