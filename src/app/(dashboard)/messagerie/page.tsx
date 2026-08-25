import { redirect } from 'next/navigation'
import MailboxClient from '@/components/email/MailboxClient'
import { getActionContext } from '@/lib/auth/action-context'

export default async function MessagingPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const access = await getActionContext('messaging')
  if (!access.ok) redirect('/dashboard')
  const { data: account } = await access.supabase.from('email_accounts').select('email_address,status').eq('user_id', access.user.id).maybeSingle()
  const params = await searchParams
  return <MailboxClient connected={account?.status==='active'} email={account?.email_address} initialTo={params.to} initialLeadId={params.leadId}/>
}
