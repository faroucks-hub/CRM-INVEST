'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const supplierSchema = z.object({
  company_name: z.string().min(1, 'Nom requis'),
  country: z.string().min(1, 'Pays requis'),
  city: z.string().optional(),
  website: z.string().optional(),
  contact_name: z.string().optional(),
  contact_role: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  whatsapp: z.string().optional(),
  supplier_type: z.string().default('fabricant_turc'),
  products_supplied: z.string().optional(),
  relationship_start: z.string().optional(),
  contract_name: z.string().optional(),
  contract_document_url: z.string().optional(),
  contract_expiry: z.string().optional(),
  lead_time_days: z.number().optional(),
  is_active: z.boolean().default(true),
  is_preferred: z.boolean().default(false),
  notes: z.string().optional(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

export async function createSupplierAction(data: SupplierFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = supplierSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data: refData } = await supabase.rpc('generate_supplier_reference')
  const { data: created, error } = await supabase
    .from('suppliers')
    .insert({ ...parsed.data, reference: refData, created_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/partenaires')
  revalidatePath('/fournisseurs')
  return { data: created }
}

export async function updateSupplierAction(id: string, data: Partial<SupplierFormData>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: updated, error } = await supabase
    .from('suppliers')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/partenaires')
  revalidatePath(`/partenaires/${id}`)
  revalidatePath('/fournisseurs')
  return { data: updated }
}

export async function deleteSupplierAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/partenaires')
  revalidatePath(`/partenaires/${id}`)
  return { success: true }
}
