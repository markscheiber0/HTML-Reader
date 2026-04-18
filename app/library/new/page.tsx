'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function NewItemPage() {
  const [name, setName] = useState('')
  const [html, setHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    if (!html.trim()) {
      setError('Please paste some HTML first.')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('html_items')
      .insert({
        user_id: user.id,
        name: name.trim() || 'Untitled',
        html_content: html.trim(),
        dom_state: {},
      })
      .select('id')
      .single()

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
    } else if (data) {
      router.push(`/library/${data.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <Link href="/library" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Add New Item</h1>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Workout Tracker"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex-1 flex flex-col">
          <label htmlFor="html" className="block text-sm font-medium text-gray-700 mb-1">
            HTML Code
          </label>
          <textarea
            id="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Paste your AI-generated HTML here..."
            className="flex-1 min-h-64 w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save & Open'}
        </button>
      </main>
    </div>
  )
}
