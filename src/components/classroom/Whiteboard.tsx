import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Trash2, Undo2, Slash, Square, Circle as CircleIcon, Type } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { WhiteboardStroke } from "@/hooks/useClassRoom";

interface Props {
  strokes: WhiteboardStroke[];
  onStroke: (s: WhiteboardStroke) => void;
  onClear: () => void;
  onUndo?: () => void;
  canDraw: boolean;
}

const COLORS = ['#1e1e1e', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
type Tool = 'free' | 'line' | 'rect' | 'circle' | 'text';

export function Whiteboard({ strokes, onStroke, onClear, onUndo, canDraw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState('#1e1e1e');
  const [width, setWidth] = useState(3);
  const [erasing, setErasing] = useState(false);
  const [tool, setTool] = useState<Tool>('free');
  const drawingRef = useRef<{ id: string; points: { x: number; y: number }[] } | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });

  const drawStroke = (ctx: CanvasRenderingContext2D, s: WhiteboardStroke, W: number, H: number) => {
    ctx.strokeStyle = s.erase ? '#ffffff' : s.color;
    ctx.fillStyle = s.erase ? '#ffffff' : s.color;
    ctx.lineWidth = s.width * (s.erase ? 4 : 1);
    const shape = s.shape || 'free';
    if (shape === 'text' && s.text && s.points[0]) {
      const fontPx = Math.max(12, s.width * 6);
      ctx.font = `${fontPx}px Vazirmatn, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(s.text, s.points[0].x * W, s.points[0].y * H);
      return;
    }
    if (shape === 'rect' && s.points.length >= 2) {
      const a = s.points[0], b = s.points[s.points.length - 1];
      const x = a.x * W, y = a.y * H, w = (b.x - a.x) * W, h = (b.y - a.y) * H;
      ctx.strokeRect(x, y, w, h);
      return;
    }
    if (shape === 'circle' && s.points.length >= 2) {
      const a = s.points[0], b = s.points[s.points.length - 1];
      const cx = (a.x + b.x) / 2 * W;
      const cy = (a.y + b.y) / 2 * H;
      const rx = Math.abs((b.x - a.x) / 2) * W;
      const ry = Math.abs((b.y - a.y) / 2) * H;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (shape === 'line' && s.points.length >= 2) {
      const a = s.points[0], b = s.points[s.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(a.x * W, a.y * H);
      ctx.lineTo(b.x * W, b.y * H);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    s.points.forEach((p, i) => {
      const x = p.x * W, y = p.y * H;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

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
    for (const s of strokes) drawStroke(ctx, s, canvas.width, canvas.height);
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
    if (tool === 'text') {
      const pos = getPos(e);
      const text = window.prompt('متن را وارد کنید:');
      if (text && text.trim()) {
        onStroke({
          id: crypto.randomUUID(),
          color, width, erase: false, shape: 'text',
          points: [pos], text: text.trim(),
        });
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = { id: crypto.randomUUID(), points: [getPos(e)] };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(getPos(e));
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    if (tool === 'free') {
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
    } else {
      // Live shape preview
      redraw();
      const preview: WhiteboardStroke = {
        id: drawingRef.current.id,
        color, width, erase: false, shape: tool,
        points: [drawingRef.current.points[0], drawingRef.current.points[drawingRef.current.points.length - 1]],
      };
      drawStroke(ctx, preview, canvas.width, canvas.height);
    }
  };
  const onPointerUp = () => {
    if (!drawingRef.current) return;
    const pts = drawingRef.current.points;
    const stroke: WhiteboardStroke = {
      id: drawingRef.current.id,
      color,
      width,
      points: tool === 'free' ? pts : [pts[0], pts[pts.length - 1]],
      erase: erasing,
      shape: tool,
    };
    drawingRef.current = null;
    onStroke(stroke);
  };

  return (
    <div className="flex flex-col gap-2 h-full animate-fade-in min-h-0">
      {canDraw && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-card/80 backdrop-blur-md rounded-xl border border-border shadow-sm shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button onClick={() => { setTool('free'); setErasing(false); }} title="آزاد" className={cn("p-1.5 rounded-md transition-all", tool === 'free' && !erasing ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}><Pencil className="w-4 h-4" /></button>
            <button onClick={() => { setTool('line'); setErasing(false); }} title="خط" className={cn("p-1.5 rounded-md transition-all", tool === 'line' && !erasing ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}><Slash className="w-4 h-4" /></button>
            <button onClick={() => { setTool('rect'); setErasing(false); }} title="مستطیل" className={cn("p-1.5 rounded-md transition-all", tool === 'rect' && !erasing ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}><Square className="w-4 h-4" /></button>
            <button onClick={() => { setTool('circle'); setErasing(false); }} title="دایره" className={cn("p-1.5 rounded-md transition-all", tool === 'circle' && !erasing ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}><CircleIcon className="w-4 h-4" /></button>
            <button onClick={() => { setTool('text'); setErasing(false); }} title="متن" className={cn("p-1.5 rounded-md transition-all", tool === 'text' && !erasing ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}><Type className="w-4 h-4" /></button>
            <button onClick={() => { setErasing(true); setTool('free'); }} title="پاک‌کن" className={cn("p-1.5 rounded-md transition-all", erasing ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}><Eraser className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setErasing(false); }}
                className={cn("w-6 h-6 rounded-full border-2 transition-transform duration-200", color === c && !erasing ? "border-foreground scale-110 shadow" : "border-transparent hover:scale-105")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-muted/50 min-w-[180px]">
            <span className="text-xs text-muted-foreground shrink-0">ضخامت</span>
            <Slider value={[width]} min={1} max={30} step={1} onValueChange={v => setWidth(v[0])} className="w-28" />
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="rounded-full bg-foreground" style={{ width: Math.min(width, 18), height: Math.min(width, 18) }} />
              <span className="text-xs font-mono text-muted-foreground w-5 text-center">{width}</span>
            </div>
          </div>
          {onUndo && <Button size="sm" variant="outline" onClick={onUndo} className="gap-1"><Undo2 className="w-4 h-4" /> برگشت</Button>}
          <Button size="sm" variant="outline" onClick={onClear} className="gap-1"><Trash2 className="w-4 h-4" /> پاک کردن همه</Button>
        </div>
      )}
      <div ref={containerRef} className="flex-1 bg-white rounded-xl border-2 border-border overflow-hidden shadow-inner">
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