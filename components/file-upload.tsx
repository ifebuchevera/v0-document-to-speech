"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, CheckCircle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractTextFromFile, cleanExtractedText, getTextPreview } from "@/lib/text-extraction"
import { TTSControls } from "@/components/tts-controls"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface UploadedFile {
  file: File
  id: string
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  extractedText?: string
  error?: string
}

export function FileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [selectedFileForTTS, setSelectedFileForTTS] = useState<UploadedFile | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "uploading" as const,
      progress: 0,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    // Process each file for text extraction
    newFiles.forEach((uploadedFile) => {
      processFile(uploadedFile.id, uploadedFile.file)
    })
  }, [])

  const processFile = async (fileId: string, file: File) => {
    try {
      // Update status to processing
      setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "processing", progress: 25 } : f)))

      // Extract text from file
      const rawText = await extractTextFromFile(file)
      const cleanedText = cleanExtractedText(rawText)

      // Update progress
      setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 75 } : f)))

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error: dbError } = await supabase.from("documents").insert({
          user_id: user.id,
          filename: fileId,
          original_filename: file.name,
          file_size: file.size,
          file_type: file.type,
          extracted_text: cleanedText,
        })

        if (dbError) {
          console.error("Failed to save document to database:", dbError)
        }
      }

      // Complete processing
      setTimeout(() => {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  extractedText: cleanedText,
                }
              : f,
          ),
        )

        toast({
          title: "Text extracted successfully",
          description: `Extracted ${cleanedText.length} characters from ${file.name}`,
        })
      }, 500)
    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : f,
        ),
      )

      toast({
        title: "Extraction failed",
        description: `Failed to extract text from ${file.name}`,
        variant: "destructive",
      })
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
    setExpandedFiles((prev) => {
      const newSet = new Set(prev)
      newSet.delete(fileId)
      return newSet
    })
    // Clear TTS selection if this file was selected
    if (selectedFileForTTS?.id === fileId) {
      setSelectedFileForTTS(null)
    }
  }

  const toggleTextExpansion = (fileId: string) => {
    setExpandedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const selectFileForTTS = (file: UploadedFile) => {
    setSelectedFileForTTS(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
        <CardContent className="p-8">
          <div {...getRootProps()} className={cn("cursor-pointer text-center space-y-4", isDragActive && "opacity-50")}>
            <input {...getInputProps()} />
            <div className="flex justify-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {isDragActive ? "Drop files here" : "Upload your documents"}
              </h3>
              <p className="text-muted-foreground mb-4">Drag and drop files here, or click to browse</p>
              <Button variant="secondary" size="lg">
                Choose Files
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">Supported formats: PDF, DOCX, DOC, TXT • Max size: 50MB</div>
          </div>
        </CardContent>
      </Card>

      {/* TTS Controls */}
      {selectedFileForTTS && selectedFileForTTS.extractedText && (
        <TTSControls text={selectedFileForTTS.extractedText} fileName={selectedFileForTTS.file.name} />
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Uploaded Files</h3>
          {uploadedFiles.map((uploadedFile) => {
            const isExpanded = expandedFiles.has(uploadedFile.id)
            const isSelectedForTTS = selectedFileForTTS?.id === uploadedFile.id
            return (
              <Card key={uploadedFile.id} className={cn("p-4", isSelectedForTTS && "ring-2 ring-primary")}>
                <div className="flex items-start gap-4">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground truncate">{uploadedFile.file.name}</h4>
                      <div className="flex items-center gap-2">
                        {uploadedFile.status === "completed" && <CheckCircle className="h-5 w-5 text-green-600" />}
                        <Button variant="ghost" size="sm" onClick={() => removeFile(uploadedFile.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {uploadedFile.status === "uploading" && "Uploading..."}
                          {uploadedFile.status === "processing" && "Extracting text..."}
                          {uploadedFile.status === "completed" && "Text extracted successfully"}
                          {uploadedFile.status === "error" && `Error: ${uploadedFile.error}`}
                        </span>
                        {uploadedFile.status !== "error" && <span>{Math.round(uploadedFile.progress)}%</span>}
                      </div>
                      {uploadedFile.status !== "error" && <Progress value={uploadedFile.progress} className="h-2" />}
                    </div>

                    {uploadedFile.extractedText && (
                      <div className="mt-4 space-y-3">
                        <div className="p-3 bg-muted rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">
                              Extracted Text ({uploadedFile.extractedText.length} characters):
                            </p>
                            <Button variant="ghost" size="sm" onClick={() => toggleTextExpansion(uploadedFile.id)}>
                              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="text-sm text-foreground">
                            {isExpanded ? (
                              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap">
                                {uploadedFile.extractedText}
                              </div>
                            ) : (
                              <p className="line-clamp-3">{getTextPreview(uploadedFile.extractedText)}</p>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => selectFileForTTS(uploadedFile)}
                          variant={isSelectedForTTS ? "default" : "outline"}
                          size="sm"
                        >
                          {isSelectedForTTS ? "Selected for TTS" : "Convert to Speech"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
