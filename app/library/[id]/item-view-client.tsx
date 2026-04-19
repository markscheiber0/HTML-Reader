'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { HtmlItem } from '@/lib/types'

const STATE_SCRIPT = `<script>
(function() {
  function getKey(el, i) {
    return el.tagName + '|' + (el.id || '') + '|' + (el.name || '') + '|' + i;
  }
  function captureState() {
    var state = {};
    document.querySelectorAll('input, textarea, select').forEach(function(el, i) {
      var key = getKey(el, i);
      state[key] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
    });
    return state;
  }
  function restoreState(state) {
    document.querySelectorAll('input, textarea, select').forEach(function(el, i) {
      var key = getKey(el, i);
      if (!(key in state)) return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = state[key];
      } else {
        el.value = state[key];
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'RESTORE_STATE') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { restoreState(e.data.state || {}); });
      } else {
        restoreState(e.data.state || {});
      }
    }
    if (e.data.type === 'CAPTURE_STATE') {
      window.parent.postMessage({ type: 'STATE_CAPTURED', state: captureState() }, '*');
    }
  });
})();
<\/script>`

function injectScript(html: string): string {
  if (html.includes('<head>')) return html.replace('<head>', '<head>' + STATE_SCRIPT)
  if (html.includes('<body>')) return html.replace('<body>', '<body>' + STATE_SCRIPT)
  return STATE_SCRIPT + html
}

export default function ItemViewClient({ item }: { item: HtmlItem }) {
  const [name, setName] = useState(item.name)
  const [editingName, setEditingName] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'STATE_CAPTURED') {
        persistState(e.data.state)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function persistState(state: Record<string, unknown>) {
    setSaveStatus('saving')
    const supabase = createClient()
    await supabase
      .from('html_items')
      .update({ dom_state: state, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  function handleSaveClick() {
    iframeRef.current?.contentWindow?.postMessage({ type: 'CAPTURE_STATE' }, '*')
  }

  function handleIframeLoad() {
    const savedState = item.dom_state
    if (savedState && Object.keys(savedState).length > 0) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'RESTORE_STATE', state: savedState },
        '*'
      )
    }
  }

  async function handleRenameSave() {
    setEditingName(false)
    if (name.trim() === item.name) return
    const supabase = createClient()
    await supabase
      .from('html_items')
      .update({ name: name.trim() || 'Untitled', updated_at: new Date().toISOString() })
      .eq('id', item.id)
  }

  function handleExport() {
    const blob = new Blob([item.html_content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const supabase = createClient()
    await supabase.from('html_items').delete().eq('id', item.id)
    router.push('/library')
  }

  const saveLabel = saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save State'

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => router.push('/library')}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          ← Library
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRenameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
              className="w-full text-sm font-medium px-2 py-1 border border-blue-400 rounded outline-none"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-medium text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors truncate max-w-full block"
              title="Click to rename"
            >
              {name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveClick}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saveLabel}
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Export
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </header>

      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-forms allow-modals"
        srcDoc={injectScript(item.html_content)}
        onLoad={handleIframeLoad}
        className="flex-1 w-full border-0"
        title={name}
      />
    </div>
  )
}
