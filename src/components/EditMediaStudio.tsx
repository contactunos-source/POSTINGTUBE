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
  { id: 'original', title: 'Original', subtitle: 'Full image', ratio: null },
  { id: 'freeform', title: 'Freeform', subtitle: 'Any custom size', ratio: null },
  { id: '1:1', title: '1:1', subtitle: 'Square', ratio: 1 / 1 },
  { id: '4:5', title: '4:5', subtitle: 'Social Portrait', ratio: 4 / 5 },
  { id: '3:4', title: '3:4', subtitle: 'Portrait', ratio: 3 / 4 },
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

/**
 * Visual SVG Wireframe Aspect Ratio Icon
 */
const RatioWireframeIcon: React.FC<{ id: AspectRatioOption; isSelected: boolean }> = ({
  id,
  isSelected,
}) => {
  const stroke = isSelected ? '#059669' : '#6b7280';
  const fill = isSelected ? '#ecfdf5' : '#f9fafb';

  switch (id) {
    case 'freeform':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="3" y="3" width="16" height="16" rx="2" stroke={stroke} strokeWidth="1.5" strokeDasharray="2 2" fill={fill} />
          <path d="M7 3V6M15 3V6M7 16V19M15 16V19M3 7H6M3 15H6M16 7H19M16 15H19" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'original':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="2.5" y="3.5" width="17" height="15" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} />
          <path d="M6 7H9M6 7V10M16 15H13M16 15V12" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case '1:1':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="3.5" y="3.5" width="15" height="15" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} />
        </svg>
      );
    case '4:5':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="4.5" y="2.5" width="13" height="17" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} />
        </svg>
      );
    case '3:4':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="5" y="2.5" width="12" height="17" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} />
        </svg>
      );
    case '9:16':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="6" y="2" width="10" height="18" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} />
        </svg>
      );
    case '1.91:1':
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <rect x="2" y="6" width="18" height="10" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} />
        </svg>
      );
    default:
      return null;
  }
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

  // Mouse drag interaction state (pan or freeform crop)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragHandleStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialCrop: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Measure natural dimensions of the active image
  useEffect(() => {
    if (!activeMediaUrl) return;
    const img = new Image();
    img.src = activeMediaUrl;
    img.onload = () => {
      setNaturalDimensions({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 800,
      });
    };
  }, [activeMediaUrl]);

  // Current active item's edit state
  const currentEdit = useMemo<ItemEditState>(() => {
    if (!activeMediaId) return DEFAULT_ITEM_STATE;
    return editsMap[activeMediaId] || DEFAULT_ITEM_STATE;
  }, [editsMap, activeMediaId]);

  // Helper to mutate active item edit state
  const updateCurrentEdit = useCallback(
    (updater: Partial<ItemEditState> | ((prev: ItemEditState) => ItemEditState)) => {
      if (!activeMediaId) return;
      setEditsMap((prev) => {
        const existing = prev[activeMediaId] || DEFAULT_ITEM_STATE;
        const next = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
        return {
          ...prev,
          [activeMediaId]: {
            ...next,
            isModified: true,
          },
        };
      });
    },
    [activeMediaId]
  );

  // Count total modified items across carousel
  const modifiedCount = useMemo(() => {
    return Object.values(editsMap).filter((e) => e.isModified).length;
  }, [editsMap]);

  // Aspect ratio switch handler
  const handleSelectAspectRatio = (ratioId: AspectRatioOption) => {
    updateCurrentEdit((prev) => {
      return {
        ...prev,
        aspectRatio: ratioId,
        // Reset pan & zoom to optimal centered position on ratio change
        pan: { x: 0, y: 0 },
        zoom: 1,
        cropNorm: { x: 0, y: 0, width: 1, height: 1 },
      };
    });
  };

  // 90-degree Rotation handlers
  const handleRotateLeft = () => {
    updateCurrentEdit((prev) => {
      const nextRot = (prev.rotation - 90 + 360) % 360;
      return { ...prev, rotation: nextRot };
    });
  };

  const handleRotateRight = () => {
    updateCurrentEdit((prev) => {
      const nextRot = (prev.rotation + 90) % 360;
      return { ...prev, rotation: nextRot };
    });
  };

  // Flip handlers
  const handleFlipHorizontal = () => {
    updateCurrentEdit((prev) => ({ ...prev, flipH: !prev.flipH }));
  };

  const handleFlipVertical = () => {
    updateCurrentEdit((prev) => ({ ...prev, flipV: !prev.flipV }));
  };

  // Straighten angle slider handler (-45 to 45 degrees)
  const handleStraightenChange = (val: number) => {
    const clamped = Math.max(-45, Math.min(45, val));
    updateCurrentEdit((prev) => ({ ...prev, straighten: clamped }));
  };

  // Center image in canvas
  const handleCenter = () => {
    updateCurrentEdit((prev) => ({
      ...prev,
      pan: { x: 0, y: 0 },
    }));
  };

  // Reset to original uploaded state
  const handleResetToOriginal = () => {
    if (!activeMediaId) return;
    setEditsMap((prev) => ({
      ...prev,
      [activeMediaId]: {
        ...DEFAULT_ITEM_STATE,
        isModified: false,
      },
    }));
  };

  // Mouse pan handlers inside canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeHandle) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - currentEdit.pan.x, y: e.clientY - currentEdit.pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeHandle && dragHandleStartRef.current) {
      // Freeform crop resize logic
      const dx = (e.clientX - dragHandleStartRef.current.mouseX) / 400;
      const dy = (e.clientY - dragHandleStartRef.current.mouseY) / 400;
      const init = dragHandleStartRef.current.initialCrop;

      let newWidth = init.width;
      let newHeight = init.height;
      let newX = init.x;
      let newY = init.y;

      if (activeHandle.includes('e')) newWidth = Math.max(0.2, Math.min(1 - init.x, init.width + dx));
      if (activeHandle.includes('w')) {
        const potentialW = init.width - dx;
        if (potentialW >= 0.2 && init.x + dx >= 0) {
          newWidth = potentialW;
          newX = init.x + dx;
        }
      }
      if (activeHandle.includes('s')) newHeight = Math.max(0.2, Math.min(1 - init.y, init.height + dy));
      if (activeHandle.includes('n')) {
        const potentialH = init.height - dy;
        if (potentialH >= 0.2 && init.y + dy >= 0) {
          newHeight = potentialH;
          newY = init.y + dy;
        }
      }

      updateCurrentEdit({
        cropNorm: { x: newX, y: newY, width: newWidth, height: newHeight },
      });
      return;
    }

    if (!isDragging) return;
    const nextPanX = e.clientX - dragStart.x;
    const nextPanY = e.clientY - dragStart.y;
    updateCurrentEdit({ pan: { x: nextPanX, y: nextPanY } });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
    dragHandleStartRef.current = null;
  };

  // Zoom handlers (mouse wheel + buttons)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = Math.max(0.5, Math.min(3, currentEdit.zoom + delta));
    updateCurrentEdit({ zoom: parseFloat(nextZoom.toFixed(2)) });
  };

  const handleZoom = (delta: number) => {
    const nextZoom = Math.max(0.5, Math.min(3, currentEdit.zoom + delta));
    updateCurrentEdit({ zoom: parseFloat(nextZoom.toFixed(2)) });
  };

  // Keyboard navigation & Esc guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleAttemptCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, modifiedCount]);

  // Handle Cancel attempt (prompt if unsaved changes exist)
  const handleAttemptCancel = () => {
    if (modifiedCount > 0) {
      setShowDiscardModal(true);
    } else {
      onCancel();
    }
  };

  // Save changes & offscreen export
  const handleApplyChanges = async () => {
    try {
      setIsSaving(true);
      setSaveProgress(15);

      const updatedMediaList: PostMedia[] = [];

      for (let i = 0; i < imageMediaList.length; i++) {
        const item = imageMediaList[i];
        const editState = editsMap[item.id];

        if (!editState || !editState.isModified) {
          updatedMediaList.push(item);
          continue;
        }

        setSaveProgress(Math.round(20 + (i / imageMediaList.length) * 50));

        const sourceUrl = item.originalUrl || item.url;
        const renderedBlob = await renderTransformedImageBlob(sourceUrl, editState);

        let finalUrl = item.url;
        if (renderedBlob) {
          const formData = new FormData();
          const cleanFileName = (item.name || 'image.jpg').replace(/\.[^.]+$/, '') + '-edited.jpg';
          formData.append('file', renderedBlob, cleanFileName);

          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadRes.ok) {
            const data = await uploadRes.json();
            if (data.file?.url) {
              finalUrl = data.file.url;
            }
          }
        }

        const updatedItem: PostMedia = {
          ...item,
          url: finalUrl,
          originalUrl: item.originalUrl || item.url,
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
      className="fixed inset-0 z-50 bg-white flex flex-col select-none overflow-hidden animate-in fade-in duration-150 font-sans"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP HEADER (White Theme with subtle border) */}
      <header className="h-16 px-6 border-b border-gray-200/90 flex items-center justify-between shrink-0 bg-white shadow-2xs z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Pencil className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Edit Media</h1>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Studio
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              {isMultiple
                ? `Slide ${activeIndex + 1} of ${imageMediaList.length} · ${activeMedia?.name || 'Image'}`
                : activeMedia?.name || 'Adjust crop, aspect ratio and orientation'}
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-gray-50/70">
        {/* LEFT / CENTER: INTERACTIVE EDITING CANVAS */}
        <main
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ minHeight: '380px' }}
        >
          {/* Zoom floating controls bar */}
          <div className="absolute top-4 left-4 z-20 flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-md p-1 gap-1">
            <button
              type="button"
              onClick={() => handleZoom(-0.2)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-gray-700 px-1.5 min-w-[44px] text-center">
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
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button
              type="button"
              onClick={() => updateCurrentEdit({ zoom: 1, pan: { x: 0, y: 0 } })}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer text-[10px] font-semibold px-2"
              title="Fit to Screen"
            >
              Fit
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
                <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
                <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.5)]" />
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
            <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center pointer-events-auto">
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
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1.5 ring-white" />
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
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                  Edit
                </span>
                <span className="text-xs text-gray-500 font-medium">Crop & Transform</span>
              </div>
            </div>

            {/* A. CROP & TRANSFORM SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <CropIcon className="w-3.5 h-3.5 text-gray-500" />
                  <span>Aspect Ratio</span>
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
                      <div className="flex items-center space-x-3">
                        <RatioWireframeIcon id={opt.id} isSelected={isSelected} />
                        <div className="text-left">
                          <span className="font-bold block leading-tight">{opt.title}</span>
                          <span className="text-[10px] text-gray-400 block leading-tight mt-0.5">
                            {opt.subtitle}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. ROTATE & FLIP SECTION */}
            <div className="space-y-2.5 pt-3 border-t border-gray-100">
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
            <div className="space-y-2 pt-3 border-t border-gray-100">
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
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
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

          {/* 3. RIGHT BOTTOM ACTION BUTTONS */}
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
                className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 active:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              {/* Apply Changes to X Item(s) Button */}
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

        // Output canvas max resolution (capped at 1920px for crisp quality and fast uploads)
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
