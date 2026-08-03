import { useState } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ZoomIn, ZoomOut, Maximize, RotateCw, MapPin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Annotation {
  id: string;
  x: number; // %
  y: number; // %
  note: string;
}

function Controls({
  rotate,
  pinMode,
  onTogglePin,
}: {
  rotate: () => void;
  pinMode: boolean;
  onTogglePin: () => void;
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-2 left-2 z-20 flex gap-1 rounded-md border bg-card/95 backdrop-blur p-1 shadow-sm">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomIn(0.3)} title="تكبير">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomOut(0.3)} title="تصغير">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resetTransform()} title="ملء الشاشة">
        <Maximize className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotate} title="تدوير">
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button
        variant={pinMode ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={onTogglePin}
        title="إضافة ملاحظة على الصورة"
      >
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface Props {
  imgUrl: string | null;
  annotations: Annotation[];
  onAnnotationsChange: (next: Annotation[]) => void;
}

/** عارض إذن الاستلام: تكبير/تصغير حر، سحب، تدوير، ودبابيس ملاحظات على مواضع الصورة. */
export function ReceiptViewer({ imgUrl, annotations, onAnnotationsChange }: Props) {
  const [pinMode, setPinMode] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [openPin, setOpenPin] = useState<string | null>(null);

  const addPin = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = crypto.randomUUID();
    onAnnotationsChange([...annotations, { id, x, y, note: "" }]);
    setOpenPin(id);
    setPinMode(false);
  };

  return (
    <div className="relative h-full w-full bg-muted/40 overflow-hidden">
      <TransformWrapper
        minScale={0.3}
        maxScale={8}
        limitToBounds={false}
        doubleClick={{ mode: "reset" }}
        wheel={{ step: 0.15 }}
        panning={{ disabled: pinMode }}
      >
        <Controls rotate={() => setRotation((r) => (r + 90) % 360)} pinMode={pinMode} onTogglePin={() => setPinMode((p) => !p)} />
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <div
            className={cn("relative w-full h-full flex items-center justify-center", pinMode && "cursor-crosshair")}
            onClick={addPin}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="إذن استلام الصيانة"
                style={{ transform: `rotate(${rotation}deg)` }}
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد صورة لهذا الإذن</p>
            )}

            {annotations.map((a, i) => (
              <div key={a.id} className="absolute" style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenPin(openPin === a.id ? null : a.id);
                  }}
                  className="-translate-x-1/2 -translate-y-full flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow ring-2 ring-background"
                >
                  {i + 1}
                </button>
                {openPin === a.id && (
                  <div
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-30 w-56 -translate-x-1/2 mt-1 rounded-md border bg-card p-2 shadow-lg"
                  >
                    <Textarea
                      autoFocus
                      className="text-xs min-h-[60px]"
                      placeholder="ملاحظة على هذا الموضع..."
                      defaultValue={a.note}
                      onBlur={(e) =>
                        onAnnotationsChange(annotations.map((x) => (x.id === a.id ? { ...x, note: e.target.value } : x)))
                      }
                    />
                    <div className="flex justify-between mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => {
                          onAnnotationsChange(annotations.filter((x) => x.id !== a.id));
                          setOpenPin(null);
                        }}
                      >
                        <Trash2 className="h-3 w-3 ml-1" /> حذف
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOpenPin(null)}>
                        إغلاق
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
      {pinMode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 rounded bg-primary px-3 py-1 text-xs text-primary-foreground">
          اضغط على الموضع المطلوب لإضافة ملاحظة
        </div>
      )}
    </div>
  );
}
