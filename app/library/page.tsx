import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HtmlItem } from '@/lib/types'
import LibraryActions from './library-actions'

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: items } = await supabase
    .from('html_items')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">HTML Displayer</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/library/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add New
          </Link>
          <LibraryActions />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!items || items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No items yet</p>
            <p className="text-gray-400 text-sm mt-1">Paste your first AI-generated HTML to get started</p>
            <Link
              href="/library/new"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Add your first item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(items as HtmlItem[]).map((item) => (
              <Link
                key={item.id}
                href={`/library/${item.id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <h2 className="font-medium text-gray-900 truncate">{item.name}</h2>
                <p className="text-xs text-gray-400 mt-2">
                  Updated {new Date(item.updated_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">
                  Created {new Date(item.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
