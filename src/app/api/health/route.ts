import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const startedAt = Date.now()

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)

    if (error) throw error

    return NextResponse.json(
      {
        status: 'healthy',
        service: 'ime-crm',
        database: 'reachable',
        response_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    )
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'ime-crm',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    )
  }
}
