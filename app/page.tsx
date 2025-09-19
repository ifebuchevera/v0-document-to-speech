import { FileUpload } from "@/components/file-upload"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
              Transform Your Documents into Audio
            </h1>
            <p className="text-lg text-muted-foreground text-pretty">
              Upload PDFs, Word documents, and text files to convert them into high-quality, natural-sounding audio
            </p>
          </div>
          <FileUpload />
        </div>
      </div>
    </main>
  )
}
