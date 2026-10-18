import type { DetailedHTMLProps, HTMLAttributes, RefObject } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "mux-player": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "playback-id": string;
        "playback-token"?: string;
        "thumbnail-token"?: string;
        "storyboard-token"?: string;
        "metadata-video-id": string;
        "metadata-video-title": string;
        "metadata-viewer-user-id": string;
        "stream-type"?: string;
        controls?: boolean;
        ref?: RefObject<HTMLElement | null>;
      };
    }
  }
}
