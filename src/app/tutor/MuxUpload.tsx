"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

type UploadResponse = { uploadUrl?: string; error?: string };

export function MuxUpload({ tutorialId, ready, videoStatus, playbackId, replacementPending = false, showPreview = true }: { tutorialId: string; ready: boolean; videoStatus: string; playbackId: string | null; replacementPending?: boolean; showPreview?: boolean }) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const statusMessage = replacementPending
    ? "The current video remains live while Mux processes its replacement."
    : ready
    ? "Video ready to preview and publish."
    : videoStatus === "processing"
      ? "Mux is processing your video. This can take a few minutes."
      : videoStatus === "uploading"
        ? "Upload received. Waiting for Mux to finish processing."
          : videoStatus === "ready" && !playbackId
            ? "Mux marked this video ready, but the playback ID is missing. Check the Mux webhook delivery."
        : videoStatus === "errored"
          ? "Mux could not process this video. Upload it again or check the Mux webhook configuration."
          : message || "Choose an MP4, MOV, or WebM video.";

  useEffect(() => {
    if (!replacementPending && videoStatus !== "uploading" && videoStatus !== "processing") return;
    const refresh = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(refresh);
  }, [router, videoStatus, replacementPending]);

  async function uploadVideo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("video/") || file.size > 1024 * 1024 * 1024) {
      setMessage("Choose a video file up to 1 GB.");
      return;
    }
    setMessage("Preparing secure upload…");
    setProgress(0);
    const response = await fetch("/api/mux/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tutorialId }) });
    const result = (await response.json()) as UploadResponse;
    if (!response.ok || !result.uploadUrl) {
      setProgress(null);
      setMessage(result.error ?? "Could not create the upload.");
      return;
    }
    const request = new XMLHttpRequest();
    request.open("PUT", result.uploadUrl);
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        setMessage("Upload received. Video processing will finish shortly.");
        setProgress(100);
        router.refresh();
      } else {
        setMessage("Upload failed. Choose the file again to retry.");
        setProgress(null);
      }
    };
    request.onerror = () => {
      setMessage("Upload failed. Check your connection and try again.");
      setProgress(null);
    };
    request.send(file);
  }

  return <div className="mux-upload">
    <label className="button button-quiet mux-upload-button"><UploadCloud size={15}/>{progress === null ? (replacementPending ? "Upload replacement again" : ready ? "Replace video" : "Upload video") : `Uploading ${progress}%`}<input aria-label={ready ? "Replace tutorial video" : "Upload tutorial video"} type="file" accept="video/*" disabled={Boolean(progress !== null && progress < 100)} onChange={(event) => void uploadVideo(event.currentTarget.files?.[0])}/></label>
    <small role="status">{statusMessage}</small>
    {progress !== null && progress < 100 && <progress max={100} value={progress}/>}
    {showPreview && ready && playbackId && <div className="academy-video-frame"><Script src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3" strategy="afterInteractive"/><div className="academy-player"><mux-player playback-id={playbackId} metadata-video-id={tutorialId} metadata-video-title="Tutor draft preview" metadata-viewer-user-id={tutorialId} stream-type="on-demand" controls/></div></div>}
  </div>;
}
