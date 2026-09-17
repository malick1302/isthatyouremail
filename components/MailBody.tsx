"use client";

import { useEffect, useRef, useState } from "react";

export function MailBody({
  html,
  text,
  fill = false,
}: {
  html: string;
  text: string;
  fill?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(280);

  const paper = "#e6e6da";
  const srcDoc = html
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html, body { margin: 0; height: ${fill ? "100%" : "auto"}; background: ${paper} !important; }
      body { font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.55; color: #1c1c28; }
      img { max-width: 100%; height: auto; }
      a { color: #f45210; }
      [bgcolor="#ffffff" i], [bgcolor="#fff" i], [bgcolor="white" i],
      [bgcolor="#fefefe" i], [bgcolor="#f5f5f5" i], [bgcolor="#f6f6f6" i],
      [bgcolor="#fafafa" i], [bgcolor="#f8f8f8" i] { background-color: ${paper} !important; }
      [style*="background-color:#fff" i], [style*="background-color: #fff" i],
      [style*="background-color:#ffffff" i], [style*="background-color: #ffffff" i],
      [style*="background:#fff" i], [style*="background: #fff" i],
      [style*="background:#ffffff" i], [style*="background: #ffffff" i],
      [style*="background-color:white" i], [style*="background-color: white" i] {
        background-color: ${paper} !important;
      }
    </style></head><body>${html}</body></html>`
    : "";

  useEffect(() => {
    if (fill || !html) return;
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => {
      const body = frame.contentDocument?.body;
      if (body) setHeight(Math.max(body.scrollHeight + 8, 200));
    };
    frame.addEventListener("load", resize);
    const timer = window.setTimeout(resize, 50);
    return () => {
      frame.removeEventListener("load", resize);
      window.clearTimeout(timer);
    };
  }, [html, fill, srcDoc]);

  if (html) {
    if (fill) {
      return (
        <div className="min-h-0 flex-1">
          <iframe
            title="Contenu du mail"
            sandbox=""
            srcDoc={srcDoc}
            className="h-full w-full bg-[var(--paper)]"
            style={{ border: 0 }}
          />
        </div>
      );
    }
    return (
      <iframe
        ref={frameRef}
        title="Contenu du mail"
        sandbox=""
        srcDoc={srcDoc}
        className="w-full bg-[var(--paper)]"
        style={{ border: 0, height }}
      />
    );
  }

  return (
    <pre
      className={`whitespace-pre-wrap px-6 py-4 font-sans text-[15px] leading-6 text-[var(--ink)] ${
        fill ? "min-h-0 flex-1 overflow-y-auto" : ""
      }`}
    >
      {text || "(pas de contenu)"}
    </pre>
  );
}
