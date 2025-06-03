
import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { ImageStore } from '../App'; // Import ImageStore type
import type { BoostedParticipant, WheelDynamicBackground, LinearGradientBackgroundConfig, RadialGradientBackgroundConfigForWheel } from '../types'; // Import types

interface WheelCanvasProps {
  names: string[]; // Now contains text names or image IDs
  imageStore: ImageStore; // To look up image data using IDs
  boostedParticipants: BoostedParticipant[]; // For dynamic segment sizes
  rotationAngle: number; // in radians
  canvasSize?: number;
  onSpinComplete?: () => void; // Optional callback
  centerImageSrc?: string | null;
  wheelBackgroundImageSrc?: string | null; // New prop for wheel background
  dynamicBackgroundColor?: WheelDynamicBackground; // New prop for dynamic background color/gradient
  wheelTextColor?: string; // New prop for wheel text color
  onWheelClick?: () => void; // New prop for clicking the wheel
  tickSound?: HTMLAudioElement | null; // New prop for tick sound
  isTickSoundContinuous?: boolean; // New: Indicates if tickSound should be played continuously by App.tsx
}

const SEGMENT_COLORS = [
  "#FFC107", "#FF5722", "#4CAF50", "#2196F3", "#9C27B0",
  "#E91E63", "#00BCD4", "#8BC34A", "#CDDC39", "#FF9800",
  "#795548", "#607D8B"
];

const DEFAULT_TEXT_COLOR = "#1F2937";
const BORDER_COLOR = "#FFFFFF";
const POINTER_COLOR = "#F87171";

const MIN_FONT_SIZE = 6;

const IDLE_SEGMENT_COUNT = 5;
const IDLE_ROTATION_SPEED = 0.003; // Radians per frame

const BASE_MIN_TIME_BETWEEN_DISCRETE_TICKS_MS = 20;
const SINGLE_SEGMENT_MIN_TIME_BETWEEN_TICKS_MS = 250; 
const MIN_ROTATION_DELTA_FOR_TICK_LOGIC = 1e-7;
const MIN_TRAVEL_FOR_CROSSING_DEFAULT = 1e-6; 
const MIN_TRAVEL_FOR_CROSSING_SINGLE_SEGMENT = 0.01;


const drawSegmentTextInternal = (
  ctx: CanvasRenderingContext2D,
  text: string,
  segmentMiddleAngle: number, // This is the middle angle of the segment
  segmentAngleSpan: number, // The angular width of this specific segment
  radius: number,
  baseCanvasSize: number,
  isPlaceholder: boolean = false,
  customTextColor?: string // Added custom text color
) => {
  ctx.save();
  ctx.rotate(segmentMiddleAngle);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isPlaceholder ? "#A0A0A0" : (customTextColor || DEFAULT_TEXT_COLOR);

  const textArcLength = (radius * 0.7) * segmentAngleSpan;
  let maxTextWidth = Math.min(radius * 0.55, textArcLength * 0.8);


  let fontSize = Math.min(18, radius / 10, baseCanvasSize / 30);
  if (segmentAngleSpan < (Math.PI / 12)) {
    fontSize *= 0.8;
  }
  if (segmentAngleSpan < (Math.PI / 24)) {
    fontSize *= 0.7;
  }
  fontSize = Math.max(MIN_FONT_SIZE, fontSize);


  if (isPlaceholder) fontSize = Math.max(MIN_FONT_SIZE, fontSize * 0.8);

  ctx.font = `${isPlaceholder ? 'italic' : 'bold'} ${fontSize}px Arial, sans-serif`;

  while (ctx.measureText(text).width > maxTextWidth && fontSize > MIN_FONT_SIZE) {
      fontSize -= 1;
      ctx.font = `${isPlaceholder ? 'italic' : 'bold'} ${fontSize}px Arial, sans-serif`;
  }

  let displayText = text;
  if (ctx.measureText(displayText).width > maxTextWidth && fontSize <= MIN_FONT_SIZE) {
       let tempText = displayText;
       while(ctx.measureText(tempText + "...").width > maxTextWidth && tempText.length > 1) {
          tempText = tempText.substring(0, tempText.length - 1);
       }
       if (ctx.measureText(tempText + "...").width > maxTextWidth && tempText.length <=1){
           tempText = "";
           let aggressiveShorten = displayText;
           while(ctx.measureText(aggressiveShorten).width > maxTextWidth && aggressiveShorten.length > 0){
              aggressiveShorten = aggressiveShorten.substring(0, aggressiveShorten.length -1);
           }
           displayText = aggressiveShorten;
       } else if (tempText.length < displayText.length && tempText.length > 0) {
           displayText = tempText + "...";
       } else if (tempText.length === 0 && displayText.length > 0) {
          const avgCharWidth = ctx.measureText("M").width;
          const maxChars = Math.floor(maxTextWidth / (avgCharWidth > 0 ? avgCharWidth : 1));
          displayText = displayText.substring(0, maxChars > 1 ? maxChars -1 : maxChars ) + (maxChars > 1 ? "…" : "");
       }
  }

  if (displayText && displayText.length > 0 && fontSize >= MIN_FONT_SIZE * 0.8 && segmentAngleSpan > Math.PI / 180) {
      ctx.fillText(displayText, radius * 0.85, 0);
  }
  ctx.restore();
};

const drawSegmentImageInternal = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  segmentMiddleRotation: number,
  radius: number,
  _baseCanvasSize: number,
  segmentAngleSpan: number
) => {
  ctx.save();
  ctx.rotate(segmentMiddleRotation);

  const imgW = image.width;
  const imgH = image.height;

  if (imgW <= 0 || imgH <= 0) {
    ctx.restore();
    return;
  }

  const radialPositionForImageCenter = radius * 0.70;
  const maxRadialSpaceForImage = radius * 0.25;

  const tangentialSpaceAtRadialPosition = radialPositionForImageCenter * segmentAngleSpan;
  const maxTangentialSpaceForImage = tangentialSpaceAtRadialPosition * 0.7;

  const boxW = maxTangentialSpaceForImage;
  const boxH = maxRadialSpaceForImage;

  if (boxW < 1 || boxH < 1) {
    ctx.restore();
    return;
  }

  let dWidth = imgW;
  let dHeight = imgH;
  const aspectRatio = imgW / imgH;

  if (imgW / boxW > imgH / boxH) {
    dWidth = boxW;
    dHeight = dWidth / aspectRatio;
  } else {
    dHeight = boxH;
    dWidth = dHeight * aspectRatio;
  }

  dWidth = Math.max(1, Math.min(boxW, dWidth));
  dHeight = Math.max(1, Math.min(boxH, dHeight));

  if (!isFinite(dWidth) || !isFinite(dHeight) || dWidth < 1 || dHeight < 1) {
    ctx.restore();
    return;
  }

  const imageX = radialPositionForImageCenter - (dWidth / 2);
  const imageY = -dHeight / 2;

  ctx.drawImage(image, imageX, imageY, dWidth, dHeight);
  ctx.restore();
};


const WheelCanvas: React.FC<WheelCanvasProps> = ({
  names, imageStore, boostedParticipants, rotationAngle, canvasSize = 500,
  centerImageSrc, wheelBackgroundImageSrc, dynamicBackgroundColor, wheelTextColor, onWheelClick,
  tickSound, isTickSoundContinuous
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [loadedCenterImage, setLoadedCenterImage] = useState<HTMLImageElement | null>(null);
  const [loadedWheelBackgroundImage, setLoadedWheelBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [loadedSegmentImages, setLoadedSegmentImages] = useState<Record<string, HTMLImageElement | 'error' | 'loading'>>({});
  const [offscreenCanvasVersion, setOffscreenCanvasVersion] = useState(0); // New state

  const [isIdleAnimating, setIsIdleAnimating] = useState<boolean>(false);
  const [idleAnimationRotation, setIdleAnimationRotation] = useState<number>(0);
  const idleAnimationFrameIdRef = useRef<number | null>(null);

  const currentSegmentDefinitionsRef = useRef<{ nameOrId?: string; probability: number }[]>([]);
  const segmentStartAnglesRef = useRef<number[]>([]);
  
  const lastTickPlayTimeRef = useRef<number>(0);
  const lastActualRotationForTickRef = useRef<number>(0);


  useEffect(() => {
    if (names.length === 0 && !dynamicBackgroundColor && !wheelBackgroundImageSrc) {
      setIsIdleAnimating(true);
    } else {
      setIsIdleAnimating(false);
    }
  }, [names, dynamicBackgroundColor, wheelBackgroundImageSrc]);


  useEffect(() => {
    if (isIdleAnimating) {
      let lastTimestamp = 0;
      const animateIdle = (timestamp: number) => {
        if (lastTimestamp === 0) lastTimestamp = timestamp;
        setIdleAnimationRotation(prevRotation => (prevRotation + IDLE_ROTATION_SPEED) % (2 * Math.PI));
        lastTimestamp = timestamp;
        idleAnimationFrameIdRef.current = requestAnimationFrame(animateIdle);
      };
      idleAnimationFrameIdRef.current = requestAnimationFrame(animateIdle);
    } else {
      if (idleAnimationFrameIdRef.current) {
        cancelAnimationFrame(idleAnimationFrameIdRef.current);
        idleAnimationFrameIdRef.current = null;
      }
      setIdleAnimationRotation(0);
    }
    return () => {
      if (idleAnimationFrameIdRef.current) {
        cancelAnimationFrame(idleAnimationFrameIdRef.current);
      }
    };
  }, [isIdleAnimating]);


  useEffect(() => {
    if (centerImageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setLoadedCenterImage(img);
      img.onerror = () => {
        console.error("Failed to load center image:", centerImageSrc);
        setLoadedCenterImage(null);
      };
      img.src = centerImageSrc;
    } else {
      setLoadedCenterImage(null);
    }
  }, [centerImageSrc]);

  useEffect(() => {
    if (wheelBackgroundImageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setLoadedWheelBackgroundImage(img);
      img.onerror = () => {
        console.error("Failed to load wheel background image:", wheelBackgroundImageSrc);
        setLoadedWheelBackgroundImage(null);
      };
      img.src = wheelBackgroundImageSrc;
    } else {
      setLoadedWheelBackgroundImage(null);
    }
  }, [wheelBackgroundImageSrc]);

  useEffect(() => {
    names.forEach(nameOrId => {
      if (imageStore[nameOrId] && (!loadedSegmentImages[nameOrId] || loadedSegmentImages[nameOrId] === 'error')) {
        setLoadedSegmentImages(prev => ({ ...prev, [nameOrId]: 'loading' }));
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setLoadedSegmentImages(prev => ({ ...prev, [nameOrId]: img }));
        };
        img.onerror = () => {
          console.error(`Failed to load segment image: ${imageStore[nameOrId].fileName}`);
          setLoadedSegmentImages(prev => ({ ...prev, [nameOrId]: 'error' }));
        };
        img.src = imageStore[nameOrId].dataURL;
      }
    });

    setLoadedSegmentImages(prevLoaded => {
        const newLoadedImages = { ...prevLoaded };
        let changed = false;
        Object.keys(newLoadedImages).forEach(id => {
            if (!imageStore[id] || !names.includes(id)) {
                delete newLoadedImages[id];
                changed = true;
            }
        });
        return changed ? newLoadedImages : prevLoaded;
    });

  }, [names, imageStore]);


  useEffect(() => {
    if (!canvasSize) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreenCanvas = offscreenCanvasRef.current;

    const dpr = window.devicePixelRatio || 1;
    offscreenCanvas.width = canvasSize * dpr;
    offscreenCanvas.height = canvasSize * dpr;

    if (!offscreenCtxRef.current || offscreenCtxRef.current.canvas !== offscreenCanvas) {
        offscreenCtxRef.current = offscreenCanvas.getContext('2d');
    }

    const ctx = offscreenCtxRef.current;
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radius = canvasSize / 2 * 0.9;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    ctx.save();
    ctx.translate(centerX, centerY);

    if (dynamicBackgroundColor) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.clip();
      if (typeof dynamicBackgroundColor === 'string') {
        ctx.fillStyle = dynamicBackgroundColor;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      } else if (dynamicBackgroundColor.type === 'linear-gradient') {
        const gradConfig = dynamicBackgroundColor as LinearGradientBackgroundConfig;
        const angleRad = (gradConfig.angle - 90) * Math.PI / 180;
        const x0 = -radius * Math.cos(angleRad);
        const y0 = -radius * Math.sin(angleRad);
        const x1 = radius * Math.cos(angleRad);
        const y1 = radius * Math.sin(angleRad);
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        const sortedStops = [...gradConfig.stops].sort((a, b) => a.position - b.position);
        sortedStops.forEach(stop => {
          gradient.addColorStop(Math.max(0, Math.min(1, stop.position / 100)), stop.color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      } else if (dynamicBackgroundColor.type === 'radial-gradient') {
        const gradConfig = dynamicBackgroundColor as RadialGradientBackgroundConfigForWheel;
        let cx_rad = 0, cy_rad = 0;
        const R_rad = radius * 1.5; 
        const pos = gradConfig.position.toLowerCase();
        if (pos.includes('left')) cx_rad = -radius * 0.5;
        if (pos.includes('right')) cx_rad = radius * 0.5;
        if (pos.includes('top')) cy_rad = -radius * 0.5;
        if (pos.includes('bottom')) cy_rad = radius * 0.5;
        const gradient = ctx.createRadialGradient(cx_rad, cy_rad, 0, cx_rad, cy_rad, R_rad);
        const sortedStops = [...gradConfig.stops].sort((a, b) => a.position - b.position);
        sortedStops.forEach(stop => {
          gradient.addColorStop(Math.max(0, Math.min(1, stop.position / 100)), stop.color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      }
      ctx.restore();
    }
    
    let localSegmentDefs: { nameOrId?: string; probability: number }[] = [];
    if (names.length > 0) {
        const wheelItemsWithDetails = names.map(nameOrId => ({
            originalIdOrName: nameOrId,
            displayName: (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase(),
        }));
        const validBoostedOnWheel = boostedParticipants
            .map(bp => {
                const wheelItem = wheelItemsWithDetails.find(item => item.displayName === bp.name.trim().toLowerCase());
                return wheelItem ? { ...bp, originalIdOrName: wheelItem.originalIdOrName } : null;
            })
            .filter(bpOrNull => bpOrNull !== null && bpOrNull.percentage > 0 && bpOrNull.percentage < 100) as Array<BoostedParticipant & { originalIdOrName: string }>;

        const totalBoostedPercentageValue = validBoostedOnWheel.reduce((sum, bp) => sum + bp.percentage, 0);
        const isBoostConfigValidAndApplicable = totalBoostedPercentageValue > 0 && totalBoostedPercentageValue < 100 && validBoostedOnWheel.length > 0;

        if (isBoostConfigValidAndApplicable) {
            const remainingPercentageForNonBoosted = 100 - totalBoostedPercentageValue;
            const nonBoostedOnWheel = wheelItemsWithDetails.filter(
                item => !validBoostedOnWheel.some(bp => bp.originalIdOrName === item.originalIdOrName)
            );
            const numNonBoosted = nonBoostedOnWheel.length;
            const percentagePerNonBoosted = numNonBoosted > 0 ? remainingPercentageForNonBoosted / numNonBoosted : 0;

            names.forEach(nameOrId => {
                const boostedEntry = validBoostedOnWheel.find(bp => bp.originalIdOrName === nameOrId);
                if (boostedEntry) {
                    localSegmentDefs.push({ nameOrId, probability: boostedEntry.percentage / 100 });
                } else if (nonBoostedOnWheel.some(nb => nb.originalIdOrName === nameOrId) && percentagePerNonBoosted > 0) {
                    localSegmentDefs.push({ nameOrId, probability: percentagePerNonBoosted / 100 });
                }
            });
        } else {
            const numSegments = names.length;
            const probPerSegment = numSegments > 0 ? 1 / numSegments : 0;
            names.forEach(nameOrId => {
                localSegmentDefs.push({ nameOrId, probability: probPerSegment });
            });
        }

        localSegmentDefs = localSegmentDefs.filter(p => p.probability * 2 * Math.PI >= 0.0001);
        const currentTotalProbability = localSegmentDefs.reduce((sum, p) => sum + p.probability, 0);
        if (localSegmentDefs.length > 0 && currentTotalProbability > 0 && Math.abs(currentTotalProbability - 1.0) > 1e-9) {
            localSegmentDefs = localSegmentDefs.map(p => ({ ...p, probability: p.probability / currentTotalProbability }));
        }
    } else if (isIdleAnimating) {
        const probPerIdleSegment = 1 / IDLE_SEGMENT_COUNT;
        for (let i = 0; i < IDLE_SEGMENT_COUNT; i++) {
            localSegmentDefs.push({ nameOrId: `idle_${i}`, probability: probPerIdleSegment });
        }
    }
    currentSegmentDefinitionsRef.current = localSegmentDefs;

    const localSegmentStartAngles: number[] = [];
    let cumulativeAngle = 0;
    localSegmentDefs.forEach(def => {
        localSegmentStartAngles.push(cumulativeAngle);
        cumulativeAngle += def.probability * 2 * Math.PI;
    });
    segmentStartAnglesRef.current = localSegmentStartAngles;


    if (localSegmentDefs.length > 0 && (names.length > 0 || isIdleAnimating)) {
      if (names.length > 0) { // Actual named segments
        if (loadedWheelBackgroundImage) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, 2 * Math.PI);
          ctx.clip();
          const img = loadedWheelBackgroundImage;
          const imgRatio = img.width / img.height;
          const wheelDiameter = radius * 2;
          let dWidth, dHeight;
          if (img.width / wheelDiameter < img.height / wheelDiameter ) {
              dWidth = wheelDiameter;
              dHeight = dWidth / imgRatio;
          } else { 
              dHeight = wheelDiameter;
              dWidth = dHeight * imgRatio;
          }
          ctx.drawImage(img, -radius + (wheelDiameter - dWidth)/2, -radius + (wheelDiameter - dHeight)/2, dWidth, dHeight);
          ctx.restore();
        }

        let currentDrawingAngle = 0;
        localSegmentDefs.forEach((participantDef, i) => {
          const nameOrId = participantDef.nameOrId || `error_def_${i}`;
          const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          const segmentAngleSpan = participantDef.probability * 2 * Math.PI;

          if (segmentAngleSpan <= 1e-9) return;

          const startAngle = currentDrawingAngle;
          const endAngle = currentDrawingAngle + segmentAngleSpan;

          if (!loadedWheelBackgroundImage && !dynamicBackgroundColor) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segmentColor;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, startAngle, endAngle);
          if (loadedWheelBackgroundImage || dynamicBackgroundColor) ctx.lineTo(0,0);
          ctx.closePath();
          ctx.strokeStyle = BORDER_COLOR;
          ctx.lineWidth = localSegmentDefs.length > 50 ? 0.5 : (localSegmentDefs.length > 20 ? 1.5 : 2.5);
          ctx.stroke();

          const itemDisplayAngle = startAngle + segmentAngleSpan / 2;
          if (participantDef.nameOrId) {
            const imageAsset = imageStore[nameOrId];
            const loadedImageState = loadedSegmentImages[nameOrId];

            if (imageAsset) { // It's an image entry
              if (loadedImageState instanceof HTMLImageElement) {
                drawSegmentImageInternal(ctx, loadedImageState, itemDisplayAngle, radius, canvasSize, segmentAngleSpan);
              } else if (loadedImageState === 'loading' || loadedImageState === undefined) {
                drawSegmentTextInternal(ctx, "Đang tải ảnh...", itemDisplayAngle, segmentAngleSpan, radius, canvasSize, true, wheelTextColor);
              } else { // Explicit 'error' state
                drawSegmentTextInternal(ctx, `Lỗi: ${imageAsset.fileName.substring(0,10)}...`, itemDisplayAngle, segmentAngleSpan, radius, canvasSize, true, wheelTextColor);
              }
            } else { // It's a text name
              drawSegmentTextInternal(ctx, nameOrId, itemDisplayAngle, segmentAngleSpan, radius, canvasSize, false, wheelTextColor);
            }
          }
          currentDrawingAngle = endAngle;
        });
      } else { // Idle animation segments (names.length === 0 && isIdleAnimating)
        for (let i = 0; i < IDLE_SEGMENT_COUNT; i++) {
            const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            const startAngle = localSegmentStartAngles[i];
            const segmentAngleSpan = (localSegmentDefs[i]?.probability || 0) * 2 * Math.PI;
            const endAngle = startAngle + segmentAngleSpan;

            if (segmentAngleSpan > 0) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segmentColor;
            ctx.fill();
            ctx.strokeStyle = BORDER_COLOR;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            }
        }
      }
    } else { 
      if (!loadedWheelBackgroundImage && !dynamicBackgroundColor) { 
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#A0A0A0";
          ctx.font = `bold ${Math.min(20, canvasSize / 25)}px Arial`;
          ctx.fillText("Thêm mục để quay!", 0, 0);
      }
    }

    const wheelVisualDiameter = canvasSize * 0.9;
    const LOGO_DIAMETER = wheelVisualDiameter * 0.25;
    const LOGO_RADIUS = LOGO_DIAMETER / 2;
    if (loadedCenterImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, LOGO_RADIUS, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        const imgWidth = loadedCenterImage.width;
        const imgHeight = loadedCenterImage.height;
        let dWidth, dHeight;
        if (imgWidth / imgHeight > 1) {
            dHeight = LOGO_DIAMETER;
            dWidth = imgWidth * (LOGO_DIAMETER / imgHeight);
        } else { 
            dWidth = LOGO_DIAMETER;
            dHeight = imgHeight * (LOGO_DIAMETER / imgWidth);
        }
        ctx.drawImage(loadedCenterImage, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
        ctx.restore(); 
        ctx.beginPath();
        ctx.arc(0, 0, LOGO_RADIUS, 0, 2 * Math.PI);
        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = Math.max(1, LOGO_DIAMETER * 0.03);
        ctx.stroke();
    } else { 
        const outerDefaultRadius = LOGO_RADIUS * 0.9;
        const innerDefaultRadius = LOGO_RADIUS * 0.6;
        if (LOGO_DIAMETER > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, outerDefaultRadius, 0, 2 * Math.PI);
            ctx.fillStyle = BORDER_COLOR; 
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, innerDefaultRadius, 0, 2 * Math.PI);
            ctx.fillStyle = "#A0A0A0"; 
            ctx.fill();
        }
    }

    ctx.restore(); 
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setOffscreenCanvasVersion(v => v + 1); // Increment version after drawing

  }, [names, canvasSize, loadedCenterImage, imageStore, loadedSegmentImages, loadedWheelBackgroundImage, wheelBackgroundImageSrc, isIdleAnimating, boostedParticipants, dynamicBackgroundColor, wheelTextColor]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !offscreenCanvasRef.current || !canvasSize) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== canvasSize * dpr || canvas.height !== canvasSize * dpr) {
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const currentWheelRotation = isIdleAnimating ? idleAnimationRotation : rotationAngle;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentWheelRotation);
    ctx.drawImage(offscreenCanvasRef.current, -centerX, -centerY, canvasSize, canvasSize);
    ctx.restore();

    const pointerBaseWidth = Math.max(15, canvasSize * 0.03);
    const pointerHeight = Math.max(25, canvasSize * 0.05);
    const pointerTipY = pointerHeight * 0.3; 

    ctx.fillStyle = POINTER_COLOR;
    ctx.beginPath();
    ctx.moveTo(centerX - pointerBaseWidth, pointerTipY);
    ctx.lineTo(centerX + pointerBaseWidth, pointerTipY);
    ctx.lineTo(centerX, pointerHeight);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = BORDER_COLOR; 
    ctx.lineWidth = Math.max(1, canvasSize * 0.004);
    ctx.stroke();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);


    const POINTER_FIXED_SCREEN_ANGLE = 3 * Math.PI / 2;

    if (
      !isTickSoundContinuous && 
      tickSound &&
      segmentStartAnglesRef.current.length > 0 && 
      !isIdleAnimating 
    ) {
      const R_curr_prop = rotationAngle; 
      const R_prev_prop = lastActualRotationForTickRef.current;
      const rawDeltaWheelRotation = R_curr_prop - R_prev_prop;

      if (Math.abs(rawDeltaWheelRotation) > MIN_ROTATION_DELTA_FOR_TICK_LOGIC) {
        const currentTime = performance.now();
        let tickPlayedThisFrame = false;

        const minTimeBetweenTicks = names.length === 1
          ? SINGLE_SEGMENT_MIN_TIME_BETWEEN_TICKS_MS
          : BASE_MIN_TIME_BETWEEN_DISCRETE_TICKS_MS;

        if (currentTime - lastTickPlayTimeRef.current >= minTimeBetweenTicks) {
          for (const boundaryAngleOnWheel of segmentStartAnglesRef.current) {
            if (tickPlayedThisFrame) break; 

            const boundaryScreenAnglePrev = (boundaryAngleOnWheel - R_prev_prop + 4 * Math.PI) % (2 * Math.PI);
            const boundaryScreenAngleCurr = (boundaryAngleOnWheel - R_curr_prop + 4 * Math.PI) % (2 * Math.PI);
            
            const prev_is_ccw_past_pointer = ((boundaryScreenAnglePrev - POINTER_FIXED_SCREEN_ANGLE + 4 * Math.PI) % (2 * Math.PI)) > Math.PI;
            const curr_is_ccw_past_pointer = ((boundaryScreenAngleCurr - POINTER_FIXED_SCREEN_ANGLE + 4 * Math.PI) % (2 * Math.PI)) > Math.PI;

            let crossed = false;
            if (prev_is_ccw_past_pointer !== curr_is_ccw_past_pointer) {
              const angularSeparation = Math.abs(boundaryScreenAnglePrev - boundaryScreenAngleCurr);
              const travelDistance = Math.min(angularSeparation, 2 * Math.PI - angularSeparation);
              
              const minTravelForCrossing = names.length === 1
                ? MIN_TRAVEL_FOR_CROSSING_SINGLE_SEGMENT
                : MIN_TRAVEL_FOR_CROSSING_DEFAULT;

              if (travelDistance < Math.PI && travelDistance > minTravelForCrossing) {
                crossed = true;
              }
            }

            if (crossed) {
              tickSound.currentTime = 0;
              const playPromise = tickSound.play();
              if (playPromise !== undefined) {
                playPromise.catch(error => {});
              }
              lastTickPlayTimeRef.current = currentTime;
              tickPlayedThisFrame = true;
            }
          }
        }
      }
    }
    lastActualRotationForTickRef.current = rotationAngle;

  }, [
      rotationAngle, 
      canvasSize, 
      isIdleAnimating, 
      idleAnimationRotation, 
      tickSound, 
      isTickSoundContinuous, 
      names.length, // Keep names.length for tick logic related to single segment
      offscreenCanvasVersion // Add new dependency here
    ]);

  const actuallyCanSpin = names.length > 0 && !isIdleAnimating;

  return (
    <canvas
      ref={canvasRef}
      onClick={actuallyCanSpin ? onWheelClick : undefined}
      className={`max-w-full max-h-full aspect-square ${actuallyCanSpin ? 'cursor-pointer' : 'cursor-default'}`}
      aria-label="Vòng quay may mắn"
      role="button"
      tabIndex={actuallyCanSpin ? 0 : -1}
      onKeyDown={actuallyCanSpin && onWheelClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onWheelClick(); } : undefined}
    ></canvas>
  );
};

export default WheelCanvas;
