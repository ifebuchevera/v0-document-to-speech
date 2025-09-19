"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  FileText,
  Search,
  MoreVertical,
  Download,
  Trash2,
  Play,
  Calendar,
  FileVideo as FileSize,
  Clock,
  Headphones,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Document {
  id: string
  filename: string
  original_filename: string
  file_size: number
  file_type: string
  extracted_text: string | null
  upload_date: string
  last_accessed: string
  audio_sessions: Array<{
    id: string
    voice_settings: any
    duration: number | null
    created_at: string
  }>
}

interface FileManagerProps {
  documents: Document[]
}

export function FileManager({ documents: initialDocuments }: FileManagerProps) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date")
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(
      (doc) =>
        doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_type.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.original_filename.localeCompare(b.original_filename)
        case "size":
          return b.file_size - a.file_size
        case "date":
        default:
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
      }
    })

  const handleDeleteDocument = async (document: Document) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", document.id)

      if (error) throw error

      setDocuments((prev) => prev.filter((doc) => doc.id !== document.id))
      toast({
        title: "Document deleted",
        description: `${document.original_filename} has been deleted successfully.`,
      })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleDownloadText = (document: Document) => {
    if (!document.extracted_text) return

    const blob = new Blob([document.extracted_text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${document.original_filename.replace(/\.[^/.]+$/, "")}_extracted.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "application/pdf":
        return "bg-red-100 text-red-800"
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return "bg-blue-100 text-blue-800"
      case "text/plain":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "application/pdf":
        return "PDF"
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "DOCX"
      case "application/msword":
        return "DOC"
      case "text/plain":
        return "TXT"
      default:
        return "FILE"
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search documents by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Sort by: {sortBy === "date" ? "Date" : sortBy === "name" ? "Name" : "Size"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("size")}>
                  <FileSize className="h-4 w-4 mr-2" />
                  Size
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <Badge className={getFileTypeColor(document.file_type)}>
                      {getFileTypeLabel(document.file_type)}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownloadText(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Text
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setDocumentToDelete(document)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg truncate" title={document.original_filename}>
                  {document.original_filename}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileSize className="h-4 w-4" />
                    <span>{formatFileSize(document.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Headphones className="h-4 w-4" />
                    <span>{document.audio_sessions.length} sessions</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Uploaded: {formatDate(document.upload_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last accessed: {formatDate(document.last_accessed)}</span>
                  </div>
                </div>

                {document.extracted_text && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">
                      Extracted text ({document.extracted_text.length} characters):
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-3">
                      {document.extracted_text.substring(0, 150)}...
                    </p>
                  </div>
                )}

                <Button className="w-full" onClick={() => router.push(`/dashboard?file=${document.id}`)}>
                  <Play className="h-4 w-4 mr-2" />
                  Convert to Speech
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? "No documents found" : "No documents uploaded"}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery
                ? "Try adjusting your search terms or filters."
                : "Upload your first document to get started with text-to-speech conversion."}
            </p>
            {!searchQuery && <Button onClick={() => router.push("/dashboard")}>Upload Documents</Button>}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.original_filename}"? This action cannot be undone and
              will also delete all associated audio sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDeleteDocument(documentToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
