export interface HtmlItem {
  id: string
  user_id: string
  name: string
  html_content: string
  dom_state: Record<string, unknown>
  created_at: string
  updated_at: string
}
