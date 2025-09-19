import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { FileManager } from "@/components/file-manager"

export default async function FilesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user's documents with audio sessions
  const { data: documents } = await supabase
    .from("documents")
    .select(`
      *,
      audio_sessions (
        id,
        voice_settings,
        duration,
        created_at
      )
    `)
    .eq("user_id", user.id)
    .order("upload_date", { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">File Management</h1>
          <p className="text-slate-600">Manage your uploaded documents and audio sessions.</p>
        </div>

        <FileManager documents={documents || []} />
      </main>
    </div>
  )
}
