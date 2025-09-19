export interface TTSOptions {
  voice?: SpeechSynthesisVoice
  rate?: number
  pitch?: number
  volume?: number
}

export interface TTSSettings {
  voiceURI: string
  rate: number
  pitch: number
  volume: number
}

export class TextToSpeechEngine {
  private synthesis: SpeechSynthesis
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isPlaying = false
  private isPaused = false

  constructor() {
    this.synthesis = window.speechSynthesis
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices()
  }

  async waitForVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = this.synthesis.getVoices()
      if (voices.length > 0) {
        resolve(voices)
      } else {
        this.synthesis.onvoiceschanged = () => {
          resolve(this.synthesis.getVoices())
        }
      }
    })
  }

  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isPlaying) {
        this.stop()
      }

      setTimeout(() => {
        this.currentUtterance = new SpeechSynthesisUtterance(text)

        // Apply options
        if (options.voice) {
          this.currentUtterance.voice = options.voice
        }
        if (options.rate !== undefined) {
          this.currentUtterance.rate = options.rate
        }
        if (options.pitch !== undefined) {
          this.currentUtterance.pitch = options.pitch
        }
        if (options.volume !== undefined) {
          this.currentUtterance.volume = options.volume
        }

        this.currentUtterance.onstart = () => {
          this.isPlaying = true
          this.isPaused = false
        }

        this.currentUtterance.onend = () => {
          this.isPlaying = false
          this.isPaused = false
          this.currentUtterance = null
          resolve()
        }

        this.currentUtterance.onerror = (event) => {
          this.isPlaying = false
          this.isPaused = false
          this.currentUtterance = null
          if (event.error === "canceled") {
            resolve()
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`))
          }
        }

        this.synthesis.speak(this.currentUtterance)
      }, 50)
    })
  }

  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.synthesis.pause()
      this.isPaused = true
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.synthesis.resume()
      this.isPaused = false
    }
  }

  stop(): void {
    this.synthesis.cancel()
    this.isPlaying = false
    this.isPaused = false
    this.currentUtterance = null
  }

  getPlaybackState(): { isPlaying: boolean; isPaused: boolean } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
    }
  }
}

// Utility functions for TTS
export function getPreferredVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  // Filter for high-quality voices, preferring local voices
  const localVoices = voices.filter((voice) => voice.localService)
  const englishVoices = voices.filter((voice) => voice.lang.startsWith("en"))

  // Return local English voices first, then all English voices, then all voices
  if (localVoices.length > 0) {
    return localVoices
      .filter((voice) => voice.lang.startsWith("en"))
      .concat(localVoices.filter((voice) => !voice.lang.startsWith("en")))
  }

  return englishVoices.length > 0 ? englishVoices : voices
}

export function formatVoiceName(voice: SpeechSynthesisVoice): string {
  // Clean up voice names for display
  let name = voice.name

  // Remove common prefixes
  name = name.replace(/^(Microsoft|Google|Apple)\s+/, "")

  // Add language info if not English
  if (!voice.lang.startsWith("en")) {
    name += ` (${voice.lang})`
  }

  return name
}

export function estimateReadingTime(text: string, wordsPerMinute = 150): number {
  const words = text.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export function splitTextIntoChunks(text: string, maxChunkSize = 300): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ""

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim() + ".")
      currentChunk = trimmedSentence
    } else {
      currentChunk += (currentChunk ? ". " : "") + trimmedSentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim() + (currentChunk.endsWith(".") ? "" : "."))
  }

  return chunks.length > 0 ? chunks : [text]
}
