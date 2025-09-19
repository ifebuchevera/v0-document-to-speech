"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  isPlaying: boolean
  isPaused: boolean
  currentChunk: number
  totalChunks: number
  fileName: string
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onPrevious: () => void
  onNext: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  className?: string
}

export function AudioPlayer({
  isPlaying,
  isPaused,
  currentChunk,
  totalChunks,
  fileName,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  volume,
  onVolumeChange,
  className,
}: AudioPlayerProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(volume)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeTimeoutRef = useRef<NodeJS.Timeout>()

  const progress = totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case "Space":
          e.preventDefault()
          if (isPlaying && !isPaused) {
            onPause()
          } else {
            onPlay()
          }
          break
        case "KeyS":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            onStop()
          }
          break
        case "ArrowLeft":
          if (e.shiftKey) {
            e.preventDefault()
            onPrevious()
          }
          break
        case "ArrowRight":
          if (e.shiftKey) {
            e.preventDefault()
            onNext()
          }
          break
        case "KeyM":
          e.preventDefault()
          toggleMute()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isPlaying, isPaused, onPlay, onPause, onStop, onPrevious, onNext])

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false)
      onVolumeChange(previousVolume)
    } else {
      setPreviousVolume(volume)
      setIsMuted(true)
      onVolumeChange(0)
    }
  }, [isMuted, volume, previousVolume, onVolumeChange])

  const handleVolumeChange = useCallback(
    (newVolume: number[]) => {
      const vol = newVolume[0]
      onVolumeChange(vol)
      setIsMuted(vol === 0)

      // Show volume slider temporarily
      setShowVolumeSlider(true)
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeSlider(false)
      }, 2000)
    },
    [onVolumeChange],
  )

  const formatTime = (chunk: number, total: number) => {
    if (total === 0) return "0:00"
    const percentage = chunk / total
    const estimatedMinutes = Math.floor(percentage * 10) // Rough estimate
    const estimatedSeconds = Math.floor((percentage * 10 - estimatedMinutes) * 60)
    return `${estimatedMinutes}:${estimatedSeconds.toString().padStart(2, "0")}`
  }

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Track Info */}
          <div className="text-center">
            <h4 className="font-medium text-foreground truncate">{fileName}</h4>
            <p className="text-sm text-muted-foreground">
              Chunk {currentChunk + 1} of {totalChunks}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2 cursor-pointer">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-sm" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentChunk, totalChunks)}</span>
              <span>{formatTime(totalChunks, totalChunks)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={currentChunk === 0}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {!isPlaying ? (
              <Button onClick={onPlay} size="sm" className="h-10 w-10 rounded-full p-0">
                <Play className="h-5 w-5 ml-0.5" />
              </Button>
            ) : isPaused ? (
              <Button onClick={onPlay} size="sm" className="h-10 w-10 rounded-full p-0">
                <Play className="h-5 w-5 ml-0.5" />
              </Button>
            ) : (
              <Button onClick={onPause} size="sm" className="h-10 w-10 rounded-full p-0">
                <Pause className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              disabled={!isPlaying && !isPaused}
              className="h-8 w-8 p-0"
            >
              <Square className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={currentChunk >= totalChunks - 1}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 p-0">
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <div
              className={cn(
                "transition-all duration-200 overflow-hidden",
                showVolumeSlider ? "w-24 opacity-100" : "w-0 opacity-0",
              )}
            >
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            <span className="text-xs text-muted-foreground w-8 text-center">{Math.round(volume * 100)}%</span>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Keyboard shortcuts: Space (play/pause), M (mute), Shift+← (previous), Shift+→ (next)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
