import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from "lucide-react";

export interface AudioPlayerHandle {
  /** تبديل التشغيل/الإيقاف — يُستخدم من اختصار المسافة */
  toggle: () => void;
}

/** تحويل الثواني إلى صيغة m:ss */
const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

interface Props {
  src: string;
  title?: string;
}

/** مشغل صوتي لتسجيل الفني مع شريط تقدم وأزرار تقديم/تأخير 5 ثوانٍ */
export const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(({ src, title = "تسجيل الفني" }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  useImperativeHandle(ref, () => ({ toggle }));

  // تخطي بالثواني (موجب = تقديم، سالب = تأخير)
  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, a.currentTime + delta), a.duration || 0);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, [src]);

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <kbd className="mr-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Space</kbd>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />

      {/* شريط التقدم — قابل للسحب للانتقال داخل التسجيل */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={current}
        onChange={(e) => {
          const a = audioRef.current;
          if (a) a.currentTime = Number(e.target.value);
        }}
        aria-label="شريط تقدم التسجيل"
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer bg-muted
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        style={{
          background: `linear-gradient(to left, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`,
        }}
      />

      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground tabular-nums">
        <span>{fmt(current)}</span>
        <span>{fmt(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <Button variant="outline" size="icon" onClick={() => skip(-5)} aria-label="تأخير 5 ثوانٍ">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={toggle} aria-label={playing ? "إيقاف" : "تشغيل"} className="h-11 w-11 rounded-full">
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => skip(5)} aria-label="تقديم 5 ثوانٍ">
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});

AudioPlayer.displayName = "AudioPlayer";
