import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ItemViewClient from './item-view-client'
import { HtmlItem } from '@/lib/types'

export default async function ItemViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: item } = await supabase
    .from('html_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) redirect('/library')

  return <ItemViewClient item={item as HtmlItem} />
}
