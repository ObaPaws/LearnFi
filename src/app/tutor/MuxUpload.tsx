"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

type UploadResponse = { uploadUrl?: string; error?: string };

export function MuxUpload({ tutorialId, ready }: { tutorialId: string; ready: boolean }) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState(ready ? "Video ready" : "Choose an MP4, MOV, or WebM video.");

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

  return <div className="mux-upload"><label className="button button-quiet mux-upload-button"><UploadCloud size={15}/>{progress === null ? "Upload video" : `Uploading ${progress}%`}<input aria-label="Upload tutorial video" type="file" accept="video/*" disabled={progress !== null && progress < 100} onChange={(event) => void uploadVideo(event.currentTarget.files?.[0])}/></label><small role="status">{message}</small>{progress !== null && progress < 100 && <progress max={100} value={progress}/>}</div>;
}
