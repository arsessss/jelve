import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhiteboardStroke } from "@/hooks/useClassRoom";

interface Props {
  strokes: WhiteboardStroke[];
  onStroke: (s: WhiteboardStroke) => void;
  onClear: () => void;
  canDraw: boolean;
}

const COLORS = ['#1e1e1e', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export function Whiteboard({ strokes, onStroke, onClear, canDraw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState('#1e1e1e');
  const [width, setWidth] = useState(3);
  const [erasing, setErasing] = useState(false);
  const drawingRef = useRef<{ id: string; points: { x: number; y: number }[] } | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) {
      ctx.strokeStyle = s.erase ? '#ffffff' : s.color;
      ctx.lineWidth = s.width * (s.erase ? 4 : 1);
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      const c = containerRef.current;
      if (!canvas || !c) return;
      const rect = c.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      sizeRef.current = { w: rect.width, h: rect.height };
      redraw();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [redraw]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = { id: crypto.randomUUID(), points: [getPos(e)] };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(getPos(e));
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = erasing ? '#ffffff' : color;
    ctx.lineWidth = width * (erasing ? 4 : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pts = drawingRef.current.points;
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    if (!a) return;
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.stroke();
  };
  const onPointerUp = () => {
    if (!drawingRef.current) return;
    const stroke: WhiteboardStroke = {
      id: drawingRef.current.id,
      color,
      width,
      points: drawingRef.current.points,
      erase: erasing,
    };
    drawingRef.current = null;
    onStroke(stroke);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {canDraw && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-card rounded-lg border border-border">
          <Button size="sm" variant={!erasing ? "default" : "outline"} onClick={() => setErasing(false)}><Pencil className="w-4 h-4" /></Button>
          <Button size="sm" variant={erasing ? "default" : "outline"} onClick={() => setErasing(true)}><Eraser className="w-4 h-4" /></Button>
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setErasing(false); }}
                className={cn("w-7 h-7 rounded-full border-2 transition-all", color === c && !erasing ? "border-foreground scale-110" : "border-transparent")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input type="range" min={1} max={20} value={width} onChange={e => setWidth(Number(e.target.value))} className="w-24" />
          <Button size="sm" variant="outline" onClick={onClear} className="gap-1"><Trash2 className="w-4 h-4" /> پاک کردن همه</Button>
        </div>
      )}
      <div ref={containerRef} className="flex-1 bg-white rounded-lg border-2 border-border overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn("touch-none block w-full h-full", canDraw ? "cursor-crosshair" : "cursor-not-allowed")}
        />
      </div>
    </div>
  );
}