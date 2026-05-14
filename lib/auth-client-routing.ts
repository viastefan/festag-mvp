export async function resolvePostAuthTarget(supabase: any, userId: string) {
  const { data: onboarding } = await supabase
    .from('onboarding_state')
    .select('completed_at')
    .eq('user_id', userId)
    .maybeSingle()

  return onboarding?.completed_at ? '/dashboard' : '/onboarding'
}
