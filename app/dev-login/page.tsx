import { redirect } from 'next/navigation'

/** Legacy alias — unified auth only. */
export default function DevLoginAliasPage() {
  redirect('/login')
}
