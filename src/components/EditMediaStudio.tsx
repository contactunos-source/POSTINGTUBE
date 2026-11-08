'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PostMedia, ImageEditMetadata } from '@/types/social';
import {
  X,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Check,
  Maximize2,
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  Move,
  Loader2,
  AlertCircle,
  Pencil,
  RotateCcw as ResetIcon,
  Sliders,
} from 'lucide-react';

export interface EditMediaStudioProps {
  isOpen: boolean;
  mediaList: PostMedia[];
  initialIndex?: number;
  onSave: (updatedMedia: PostMedia[]) => Promise<void> | void;
  onCancel: () => void;
}

export type AspectRatioOption =
  | 'freeform'
  | 'original'
  | '3:4'
  | '4:5'
  | '1:1'
  | '9:16'
  | '1.91:1';

interface AspectRatioConfig {
  id: AspectRatioOption;
  title: string;
  subtitle: string;
  ratio: number | null; // width / height (null for freeform/original)
}

const ASPECT_RATIO_OPTIONS: AspectRatioConfig[] = [
  { id: 'freeform', title: 'Freeform', subtitle: 'Any size', ratio: null },
  { id: 'original', title: 'Original', subtitle: 'Full image', ratio: null },
  { id: '3:4', title: '3:4', subtitle: 'Portrait', ratio: 3 / 4 },
  { id: '4:5', title: '4:5', subtitle: 'Portrait', ratio: 4 / 5 },
  { id: '1:1', title: '1:1', subtitle: 'Square', ratio: 1 / 1 },
  { id: '9:16', title: '9:16', subtitle: 'Stories / Reels', ratio: 9 / 16 },
  { id: '1.91:1', title: '1.91:1', subtitle: 'Landscape', ratio: 1.91 / 1 },
];

export interface ItemEditState {
  aspectRatio: AspectRatioOption;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  straighten: number; // -45 to 45
  zoom: number; // 1 to 3
  pan: { x: number; y: number };
  cropNorm: { x: number; y: number; width: number; height: number }; // normalized 0..1 in canvas space
  isModified: boolean;
}

const DEFAULT_ITEM_STATE: ItemEditState = {
  aspectRatio: 'original',
  rotation: 0,
  flipH: false,
  flipV: false,
  straighten: 0,
  zoom: 1,
  pan: { x: 0, y: 0 },
  cropNorm: { x: 0, y: 0, width: 1, height: 1 },
  isModified: false,
};

export const EditMediaStudio: React.FC<EditMediaStudioProps> = ({
  isOpen,
  mediaList,
  initialIndex = 0,
  onSave,
  onCancel,
}) => {
  // Filter for images only (defensive check)
  const imageMediaList = useMemo(() => {
    return mediaList.filter(
      (m) =>
        m.type === 'image' ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(m.url || '') ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(m.name || '')
    );
  }, [mediaList]);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    return initialIndex >= 0 && initialIndex < imageMediaList.length ? initialIndex : 0;
  });

  // Track independent edit state per media item ID
  const [editsMap, setEditsMap] = useState<Record<string, ItemEditState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Active Image DOM element and dimensions
  const activeMedia = imageMediaList[activeIndex];
  const activeMediaId = activeMedia?.id;
  const activeMediaUrl = activeMedia?.originalUrl || activeMedia?.url;

  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 800,
  });

  // Canvas viewport container ref
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 600,
  });

  // Dragging / Pan state inside canvas
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; startPanX: number; startPanY: number }>({
    mouseX: 0,
    mouseY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Freeform Crop handle dragging state
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragHandleStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialCrop: { x: number; y: number; width: number; height: number };
  }>({
    mouseX: 0,
    mouseY: 0,
    initialCrop: { x: 0, y: 0, width: 1, height: 1 },
  });

  // Initialize or load edit states for all media items
  useEffect(() => {
    if (!isOpen) return;

    setEditsMap((prev) => {
      const next = { ...prev };
      imageMediaList.forEach((media) => {
        if (!next[media.id]) {
          const meta = media.editMetadata;
          next[media.id] = {
            aspectRatio: (meta?.aspectRatio as AspectRatioOption) || 'original',
            rotation: meta?.rotation || 0,
            flipH: Boolean(meta?.flipH),
            flipV: Boolean(meta?.flipV),
            straighten: meta?.straighten || 0,
            zoom: meta?.zoom || 1,
            pan: { x: 0, y: 0 },
            cropNorm: meta?.cropRect || { x: 0, y: 0, width: 1, height: 1 },
            isModified: false,
          };
        }
      });
      return next;
    });

    if (initialIndex >= 0 && initialIndex < imageMediaList.length) {
      setActiveIndex(initialIndex);
    }
  }, [isOpen, imageMediaList, initialIndex]);

  // Measure natural dimensions of active image
  useEffect(() => {
    if (!activeMediaUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNaturalDimensions({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 800,
      });
    };
    img.src = activeMediaUrl;
  }, [activeMediaUrl]);

  // Measure canvas viewport size on resize
  useEffect(() => {
    if (!isOpen) return;
    const updateSize = () => {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        setViewportSize({
          width: Math.max(300, rect.width),
          height: Math.max(300, rect.height),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  // Current active item's edit state
  const currentEdit = useMemo<ItemEditState>(() => {
    if (!activeMediaId) return DEFAULT_ITEM_STATE;
    return editsMap[activeMediaId] || DEFAULT_ITEM_STATE;
  }, [editsMap, activeMediaId]);

  // Helper to mutate active item's edit state
  const updateCurrentEdit = useCallback(
    (updater: (prev: ItemEditState) => ItemEditState) => {
      if (!activeMediaId) return;
      setEditsMap((prev) => {
        const oldState = prev[activeMediaId] || DEFAULT_ITEM_STATE;
        const nextState = updater(oldState);
        return {
          ...prev,
          [activeMediaId]: {
            ...nextState,
            isModified: true,
          },
        };
      });
    },
    [activeMediaId]
  );

  // Total modified count across all images
  const modifiedCount = useMemo(() => {
    return Object.values(editsMap).filter((e) => e.isModified).length;
  }, [editsMap]);

  const hasAnyChanges = modifiedCount > 0;

  // Handle Aspect Ratio Selection
  const handleSelectAspectRatio = (ratioId: AspectRatioOption) => {
    updateCurrentEdit((prev) => {
      let targetRatio: number | null = null;
      if (ratioId === 'original') {
        targetRatio = naturalDimensions.width / naturalDimensions.height;
      } else {
        const cfg = ASPECT_RATIO_OPTIONS.find((o) => o.id === ratioId);
        targetRatio = cfg?.ratio ?? null;
      }

      let nextCrop = { x: 0, y: 0, width: 1, height: 1 };
      if (targetRatio !== null && targetRatio > 0) {
        // Compute centered crop box inside normalized 0..1 bounding box
        const naturalRatio = naturalDimensions.width / naturalDimensions.height;
        if (targetRatio > naturalRatio) {
          // target is wider than natural image
          const h = naturalRatio / targetRatio;
          nextCrop = {
            x: 0,
            y: (1 - h) / 2,
            width: 1,
            height: Math.min(1, Math.max(0.1, h)),
          };
        } else {
          // target is taller than natural image
          const w = targetRatio / naturalRatio;
          nextCrop = {
            x: (1 - w) / 2,
            y: 0,
            width: Math.min(1, Math.max(0.1, w)),
            height: 1,
          };
        }
      }

      return {
        ...prev,
        aspectRatio: ratioId,
        cropNorm: nextCrop,
        pan: { x: 0, y: 0 },
      };
    });
  };

  // Rotation: 90 deg steps
  const handleRotateLeft = () => {
    updateCurrentEdit((prev) => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }));
  };

  const handleRotateRight = () => {
    updateCurrentEdit((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  // Flip Horizontal & Vertical
  const handleFlipHorizontal = () => {
    updateCurrentEdit((prev) => ({
      ...prev,
      flipH: !prev.flipH,
    }));
  };

  const handleFlipVertical = () => {
    updateCurrentEdit((prev) => ({
      ...prev,
      flipV: !prev.flipV,
    }));
  };

  // Straighten: angle slider
  const handleStraightenChange = (val: number) => {
    updateCurrentEdit((prev) => ({
      ...prev,
      straighten: val,
    }));
  };

  // Center: Reset pan & zoom
  const handleCenter = () => {
    updateCurrentEdit((prev) => ({
      ...prev,
      pan: { x: 0, y: 0 },
      zoom: 1,
    }));
  };

  // Reset to Original
  const handleResetToOriginal = () => {
    if (!activeMediaId) return;
    setEditsMap((prev) => ({
      ...prev,
      [activeMediaId]: {
        ...DEFAULT_ITEM_STATE,
        isModified: true,
      },
    }));
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    updateCurrentEdit((prev) => {
      const nextZoom = Math.min(3, Math.max(1, prev.zoom + delta));
      return { ...prev, zoom: Number(nextZoom.toFixed(2)) };
    });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoom(delta);
  };

  // Pan interaction handling
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan with primary mouse button if not clicking a crop handle
    if (e.button !== 0 || activeHandle) return;
    setIsPanning(true);
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startPanX: currentEdit.pan.x,
      startPanY: currentEdit.pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      updateCurrentEdit((prev) => ({
        ...prev,
        pan: {
          x: panStartRef.current.startPanX + dx,
          y: panStartRef.current.startPanY + dy,
        },
      }));
    } else if (activeHandle && currentEdit.aspectRatio === 'freeform') {
      const dxNorm = (e.clientX - dragHandleStartRef.current.mouseX) / (viewportSize.width * 0.7);
      const dyNorm = (e.clientY - dragHandleStartRef.current.mouseY) / (viewportSize.height * 0.7);
      const init = dragHandleStartRef.current.initialCrop;

      let nextX = init.x;
      let nextY = init.y;
      let nextW = init.width;
      let nextH = init.height;

      if (activeHandle.includes('e')) nextW = Math.min(1 - init.x, Math.max(0.15, init.width + dxNorm));
      if (activeHandle.includes('s')) nextH = Math.min(1 - init.y, Math.max(0.15, init.height + dyNorm));
      if (activeHandle.includes('w')) {
        const potentialW = Math.max(0.15, init.width - dxNorm);
        nextX = Math.max(0, init.x + (init.width - potentialW));
        nextW = potentialW;
      }
      if (activeHandle.includes('n')) {
        const potentialH = Math.max(0.15, init.height - dyNorm);
        nextY = Math.max(0, init.y + (init.height - potentialH));
        nextH = potentialH;
      }

      updateCurrentEdit((prev) => ({
        ...prev,
        cropNorm: { x: nextX, y: nextY, width: nextW, height: nextH },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setActiveHandle(null);
  };

  // Keyboard Escape handler with Discard modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasAnyChanges) {
          setShowDiscardModal(true);
        } else {
          onCancel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasAnyChanges, onCancel]);

  // Attempt cancel
  const handleAttemptCancel = () => {
    if (hasAnyChanges) {
      setShowDiscardModal(true);
    } else {
      onCancel();
    }
  };

  // Export & Apply Changes Logic
  const handleApplyChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveProgress(10);

    try {
      const updatedMediaList: PostMedia[] = [];

      for (let i = 0; i < imageMediaList.length; i++) {
        const media = imageMediaList[i];
        const editState = editsMap[media.id] || DEFAULT_ITEM_STATE;

        setSaveProgress(Math.round(((i + 1) / imageMediaList.length) * 80));

        // If not modified, keep existing media unchanged
        if (!editState.isModified) {
          updatedMediaList.push(media);
          continue;
        }

        // Render edited image to canvas and export Blob
        const blob = await renderTransformedImageBlob(
          media.originalUrl || media.url,
          editState
        );

        if (!blob) {
          updatedMediaList.push(media);
          continue;
        }

        // Upload transformed blob to Supabase Storage via /api/media/upload
        const cleanName = media.name.replace(/\.[^/.]+$/, '');
        const filename = `${cleanName}_edited_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await res.json();
        const finalUrl = uploadData.success && uploadData.url ? uploadData.url : media.url;

        const updatedItem: PostMedia = {
          ...media,
          url: finalUrl,
          thumbnailUrl: finalUrl,
          originalUrl: media.originalUrl || media.url, // preserve pristine source!
          aspectRatio: editState.aspectRatio,
          editMetadata: {
            aspectRatio: editState.aspectRatio,
            rotation: editState.rotation,
            flipH: editState.flipH,
            flipV: editState.flipV,
            straighten: editState.straighten,
            zoom: editState.zoom,
            cropRect: editState.cropNorm,
          },
        };

        updatedMediaList.push(updatedItem);
      }

      setSaveProgress(100);
      await onSave(updatedMediaList);
    } catch (err) {
      console.error('[EditMediaStudio] Save failed:', err);
      alert('Failed to apply edits. Please retry.');
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  if (!isOpen || imageMediaList.length === 0) return null;

  // Compute CSS transform for live interactive preview canvas
  const totalRotation = currentEdit.rotation + currentEdit.straighten;
  const scaleX = (currentEdit.flipH ? -1 : 1) * currentEdit.zoom;
  const scaleY = (currentEdit.flipV ? -1 : 1) * currentEdit.zoom;

  // Calculate crop box aspect ratio style
  let cropBoxAspect = '1 / 1';
  if (currentEdit.aspectRatio === 'original') {
    cropBoxAspect = `${naturalDimensions.width} / ${naturalDimensions.height}`;
  } else if (currentEdit.aspectRatio === '3:4') {
    cropBoxAspect = '3 / 4';
  } else if (currentEdit.aspectRatio === '4:5') {
    cropBoxAspect = '4 / 5';
  } else if (currentEdit.aspectRatio === '1:1') {
    cropBoxAspect = '1 / 1';
  } else if (currentEdit.aspectRatio === '9:16') {
    cropBoxAspect = '9 / 16';
  } else if (currentEdit.aspectRatio === '1.91:1') {
    cropBoxAspect = '1.91 / 1';
  } else {
    // freeform
    cropBoxAspect = `${Math.max(0.1, currentEdit.cropNorm.width)} / ${Math.max(0.1, currentEdit.cropNorm.height)}`;
  }

  const isMultiple = imageMediaList.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col select-none overflow-hidden animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP HEADER (Premium White Theme with subtle border) */}
      <header className="h-16 px-6 border-b border-gray-200/90 flex items-center justify-between shrink-0 bg-white shadow-2xs z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Pencil className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Edit Media</h1>
            <p className="text-[11px] text-gray-500 font-medium">
              {isMultiple
                ? `Slide ${activeIndex + 1} of ${imageMediaList.length} · ${activeMedia?.name || 'Image'}`
                : activeMedia?.name || 'Adjust crop, aspect ratio and transformation'}
            </p>
          </div>
        </div>

        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={handleAttemptCancel}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* 2. MAIN WORKSPACE: CANVAS + RIGHT EDIT PANEL */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-gray-50/60">
        {/* LEFT / CENTER: INTERACTIVE EDITING CANVAS */}
        <main
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ minHeight: '380px' }}
        >
          {/* Zoom floating controls bar */}
          <div className="absolute top-4 left-4 z-20 flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-md p-1 gap-1">
            <button
              type="button"
              onClick={() => handleZoom(-0.2)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-gray-700 px-1 min-w-[42px] text-center">
              {Math.round(currentEdit.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.2)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Viewport Frame */}
          <div className="relative w-full h-full flex items-center justify-center max-w-[820px] max-h-[640px]">
            {/* The Crop Mask Box with Rule-of-Thirds Grid */}
            <div
              className="relative shadow-2xl overflow-hidden rounded-lg bg-gray-900 border-2 border-white ring-1 ring-black/10 flex items-center justify-center"
              style={{
                aspectRatio: cropBoxAspect,
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
              }}
            >
              {/* Transformed Image Element */}
              <img
                src={activeMediaUrl}
                alt={activeMedia?.name || 'Editable media'}
                draggable={false}
                className="max-w-none transition-transform select-none pointer-events-none"
                style={{
                  transform: `translate(${currentEdit.pan.x}px, ${currentEdit.pan.y}px) rotate(${totalRotation}deg) scale(${scaleX}, ${scaleY})`,
                  maxHeight: '520px',
                  objectFit: 'contain',
                }}
              />

              {/* Rule of Thirds Guide Lines Overlay (3x3 Grid) */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-r border-b border-white/25" />
                <div className="border-b border-white/25" />
                <div className="border-r border-white/25" />
                <div className="border-r border-white/25" />
                <div className="" />
              </div>

              {/* Freeform Interactive Corner Handles */}
              {currentEdit.aspectRatio === 'freeform' && (
                <>
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveHandle('nw');
                      dragHandleStartRef.current = {
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                        initialCrop: { ...currentEdit.cropNorm },
                      };
                    }}
                    className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 bg-white shadow-xs cursor-nwse-resize z-20"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveHandle('ne');
                      dragHandleStartRef.current = {
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                        initialCrop: { ...currentEdit.cropNorm },
                      };
                    }}
                    className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500 bg-white shadow-xs cursor-nesw-resize z-20"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveHandle('sw');
                      dragHandleStartRef.current = {
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                        initialCrop: { ...currentEdit.cropNorm },
                      };
                    }}
                    className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500 bg-white shadow-xs cursor-nesw-resize z-20"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveHandle('se');
                      dragHandleStartRef.current = {
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                        initialCrop: { ...currentEdit.cropNorm },
                      };
                    }}
                    className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 bg-white shadow-xs cursor-nwse-resize z-20"
                  />
                </>
              )}
            </div>
          </div>

          {/* Bottom Carousel Thumbnail Strip (Multiple images only) */}
          {isMultiple && (
            <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-gray-200/90 shadow-lg flex items-center gap-2 max-w-[90vw] overflow-x-auto">
                {imageMediaList.map((media, idx) => {
                  const isCur = idx === activeIndex;
                  const itemEd = editsMap[media.id];
                  const hasEdits = itemEd?.isModified;

                  return (
                    <button
                      key={media.id || idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer ${
                        isCur
                          ? 'ring-2 ring-emerald-500 ring-offset-2 border-2 border-emerald-600 scale-105 shadow-md'
                          : 'border border-gray-200/90 opacity-70 hover:opacity-100 hover:scale-102'
                      }`}
                      title={`Slide ${idx + 1}`}
                    >
                      <img
                        src={media.thumbnailUrl || media.originalUrl || media.url}
                        alt={`Slide ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded-sm">
                        {idx + 1}
                      </span>
                      {hasEdits && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT EDITING PANEL (Matching reference layout with PostingTube white theme) */}
        <aside className="w-full lg:w-[360px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200/90 flex flex-col justify-between shrink-0 shadow-xs z-20 overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Header: Edit tab indicator (Explicitly excluding Appearance, Alt Text, Tag People per instructions) */}
            <div className="border-b border-gray-200/80 pb-3">
              <div className="flex items-center space-x-2 pb-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                  Edit
                </span>
                <span className="text-xs text-gray-400 font-medium">· Crop & Transform</span>
              </div>
            </div>

            {/* A. CROP & TRANSFORM SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <CropIcon className="w-3.5 h-3.5 text-gray-500" />
                  <span>Crop & Transform</span>
                </h3>
              </div>

              {/* Aspect Ratio Options List */}
              <div className="space-y-1.5">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const isSelected = currentEdit.aspectRatio === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAspectRatio(opt.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-500/30 shadow-2xs'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-[9px] font-bold ${
                            isSelected
                              ? 'border-emerald-600 bg-white text-emerald-700'
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        >
                          {opt.id === '1:1' ? '1:1' : opt.id === 'original' ? 'orig' : '▪'}
                        </div>
                        <div className="text-left">
                          <span className="font-bold block leading-tight">{opt.title}</span>
                          <span className="text-[10px] text-gray-400 block leading-tight">
                            {opt.subtitle}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. ROTATE & FLIP SECTION */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                Rotate & Flip
              </span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="py-2.5 px-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Rotate Left (-90°)"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] font-medium">-90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="py-2.5 px-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Rotate Right (+90°)"
                >
                  <RotateCw className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] font-medium">+90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleFlipHorizontal}
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                    currentEdit.flipH
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                  title="Flip Horizontally"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={handleFlipVertical}
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                    currentEdit.flipV
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                  title="Flip Vertically"
                >
                  <FlipVertical className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Flip V</span>
                </button>
              </div>
            </div>

            {/* C. STRAIGHTEN SECTION */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                  Straighten
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {currentEdit.straighten > 0 ? `+${currentEdit.straighten}°` : `${currentEdit.straighten}°`}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] text-gray-400 font-mono">-45°</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  value={currentEdit.straighten}
                  onChange={(e) => handleStraightenChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 font-mono">+45°</span>
              </div>
              {currentEdit.straighten !== 0 && (
                <button
                  type="button"
                  onClick={() => handleStraightenChange(0)}
                  className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer block text-right w-full"
                >
                  Reset angle
                </button>
              )}
            </div>

            {/* D. CENTER AND RESET ACTIONS */}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCenter}
                className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
                title="Center image in canvas"
              >
                <Move className="w-3.5 h-3.5 text-gray-500" />
                <span>Center</span>
              </button>
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
                title="Reset all edits to original"
              >
                <ResetIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 3. RIGHT BOTTOM ACTION BUTTONS (As strictly shown in user screenshot media_1794157435349_e297c2a0) */}
          <div className="p-5 border-t border-gray-200/90 bg-white space-y-3 shrink-0">
            {isSaving && (
              <div className="space-y-1 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                  <span>Saving & uploading edits...</span>
                  <span className="font-mono text-emerald-600">{saveProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${saveProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2.5">
              {/* Cancel Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleAttemptCancel}
                className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              {/* Apply Changes to X Item(s) Button (Reference Image 2) */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleApplyChanges}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Applying Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {isMultiple
                        ? `Apply Changes to ${modifiedCount > 0 ? modifiedCount : 1} Item${
                            modifiedCount > 1 ? 's' : ''
                          }`
                        : 'Apply Changes to 1 Item'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. UNSAVED CHANGES GUARD MODAL (Discard Changes vs Keep Editing) */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Discard unsaved edits?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                You have active edits on your image. If you leave now, these adjustments will be discarded.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDiscardModal(false);
                  onCancel();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Offscreen Canvas Image Rendering Engine
 * Applies cropping, aspect-ratio constraint, rotation, flipping, and straightening in memory.
 * Exports a high-quality JPEG Blob for durable Supabase Storage persistence.
 */
async function renderTransformedImageBlob(
  imageUrl: string,
  state: ItemEditState
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const nw = img.naturalWidth || 800;
        const nh = img.naturalHeight || 800;

        // Determine target crop dimensions
        let cropW = nw * state.cropNorm.width;
        let cropH = nh * state.cropNorm.height;
        let cropX = nw * state.cropNorm.x;
        let cropY = nh * state.cropNorm.y;

        // Defensive bounding
        cropX = Math.max(0, Math.min(nw - 10, cropX));
        cropY = Math.max(0, Math.min(nh - 10, cropY));
        cropW = Math.max(20, Math.min(nw - cropX, cropW));
        cropH = Math.max(20, Math.min(nh - cropY, cropH));

        // Output canvas max resolution (capped at 2048px for crisp quality and fast uploads)
        const maxDimension = 1920;
        let outW = cropW;
        let outH = cropH;

        if (outW > maxDimension || outH > maxDimension) {
          const ratio = Math.min(maxDimension / outW, maxDimension / outH);
          outW = Math.round(outW * ratio);
          outH = Math.round(outH * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(outW);
        canvas.height = Math.round(outH);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // Move to center of canvas for rotation and flipping
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Apply rotation (90 deg steps + straightening)
        const totalAngleRad = ((state.rotation + state.straighten) * Math.PI) / 180;
        ctx.rotate(totalAngleRad);

        // Apply scale & flips
        const sX = (state.flipH ? -1 : 1) * state.zoom;
        const sY = (state.flipV ? -1 : 1) * state.zoom;
        ctx.scale(sX, sY);

        // Draw the cropped region centered
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          -canvas.width / 2,
          -canvas.height / 2,
          canvas.width,
          canvas.height
        );

        ctx.restore();

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg',
          0.92
        );
      } catch (e) {
        console.warn('Canvas export failed:', e);
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = imageUrl;
  });
}
