"use client";

import Script from "next/script";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

export function TutorialPlayer({ playbackId, playbackTokens, tutorialId, title, viewerId, initialProgress = 0 }: { playbackId: string; playbackTokens?: { playback: string; thumbnail: string; storyboard: string }; tutorialId: string; title: string; viewerId: string; initialProgress?: number }) {
  const playerRef = useRef<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
  const sentAt = useRef(0);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !loaded) return;
    const saveProgress = (force = false) => {
      const media = player as HTMLElement & { currentTime?: number; duration?: number };
      if (!media.duration || !Number.isFinite(media.currentTime)) return;
      const position = Math.floor(media.currentTime ?? 0);
      if (!force && Date.now() - sentAt.current < 5000) return;
      sentAt.current = Date.now();
      saveQueue.current = saveQueue.current.then(async () => {
        const response = await fetch("/api/learning/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tutorialId, position }) });
        if (!response.ok) return;
        const result = (await response.json()) as { percent?: number };
        setProgress(result.percent ?? 0);
      }).catch(() => undefined);
    };
    const saveBaseline = () => saveProgress(true);
    const saveCheckpoint = () => saveProgress();
    const saveFinalProgress = () => saveProgress(true);
    player.addEventListener("playing", saveBaseline);
    player.addEventListener("timeupdate", saveCheckpoint);
    player.addEventListener("pause", saveCheckpoint);
    player.addEventListener("ended", saveFinalProgress);
    return () => {
      player.removeEventListener("playing", saveBaseline);
      player.removeEventListener("timeupdate", saveCheckpoint);
      player.removeEventListener("pause", saveCheckpoint);
      player.removeEventListener("ended", saveFinalProgress);
    };
  }, [loaded, tutorialId]);

  return <div className="academy-player"><Script src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3" strategy="afterInteractive" onReady={() => setLoaded(true)}/><mux-player ref={playerRef as RefObject<HTMLElement | null>} playback-id={playbackId} playback-token={playbackTokens?.playback} thumbnail-token={playbackTokens?.thumbnail} storyboard-token={playbackTokens?.storyboard} metadata-video-id={tutorialId} metadata-video-title={title} metadata-viewer-user-id={viewerId} stream-type="on-demand" controls/><div className="academy-watch-progress"><span>Your verified watch progress</span><b>{progress}%</b></div></div>;
}
