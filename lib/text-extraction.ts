export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type

  try {
    if (fileType === "text/plain") {
      return await extractTextFromTxt(file)
    } else if (fileType === "application/pdf") {
      return await extractTextFromPdf(file)
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      return await extractTextFromDocx(file)
    } else {
      throw new Error("Unsupported file type")
    }
  } catch (error) {
    console.error("Text extraction error:", error)
    throw new Error("Failed to extract text from file")
  }
}

async function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      resolve(text)
    }
    reader.onerror = () => reject(new Error("Failed to read text file"))
    reader.readAsText(file)
  })
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdf2md = await import("@opendocsg/pdf2md").then((module) => module.default)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        console.log("[v0] Starting PDF text extraction with pdf2md")

        // Convert PDF to markdown, then extract plain text
        const markdown = await pdf2md(arrayBuffer)

        // Convert markdown to plain text by removing markdown formatting
        const plainText = markdown
          .replace(/#{1,6}\s+/g, "") // Remove headers
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
          .replace(/\*(.*?)\*/g, "$1") // Remove italic
          .replace(/\[(.*?)\]$$.*?$$/g, "$1") // Remove links, keep text
          .replace(/`(.*?)`/g, "$1") // Remove code formatting
          .replace(/^\s*[-*+]\s+/gm, "") // Remove bullet points
          .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered lists
          .trim()

        console.log("[v0] PDF text extraction successful, extracted", plainText.length, "characters")
        resolve(plainText)
      } catch (error) {
        console.error("[v0] PDF extraction error:", error)
        reject(new Error("Failed to extract text from PDF"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read PDF file"))
    reader.readAsArrayBuffer(file)
  })
}

async function extractTextFromDocx(file: File): Promise<string> {
  // Using mammoth.js for DOCX text extraction
  const mammoth = await import("mammoth")

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const result = await mammoth.extractRawText({ arrayBuffer })
        resolve(result.value)
      } catch (error) {
        reject(new Error("Failed to extract text from DOCX"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read DOCX file"))
    reader.readAsArrayBuffer(file)
  })
}

export function cleanExtractedText(text: string): string {
  // Clean up extracted text by removing excessive whitespace and formatting
  return text
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, "\n\n") // Clean up line breaks
    .trim()
}

export function getTextPreview(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}
