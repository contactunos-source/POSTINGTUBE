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
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

export interface EditMediaStudioProps {
  isOpen: boolean;
  mediaList: PostMedia[];
  initialIndex?: number;
  onSave: (updatedMedia: PostMedia[]) => Promise<void> | void;
  onCancel: () => void;
  onUpdatePermanentUrl?: (mediaId: string, permanentUrl: string) => void;
}

export type AspectRatioOption =
  | 'original'
  | 'freeform'
  | '1:1'
  | '4:5'
  | '3:4'
  | '9:16'
  | '1.91:1';

interface AspectRatioConfig {
  id: AspectRatioOption;
  title: string;
  subtitle: string;
  ratio: number | null; // width / height (null for freeform/original)
}

const ASPECT_RATIO_OPTIONS: AspectRatioConfig[] = [
  { id: 'original', title: 'Original', subtitle: 'Full image area', ratio: null },
  { id: 'freeform', title: 'Freeform', subtitle: 'Custom crop boundary', ratio: null },
  { id: '1:1', title: '1:1', subtitle: 'Square (Instagram Post)', ratio: 1 / 1 },
  { id: '4:5', title: '4:5', subtitle: 'Portrait (Instagram Feed)', ratio: 4 / 5 },
  { id: '3:4', title: '3:4', subtitle: 'Portrait (Standard)', ratio: 3 / 4 },
  { id: '9:16', title: '9:16', subtitle: 'Vertical (Stories & Reels)', ratio: 9 / 16 },
  { id: '1.91:1', title: '1.91:1', subtitle: 'Landscape (Facebook/Feed)', ratio: 1.91 / 1 },
];

export interface CropRect {
  x: number; // 0..1 (fraction of image width)
  y: number; // 0..1 (fraction of image height)
  width: number; // 0..1 (fraction of image width)
  height: number; // 0..1 (fraction of image height)
}

export interface ItemEditState {
  aspectRatio: AspectRatioOption;
  cropNorm: CropRect;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  straighten: number; // -45 to 45
  zoom: number; // 1 to 3
  isModified: boolean;
}

const DEFAULT_ITEM_STATE: ItemEditState = {
  aspectRatio: 'original',
  cropNorm: { x: 0, y: 0, width: 1, height: 1 },
  rotation: 0,
  flipH: false,
  flipV: false,
  straighten: 0,
  zoom: 1,
  isModified: false,
};

/**
 * Calculates a mathematically centered crop box for a given target aspect ratio (width / height)
 * within an image of natural dimensions (nw, nh).
 */
function computeCenteredCrop(nw: number, nh: number, targetRatio: number | null): CropRect {
  if (!targetRatio || targetRatio <= 0 || nw <= 0 || nh <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const imgRatio = nw / nh;

  if (imgRatio > targetRatio) {
    // Image is wider than target ratio: crop horizontally
    const normWidth = Math.min(1, Math.max(0.05, targetRatio / imgRatio));
    const normX = (1 - normWidth) / 2;
    return {
      x: Math.max(0, parseFloat(normX.toFixed(4))),
      y: 0,
      width: Math.min(1, parseFloat(normWidth.toFixed(4))),
      height: 1,
    };
  } else {
    // Image is taller than target ratio: crop vertically
    const normHeight = Math.min(1, Math.max(0.05, imgRatio / targetRatio));
    const normY = (1 - normHeight) / 2;
    return {
      x: 0,
      y: Math.max(0, parseFloat(normY.toFixed(4))),
      width: 1,
      height: Math.min(1, parseFloat(normHeight.toFixed(4))),
    };
  }
}

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
  onUpdatePermanentUrl,
}) => {
  // Filter for images only
  const imageMediaList = useMemo(() => {
    return mediaList.filter(
      (m) =>
        m.type === 'image' ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(m.url || '') ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(m.name || '')
    );
  }, [mediaList]);

  // Maintain local reorderable items list
  const [itemsList, setItemsList] = useState<PostMedia[]>(() => [...imageMediaList]);

  // Sync if external mediaList changes
  useEffect(() => {
    setItemsList([...imageMediaList]);
  }, [imageMediaList]);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    return initialIndex >= 0 && initialIndex < imageMediaList.length ? initialIndex : 0;
  });

  // Track independent edit state per media item ID
  const [editsMap, setEditsMap] = useState<Record<string, ItemEditState>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Drag-and-drop state for reordering carousel slides
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Move item from one position to another (drag-and-drop or move buttons)
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= itemsList.length ||
      toIndex < 0 ||
      toIndex >= itemsList.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    setItemsList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((item, idx) => ({ ...item, order: idx }));
    });
    setActiveIndex(toIndex);
  };

  const isMultiple = itemsList.length > 1;

  // Active Image reference - always use current active media URL so applied crops persist on canvas
  const activeMedia = itemsList[activeIndex] || itemsList[0];
  const activeMediaId = activeMedia?.id;
  const activeMediaUrl = activeMedia?.url;

  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 800,
  });

  // Image wrapper element ref & active img element ref
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const activeImgRef = useRef<HTMLImageElement>(null);

  // Active drag interaction state
  const [dragInteraction, setDragInteraction] = useState<{
    type: 'move' | 'handle';
    handle?: string;
    startX: number;
    startY: number;
    initialCrop: CropRect;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  // Measure natural dimensions of the active image
  useEffect(() => {
    if (!activeMediaUrl) return;
    const img = new Image();
    img.src = activeMediaUrl;
    img.onload = () => {
      const nw = img.naturalWidth || 800;
      const nh = img.naturalHeight || 800;
      setNaturalDimensions({ width: nw, height: nh });
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

  // Aspect ratio switch handler (instant calculation, zero lag)
  const handleSelectAspectRatio = (ratioId: AspectRatioOption) => {
    const config = ASPECT_RATIO_OPTIONS.find((o) => o.id === ratioId);
    const nw = naturalDimensions.width || 800;
    const nh = naturalDimensions.height || 800;

    if (ratioId === 'original') {
      updateCurrentEdit({
        aspectRatio: 'original',
        cropNorm: { x: 0, y: 0, width: 1, height: 1 },
      });
    } else if (ratioId === 'freeform') {
      updateCurrentEdit((prev) => ({
        ...prev,
        aspectRatio: 'freeform',
      }));
    } else if (config?.ratio) {
      const newCrop = computeCenteredCrop(nw, nh, config.ratio);
      updateCurrentEdit({
        aspectRatio: ratioId,
        cropNorm: newCrop,
      });
    }
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

  // Center image crop box
  const handleCenter = () => {
    updateCurrentEdit((prev) => {
      const w = prev.cropNorm.width;
      const h = prev.cropNorm.height;
      return {
        ...prev,
        cropNorm: {
          x: Math.max(0, (1 - w) / 2),
          y: Math.max(0, (1 - h) / 2),
          width: w,
          height: h,
        },
      };
    });
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

  // Zoom handlers (mouse wheel + buttons)
  const handleZoom = (delta: number) => {
    const nextZoom = Math.max(0.5, Math.min(3, currentEdit.zoom + delta));
    updateCurrentEdit({ zoom: parseFloat(nextZoom.toFixed(2)) });
  };

  // -------------------------------------------------------------
  // INTERACTIVE CROP BOX: DRAG TO MOVE & DRAG HANDLES TO RESIZE
  // -------------------------------------------------------------
  const startDragMove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageWrapperRef.current) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();

    setDragInteraction({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...currentEdit.cropNorm },
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  };

  const startDragHandle = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageWrapperRef.current) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();

    setDragInteraction({
      type: 'handle',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...currentEdit.cropNorm },
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  };

  // Window-level mousemove & mouseup listeners for 60 FPS real-time dragging
  useEffect(() => {
    if (!dragInteraction) return;

    const onMouseMove = (e: MouseEvent) => {
      const { type, handle, startX, startY, initialCrop, containerWidth, containerHeight } =
        dragInteraction;
      if (containerWidth <= 0 || containerHeight <= 0) return;

      const deltaX = (e.clientX - startX) / containerWidth;
      const deltaY = (e.clientY - startY) / containerHeight;

      if (type === 'move') {
        const maxX = 1 - initialCrop.width;
        const maxY = 1 - initialCrop.height;
        const nextX = Math.max(0, Math.min(maxX, initialCrop.x + deltaX));
        const nextY = Math.max(0, Math.min(maxY, initialCrop.y + deltaY));

        updateCurrentEdit({
          cropNorm: {
            x: parseFloat(nextX.toFixed(4)),
            y: parseFloat(nextY.toFixed(4)),
            width: initialCrop.width,
            height: initialCrop.height,
          },
        });
      } else if (type === 'handle' && handle) {
        let newX = initialCrop.x;
        let newY = initialCrop.y;
        let newW = initialCrop.width;
        let newH = initialCrop.height;

        const isFreeform = currentEdit.aspectRatio === 'freeform' || currentEdit.aspectRatio === 'original';

        if (isFreeform) {
          if (handle.includes('e')) {
            newW = Math.max(0.08, Math.min(1 - initialCrop.x, initialCrop.width + deltaX));
          }
          if (handle.includes('s')) {
            newH = Math.max(0.08, Math.min(1 - initialCrop.y, initialCrop.height + deltaY));
          }
          if (handle.includes('w')) {
            const potentialW = initialCrop.width - deltaX;
            if (potentialW >= 0.08 && initialCrop.x + deltaX >= 0) {
              newX = initialCrop.x + deltaX;
              newW = potentialW;
            }
          }
          if (handle.includes('n')) {
            const potentialH = initialCrop.height - deltaY;
            if (potentialH >= 0.08 && initialCrop.y + deltaY >= 0) {
              newY = initialCrop.y + deltaY;
              newH = potentialH;
            }
          }
        } else {
          // Fixed ratio resize: preserve exact aspect ratio
          const activeCfg = ASPECT_RATIO_OPTIONS.find((o) => o.id === currentEdit.aspectRatio);
          const targetRatio = activeCfg?.ratio || 1;
          const nw = naturalDimensions.width || 800;
          const nh = naturalDimensions.height || 800;
          const ratioFactor = nw / (nh * targetRatio);

          if (handle === 'se') {
            newW = Math.max(0.08, Math.min(1 - initialCrop.x, initialCrop.width + deltaX));
            newH = newW * ratioFactor;
            if (initialCrop.y + newH > 1) {
              newH = 1 - initialCrop.y;
              newW = newH / ratioFactor;
            }
          } else if (handle === 'sw') {
            const potentialW = initialCrop.width - deltaX;
            if (potentialW >= 0.08 && initialCrop.x + deltaX >= 0) {
              newW = potentialW;
              newX = initialCrop.x + deltaX;
              newH = newW * ratioFactor;
              if (initialCrop.y + newH > 1) {
                newH = 1 - initialCrop.y;
                newW = newH / ratioFactor;
                newX = initialCrop.x + (initialCrop.width - newW);
              }
            }
          } else if (handle === 'ne') {
            newW = Math.max(0.08, Math.min(1 - initialCrop.x, initialCrop.width + deltaX));
            newH = newW * ratioFactor;
            const potentialY = initialCrop.y + (initialCrop.height - newH);
            if (potentialY >= 0) {
              newY = potentialY;
            } else {
              newY = 0;
              newH = initialCrop.y + initialCrop.height;
              newW = newH / ratioFactor;
            }
          } else if (handle === 'nw') {
            const potentialW = initialCrop.width - deltaX;
            if (potentialW >= 0.08 && initialCrop.x + deltaX >= 0) {
              newW = potentialW;
              newH = newW * ratioFactor;
              const potentialY = initialCrop.y + (initialCrop.height - newH);
              if (potentialY >= 0) {
                newX = initialCrop.x + deltaX;
                newY = potentialY;
              }
            }
          } else if (handle === 'e' || handle === 'w') {
            newW = Math.max(0.08, Math.min(1 - initialCrop.x, initialCrop.width + (handle === 'e' ? deltaX : -deltaX)));
            newH = newW * ratioFactor;
            if (initialCrop.y + newH <= 1) {
              if (handle === 'w') newX = Math.max(0, initialCrop.x + deltaX);
            }
          } else if (handle === 'n' || handle === 's') {
            newH = Math.max(0.08, Math.min(1 - initialCrop.y, initialCrop.height + (handle === 's' ? deltaY : -deltaY)));
            newW = newH / ratioFactor;
            if (initialCrop.x + newW <= 1) {
              if (handle === 'n') newY = Math.max(0, initialCrop.y + deltaY);
            }
          }
        }

        updateCurrentEdit({
          cropNorm: {
            x: Math.max(0, Math.min(1 - newW, parseFloat(newX.toFixed(4)))),
            y: Math.max(0, Math.min(1 - newH, parseFloat(newY.toFixed(4)))),
            width: Math.min(1, Math.max(0.05, parseFloat(newW.toFixed(4)))),
            height: Math.min(1, Math.max(0.05, parseFloat(newH.toFixed(4)))),
          },
        });
      }
    };

    const onMouseUp = () => {
      setDragInteraction(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragInteraction, currentEdit.aspectRatio, naturalDimensions, updateCurrentEdit]);

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

  // Handle Cancel attempt
  const handleAttemptCancel = () => {
    if (modifiedCount > 0) {
      setShowDiscardModal(true);
    } else {
      onCancel();
    }
  };

  // -------------------------------------------------------------
  // ZERO-LATENCY INSTANT APPLY & BACKGROUND PERSISTENCE
  // -------------------------------------------------------------
  const handleApplyChanges = async () => {
    try {
      setIsApplying(true);

      const optimisticMediaList: PostMedia[] = [];
      const uploadsToRun: Array<{
        targetItem: PostMedia;
        blob: Blob;
        cleanFileName: string;
      }> = [];

      // 1. Process all images in their chosen reordered sequence instantly
      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const editState = editsMap[item.id];

        if (!editState || !editState.isModified) {
          optimisticMediaList.push({
            ...item,
            order: i,
          });
          continue;
        }

        const sourceUrl = item.url;
        const domImage = (i === activeIndex && activeImgRef.current && activeImgRef.current.complete)
          ? activeImgRef.current
          : null;

        const renderedBlob = await renderTransformedImageBlob(sourceUrl, editState, domImage);

        if (renderedBlob) {
          // Create instant local Blob URL for immediate zero-latency UI update (< 1ms)
          const localBlobUrl = URL.createObjectURL(renderedBlob);
          const cleanFileName = (item.name || 'image.jpg').replace(/\.[^.]+$/, '') + '-edited.jpg';

          uploadsToRun.push({
            targetItem: item,
            blob: renderedBlob,
            cleanFileName,
          });

          optimisticMediaList.push({
            ...item,
            url: localBlobUrl,
            originalUrl: localBlobUrl,
            thumbnailUrl: localBlobUrl,
            aspectRatio: editState.aspectRatio,
            order: i,
            editMetadata: {
              aspectRatio: editState.aspectRatio,
              rotation: editState.rotation,
              flipH: editState.flipH,
              flipV: editState.flipV,
              straighten: editState.straighten,
              zoom: editState.zoom,
              cropRect: editState.cropNorm,
            },
          });
        } else {
          optimisticMediaList.push({
            ...item,
            order: i,
          });
        }
      }

      // 2. INSTANT UI UPDATE: Close studio and update dashboard immediately in under 50ms!
      onSave(optimisticMediaList);

      // 3. BACKGROUND PERSISTENCE (Non-blocking): upload to Supabase & update permanent URLs
      if (uploadsToRun.length > 0) {
        Promise.all(
          uploadsToRun.map(async ({ targetItem, blob, cleanFileName }) => {
            try {
              const formData = new FormData();
              formData.append('file', blob, cleanFileName);
              const res = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
              });
              if (res.ok) {
                const data = await res.json();
                const permanentUrl = data.url || data.file?.url;
                if (permanentUrl && onUpdatePermanentUrl) {
                  onUpdatePermanentUrl(targetItem.id, permanentUrl);
                }
              }
            } catch (upErr) {
              console.warn('[EditMediaStudio] Background upload notice:', upErr);
            }
          })
        );
      }
    } catch (err) {
      console.error('[EditMediaStudio] Apply changes failed:', err);
      alert('Failed to apply edits. Please retry.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen || itemsList.length === 0) return null;

  // Compute CSS transform for live interactive preview canvas
  const totalRotation = currentEdit.rotation + currentEdit.straighten;
  const scaleX = (currentEdit.flipH ? -1 : 1) * currentEdit.zoom;
  const scaleY = (currentEdit.flipV ? -1 : 1) * currentEdit.zoom;

  const isDragging = dragInteraction !== null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col select-none overflow-hidden animate-in fade-in duration-150 font-sans">
      {/* 1. TOP HEADER */}
      <header className="h-16 px-6 border-b border-gray-200/90 flex items-center justify-between shrink-0 bg-white shadow-2xs z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Pencil className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Edit Media</h1>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Instant Studio
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              {isMultiple
                ? `Slide ${activeIndex + 1} of ${itemsList.length} · ${activeMedia?.name || 'Image'}`
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
          className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden"
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
              onClick={() => updateCurrentEdit({ zoom: 1 })}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer text-[10px] font-semibold px-2"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          {/* Canvas Viewport Frame */}
          <div className="relative w-full h-full flex items-center justify-center max-w-[840px] max-h-[640px] p-4">
            {/* The Image Container with Crop Mask and Interactive Selection Box */}
            <div
              ref={imageWrapperRef}
              className="relative inline-block select-none shadow-2xl rounded-sm overflow-hidden"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              {/* Displayed Image with live zoom and orientation transform */}
              <img
                ref={activeImgRef}
                src={activeMediaUrl}
                crossOrigin="anonymous"
                alt={activeMedia?.name || 'Editable media'}
                draggable={false}
                className="max-h-[520px] max-w-[760px] w-auto h-auto object-contain block pointer-events-none select-none"
                style={{
                  transform: `rotate(${totalRotation}deg) scale(${scaleX}, ${scaleY})`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              />

              {/* Interactive Crop Selection Box with Outside Shadow Dimming */}
              <div
                onMouseDown={startDragMove}
                className="absolute z-20 cursor-move border-2 border-white ring-1 ring-black/40 shadow-xs"
                style={{
                  left: `${currentEdit.cropNorm.x * 100}%`,
                  top: `${currentEdit.cropNorm.y * 100}%`,
                  width: `${currentEdit.cropNorm.width * 100}%`,
                  height: `${currentEdit.cropNorm.height * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.52)',
                  transition: isDragging ? 'none' : 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Rule of Thirds Guide Lines Overlay (3x3 Grid) */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                  <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div className="border-r border-b border-white/40 shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  <div />
                </div>

                {/* 4 Corner Drag Handles (Matching user reference media_1794194006051_fac3dff8.png) */}
                <div
                  onMouseDown={(e) => startDragHandle(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-gray-900 shadow-md cursor-nwse-resize z-20 rounded-xs hover:scale-125 transition-transform"
                  title="Resize top-left"
                />
                <div
                  onMouseDown={(e) => startDragHandle(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-gray-900 shadow-md cursor-nesw-resize z-20 rounded-xs hover:scale-125 transition-transform"
                  title="Resize top-right"
                />
                <div
                  onMouseDown={(e) => startDragHandle(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-gray-900 shadow-md cursor-nesw-resize z-20 rounded-xs hover:scale-125 transition-transform"
                  title="Resize bottom-left"
                />
                <div
                  onMouseDown={(e) => startDragHandle(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-gray-900 shadow-md cursor-nwse-resize z-20 rounded-xs hover:scale-125 transition-transform"
                  title="Resize bottom-right"
                />

                {/* 4 Edge Drag Handles */}
                <div
                  onMouseDown={(e) => startDragHandle(e, 'n')}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border border-gray-900 shadow-md cursor-ns-resize z-20 rounded-xs hover:scale-110 transition-transform"
                  title="Resize top"
                />
                <div
                  onMouseDown={(e) => startDragHandle(e, 's')}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border border-gray-900 shadow-md cursor-ns-resize z-20 rounded-xs hover:scale-110 transition-transform"
                  title="Resize bottom"
                />
                <div
                  onMouseDown={(e) => startDragHandle(e, 'w')}
                  className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-6 bg-white border border-gray-900 shadow-md cursor-ew-resize z-20 rounded-xs hover:scale-110 transition-transform"
                  title="Resize left"
                />
                <div
                  onMouseDown={(e) => startDragHandle(e, 'e')}
                  className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2 h-6 bg-white border border-gray-900 shadow-md cursor-ew-resize z-20 rounded-xs hover:scale-110 transition-transform"
                  title="Resize right"
                />
              </div>
            </div>
          </div>

          {/* Bottom Carousel Thumbnail Strip (Multiple images only) */}
          {isMultiple && (
            <div className="absolute bottom-4 inset-x-0 z-20 flex flex-col items-center justify-center pointer-events-auto px-4">
              <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-gray-200/90 shadow-xl flex flex-col gap-2 max-w-[92vw]">
                {/* Header bar with Move Controls */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 px-1 gap-4">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-gray-400 font-normal">Rearrange:</span>
                    <span className="font-bold text-gray-900 truncate">Slide {activeIndex + 1} of {itemsList.length}</span>
                    <span className="text-[10px] text-gray-400 hidden sm:inline">(drag tabs or click arrows)</span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={activeIndex === 0}
                      onClick={() => moveItem(activeIndex, activeIndex - 1)}
                      className="p-1 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Move slide left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>Move Left</span>
                    </button>
                    <button
                      type="button"
                      disabled={activeIndex === itemsList.length - 1}
                      onClick={() => moveItem(activeIndex, activeIndex + 1)}
                      className="p-1 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Move slide right"
                    >
                      <span>Move Right</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Thumbnails Row */}
                <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                  {itemsList.map((media, idx) => {
                    const isCur = idx === activeIndex;
                    const itemEd = editsMap[media.id];
                    const hasEdits = itemEd?.isModified;
                    const isDragOver = dragOverIndex === idx;
                    const isBeingDragged = draggedIndex === idx;

                    return (
                      <button
                        key={media.id || idx}
                        type="button"
                        draggable={isMultiple}
                        onDragStart={(e) => {
                          setDraggedIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(idx));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverIndex !== idx) {
                            setDragOverIndex(idx);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverIndex === idx) {
                            setDragOverIndex(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIndex !== null && draggedIndex !== idx) {
                            moveItem(draggedIndex, idx);
                          }
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onClick={() => setActiveIndex(idx)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all cursor-grab active:cursor-grabbing select-none ${
                          isCur
                            ? 'ring-2 ring-emerald-500 ring-offset-2 border-2 border-emerald-600 scale-105 shadow-md'
                            : 'border border-gray-200/90 opacity-70 hover:opacity-100 hover:scale-102'
                        } ${isDragOver ? 'ring-2 ring-amber-500 ring-offset-1 scale-110 bg-amber-50' : ''} ${
                          isBeingDragged ? 'opacity-35 scale-95' : ''
                        }`}
                        title={`Slide ${idx + 1} (Drag to reorder)`}
                      >
                        <img
                          src={media.thumbnailUrl || media.url}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded-sm pointer-events-none">
                          {idx + 1}
                        </span>
                        {hasEdits && (
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1.5 ring-white pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT EDITING PANEL */}
        <aside className="w-full lg:w-[360px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200/90 flex flex-col justify-between shrink-0 shadow-xs z-20 overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Header: Edit tab indicator */}
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
                  className="py-2.5 px-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-95"
                  title="Rotate Left (-90°)"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] font-medium">-90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="py-2.5 px-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-95"
                  title="Rotate Right (+90°)"
                >
                  <RotateCw className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] font-medium">+90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleFlipHorizontal}
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-95 ${
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
                  className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-95 ${
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
                className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs active:scale-95"
                title="Center crop box"
              >
                <Move className="w-3.5 h-3.5 text-gray-500" />
                <span>Center</span>
              </button>
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs active:scale-95"
                title="Reset all edits to original"
              >
                <ResetIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 3. RIGHT BOTTOM ACTION BUTTONS */}
          <div className="p-5 border-t border-gray-200/90 bg-white space-y-3 shrink-0">
            <div className="flex items-center justify-end space-x-2.5">
              {/* Cancel Button */}
              <button
                type="button"
                disabled={isApplying}
                onClick={handleAttemptCancel}
                className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 active:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              {/* Apply Changes to X Item(s) Button (Zero-Latency Instant Apply) */}
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyChanges}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {isMultiple ? 'Apply Changes' : 'Apply Changes to 1 Item'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. UNSAVED CHANGES GUARD MODAL */}
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
 * Accurately extracts the pixel crop from source image, applies transformations,
 * and exports a high-quality JPEG Blob.
 * If domImage is provided, paints from in-memory DOM element in 0ms without re-downloading!
 */
async function renderTransformedImageBlob(
  imageUrl: string,
  state: ItemEditState,
  domImage?: HTMLImageElement | null
): Promise<Blob | null> {
  const getLoadedImage = (): Promise<HTMLImageElement | null> => {
    if (domImage && domImage.complete && domImage.naturalWidth > 0) {
      return Promise.resolve(domImage);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  };

  const img = await getLoadedImage();
  if (!img) return null;

  try {
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 800;

    // 1. Calculate pixel crop coordinates and dimensions on source image
    const cropX = Math.max(0, Math.min(nw - 10, Math.round(state.cropNorm.x * nw)));
    const cropY = Math.max(0, Math.min(nh - 10, Math.round(state.cropNorm.y * nh)));
    const cropW = Math.max(10, Math.min(nw - cropX, Math.round(state.cropNorm.width * nw)));
    const cropH = Math.max(10, Math.min(nh - cropY, Math.round(state.cropNorm.height * nh)));

    // 2. Intermediate canvas to extract cropped source region
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // 3. Final canvas for rotation, flip, and straighten
    const totalRot = (state.rotation + state.straighten) % 360;
    const isOrthogonal = totalRot === 90 || totalRot === 270 || totalRot === -90 || totalRot === -270;

    const outCanvas = document.createElement('canvas');
    if (isOrthogonal && state.straighten === 0) {
      outCanvas.width = cropH;
      outCanvas.height = cropW;
    } else {
      outCanvas.width = cropW;
      outCanvas.height = cropH;
    }

    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    outCtx.save();
    outCtx.translate(outCanvas.width / 2, outCanvas.height / 2);

    if (totalRot !== 0) {
      outCtx.rotate((totalRot * Math.PI) / 180);
    }

    const sX = state.flipH ? -1 : 1;
    const sY = state.flipV ? -1 : 1;
    if (sX !== 1 || sY !== 1) {
      outCtx.scale(sX, sY);
    }

    outCtx.drawImage(cropCanvas, -cropW / 2, -cropH / 2);
    outCtx.restore();

    return new Promise((resolve) => {
      outCanvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9
      );
    });
  } catch (err) {
    console.error('[renderTransformedImageBlob] Canvas export failed:', err);
    return null;
  }
}
