"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Play, Download, Settings } from "lucide-react"
import { AudioPlayer } from "@/components/audio-player"
import {
  TextToSpeechEngine,
  getPreferredVoices,
  formatVoiceName,
  estimateReadingTime,
  splitTextIntoChunks,
} from "@/lib/text-to-speech"
import { useToast } from "@/hooks/use-toast"

interface TTSControlsProps {
  text: string
  fileName: string
}

export function TTSControls({ text, fileName }: TTSControlsProps) {
  const [ttsEngine] = useState(() => new TextToSpeechEngine())
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [rate, setRate] = useState([1])
  const [pitch, setPitch] = useState([1])
  const [volume, setVolume] = useState([0.8])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [textChunks, setTextChunks] = useState<string[]>([])
  const { toast } = useToast()

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const availableVoices = await ttsEngine.waitForVoices()
        const preferredVoices = getPreferredVoices(availableVoices)
        setVoices(preferredVoices)

        // Set default voice (first English voice or first available)
        if (preferredVoices.length > 0) {
          setSelectedVoice(preferredVoices[0])
        }
      } catch (error) {
        console.error("Failed to load voices:", error)
        toast({
          title: "Voice loading failed",
          description: "Could not load available voices",
          variant: "destructive",
        })
      }
    }

    loadVoices()
  }, [ttsEngine, toast])

  // Split text into chunks when text changes
  useEffect(() => {
    if (text) {
      const chunks = splitTextIntoChunks(text)
      setTextChunks(chunks)
      setCurrentChunk(0)
    }
  }, [text])

  const handlePrevious = useCallback(() => {
    if (currentChunk > 0) {
      setCurrentChunk(currentChunk - 1)
      if (isPlaying) {
        ttsEngine.stop()
        // Restart from previous chunk
        setTimeout(() => handlePlay(), 100)
      }
    }
  }, [currentChunk, isPlaying, ttsEngine])

  const handleNext = useCallback(() => {
    if (currentChunk < textChunks.length - 1) {
      setCurrentChunk(currentChunk + 1)
      if (isPlaying) {
        ttsEngine.stop()
        // Restart from next chunk
        setTimeout(() => handlePlay(), 100)
      }
    }
  }, [currentChunk, textChunks.length, isPlaying, ttsEngine])

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume([newVolume])
  }, [])

  const handlePlay = useCallback(async () => {
    if (!selectedVoice || !text) return

    try {
      setIsPlaying(true)
      setIsPaused(false)

      for (let i = currentChunk; i < textChunks.length; i++) {
        // Check if playback was manually stopped
        if (!isPlaying) break

        setCurrentChunk(i)

        try {
          await ttsEngine.speak(textChunks[i], {
            voice: selectedVoice,
            rate: rate[0],
            pitch: pitch[0],
            volume: volume[0],
          })
        } catch (chunkError) {
          console.warn(`Failed to play chunk ${i}:`, chunkError)
          // Continue with next chunk instead of stopping entirely
          continue
        }

        // Small delay between chunks to prevent cancellation
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Only reset if we completed all chunks
      if (currentChunk >= textChunks.length - 1) {
        setCurrentChunk(0)
      }

      setIsPlaying(false)

      toast({
        title: "Playback completed",
        description: `Finished reading ${fileName}`,
      })
    } catch (error) {
      setIsPlaying(false)
      setIsPaused(false)
      console.error("TTS Error:", error)
      toast({
        title: "Playback failed",
        description: "Could not play the text",
        variant: "destructive",
      })
    }
  }, [selectedVoice, text, rate, pitch, volume, currentChunk, textChunks, ttsEngine, fileName, toast, isPlaying])

  const handlePause = useCallback(() => {
    ttsEngine.pause()
    setIsPaused(true)
  }, [ttsEngine])

  const handleResume = useCallback(() => {
    ttsEngine.resume()
    setIsPaused(false)
  }, [ttsEngine])

  const handleStop = useCallback(() => {
    ttsEngine.stop()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentChunk(0)
  }, [ttsEngine])

  const handleDownloadAudio = useCallback(async () => {
    // Note: Browser TTS doesn't support direct audio file generation
    // This would require a server-side TTS service like Google Cloud TTS or Amazon Polly
    toast({
      title: "Feature coming soon",
      description: "Audio download will be available with premium TTS services",
    })
  }, [toast])

  const readingTime = estimateReadingTime(text)

  if (!text) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Text-to-Speech
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Upload and extract text from a document to enable text-to-speech
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Audio Player */}
      <AudioPlayer
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentChunk={currentChunk}
        totalChunks={textChunks.length}
        fileName={fileName}
        onPlay={isPaused ? handleResume : handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onPrevious={handlePrevious}
        onNext={handleNext}
        volume={volume[0]}
        onVolumeChange={handleVolumeChange}
      />

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Audio Settings
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? "Hide" : "Show"}
            </Button>
          </CardTitle>
        </CardHeader>

        {showSettings && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice Selection */}
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={selectedVoice?.voiceURI || ""}
                  onValueChange={(value) => {
                    const voice = voices.find((v) => v.voiceURI === value)
                    setSelectedVoice(voice || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice, index) => (
                      <SelectItem key={`${voice.voiceURI}-${index}`} value={voice.voiceURI}>
                        {formatVoiceName(voice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reading Speed */}
              <div className="space-y-2">
                <Label>Speed: {rate[0]}x</Label>
                <Slider value={rate} onValueChange={setRate} min={0.5} max={2} step={0.1} className="w-full" />
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <Label>Pitch: {pitch[0]}</Label>
                <Slider value={pitch} onValueChange={setPitch} min={0.5} max={2} step={0.1} className="w-full" />
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <Label>Volume: {Math.round(volume[0] * 100)}%</Label>
                <Slider value={volume} onValueChange={setVolume} min={0} max={1} step={0.1} className="w-full" />
              </div>
            </div>

            {/* Additional Controls */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleDownloadAudio}>
                <Download className="h-4 w-4 mr-2" />
                Download Audio
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Document Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Document:</strong> {fileName}
            </p>
            <p>
              <strong>Text length:</strong> {text.length.toLocaleString()} characters
            </p>
            <p>
              <strong>Chunks:</strong> {textChunks.length} segments
            </p>
            <p>
              <strong>Estimated reading time:</strong> {readingTime} minutes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
