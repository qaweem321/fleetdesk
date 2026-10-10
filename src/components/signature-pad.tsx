"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// The customer signs with a finger (tablet, phone) or the mouse. The drawing is sent with the
// form as a PNG in the hidden field `name`; an empty pad sends nothing, so `required` works.
export function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signature, setSignature] = useState("");

  // Sharp lines on high-resolution screens: draw at the screen's pixel density.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    if (context) {
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111827";
    }
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const context = event.currentTarget.getContext("2d");
    const { x, y } = point(event);
    context?.beginPath();
    context?.moveTo(x, y);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return;
    }
    const context = event.currentTarget.getContext("2d");
    const { x, y } = point(event);
    context?.lineTo(x, y);
    context?.stroke();
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return;
    }
    drawing.current = false;
    setSignature(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Signature pad: sign here with your finger or the mouse"
        className="h-40 w-full touch-none rounded-lg border-2 border-dashed border-input bg-white"
      />
      {/* Empty until signed; `required` stops the form until there's a signature. */}
      <input
        name={name}
        value={signature}
        required
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <Button type="button" variant="link" size="inline" onClick={clear}>
        Clear signature
      </Button>
    </div>
  );
}
