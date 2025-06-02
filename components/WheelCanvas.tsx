
import React, { useRef, useEffect, useState } from 'react';
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

// Constants for dynamic tick sound interval (for discrete ticks)
const TICK_INTERVAL_WHEN_FAST_MS = 100;
const TICK_INTERVAL_WHEN_SLOW_MS = 250;
const MAX_SPEED_FOR_TICK_CALC_RAD_PER_FRAME = 0.4;
const MIN_SPEED_FOR_TICK_CALC_RAD_PER_FRAME = 0.01;


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
  tickSound, isTickSoundContinuous // Added isTickSoundContinuous
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [loadedCenterImage, setLoadedCenterImage] = useState<HTMLImageElement | null>(null);
  const [loadedWheelBackgroundImage, setLoadedWheelBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [loadedSegmentImages, setLoadedSegmentImages] = useState<Record<string, HTMLImageElement | 'error' | 'loading'>>({});

  const [isIdleAnimating, setIsIdleAnimating] = useState<boolean>(false);
  const [idleAnimationRotation, setIdleAnimationRotation] = useState<number>(0);
  const idleAnimationFrameIdRef = useRef<number | null>(null);

  const segmentStartAnglesRef = useRef<number[]>([]);
  const lastSegmentIndexUnderPointerRef = useRef<number | null>(null);
  const lastActualRotationForTickRef = useRef<number>(0);
  const lastTickPlayTimeRef = useRef<number>(0);


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


  useEffect(() => { // Offscreen canvas drawing and segment angle calculation
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
        let cx = 0, cy = 0; 
        const R = radius * 1.5; 
        const pos = gradConfig.position.toLowerCase();
        if (pos.includes('left')) cx = -radius * 0.5;
        if (pos.includes('right')) cx = radius * 0.5;
        if (pos.includes('top')) cy = -radius * 0.5;
        if (pos.includes('bottom')) cy = radius * 0.5;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        const sortedStops = [...gradConfig.stops].sort((a, b) => a.position - b.position);
        sortedStops.forEach(stop => {
          gradient.addColorStop(Math.max(0, Math.min(1, stop.position / 100)), stop.color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      }
      ctx.restore();
    }

    let currentSegmentDefinitions: { nameOrId?: string; probability: number }[] = [];
    if (isIdleAnimating) {
        const probPerIdleSegment = 1 / IDLE_SEGMENT_COUNT;
        for (let i = 0; i < IDLE_SEGMENT_COUNT; i++) {
            currentSegmentDefinitions.push({ nameOrId: `idle_${i}`, probability: probPerIdleSegment });
        }
    } else if (names.length > 0) {
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
                    currentSegmentDefinitions.push({ nameOrId, probability: boostedEntry.percentage / 100 });
                } else if (nonBoostedOnWheel.some(nb => nb.originalIdOrName === nameOrId) && percentagePerNonBoosted > 0) {
                    currentSegmentDefinitions.push({ nameOrId, probability: percentagePerNonBoosted / 100 });
                }
            });
        } else {
            const numSegments = names.length;
            const probPerSegment = numSegments > 0 ? 1 / numSegments : 0;
            names.forEach(nameOrId => {
                currentSegmentDefinitions.push({ nameOrId, probability: probPerSegment });
            });
        }
        currentSegmentDefinitions = currentSegmentDefinitions.filter(p => p.probability * 2 * Math.PI >= 0.0001);
        const currentTotalProbability = currentSegmentDefinitions.reduce((sum, p) => sum + p.probability, 0);
        if (currentSegmentDefinitions.length > 0 && currentTotalProbability > 0 && Math.abs(currentTotalProbability - 1.0) > 1e-9) {
            currentSegmentDefinitions = currentSegmentDefinitions.map(p => ({ ...p, probability: p.probability / currentTotalProbability }));
        }
    }
    
    const newSegmentStartAngles: number[] = [];
    let cumulativeAngle = 0;
    currentSegmentDefinitions.forEach(def => {
        newSegmentStartAngles.push(cumulativeAngle);
        cumulativeAngle += def.probability * 2 * Math.PI;
    });
    segmentStartAnglesRef.current = newSegmentStartAngles;
    if (lastSegmentIndexUnderPointerRef.current !== null || segmentStartAnglesRef.current.length === 0) {
        lastSegmentIndexUnderPointerRef.current = null; 
    }

    if (isIdleAnimating) {
      for (let i = 0; i < IDLE_SEGMENT_COUNT; i++) {
        const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        const startAngle = segmentStartAnglesRef.current[i]; // Use calculated start angles
        const segmentAngleSpan = (currentSegmentDefinitions[i]?.probability || 0) * 2 * Math.PI;
        const endAngle = startAngle + segmentAngleSpan;

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
    } else if (names.length === 0 && !loadedWheelBackgroundImage && !dynamicBackgroundColor) { 
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#A0A0A0";
      ctx.font = `bold ${Math.min(20, canvasSize / 25)}px Arial`;
      ctx.fillText("Thêm mục để quay!", 0, 0); 
    } else if (currentSegmentDefinitions.length > 0 || loadedWheelBackgroundImage || dynamicBackgroundColor) {
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

      if (currentSegmentDefinitions.length > 0) {
        let currentDrawingAngle = 0;
        currentSegmentDefinitions.forEach((participantDef, i) => {
          const nameOrId = participantDef.nameOrId || `idle_${i}`;
          const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length]; 
          
          const segmentAngleSpan = participantDef.probability * 2 * Math.PI;
          if (segmentAngleSpan <= 0) return;

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
          ctx.lineWidth = currentSegmentDefinitions.length > 50 ? 0.5 : (currentSegmentDefinitions.length > 20 ? 1.5 : 2.5);
          ctx.stroke();

          const itemDisplayAngle = startAngle + segmentAngleSpan / 2;
          if (participantDef.nameOrId && !isIdleAnimating) { 
            const imageAsset = imageStore[nameOrId];
            if (imageAsset) { 
              const loadedImage = loadedSegmentImages[nameOrId];
              if (loadedImage instanceof HTMLImageElement) {
                drawSegmentImageInternal(ctx, loadedImage, itemDisplayAngle, radius, canvasSize, segmentAngleSpan);
              } else if (loadedImage === 'loading') {
                drawSegmentTextInternal(ctx, "Đang tải ảnh...", itemDisplayAngle, segmentAngleSpan, radius, canvasSize, true, wheelTextColor);
              } else { 
                drawSegmentTextInternal(ctx, `Lỗi: ${imageAsset.fileName.substring(0,10)}...`, itemDisplayAngle, segmentAngleSpan, radius, canvasSize, true, wheelTextColor);
              }
            } else { 
              drawSegmentTextInternal(ctx, nameOrId, itemDisplayAngle, segmentAngleSpan, radius, canvasSize, false, wheelTextColor);
            }
          }
          currentDrawingAngle = endAngle;
        });
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

  }, [names, canvasSize, loadedCenterImage, imageStore, loadedSegmentImages, loadedWheelBackgroundImage, wheelBackgroundImageSrc, isIdleAnimating, boostedParticipants, dynamicBackgroundColor, wheelTextColor]);


  const getSegmentIndexAtPointer = (pointerAngleOnWheel: number, startAngles: number[]): number => {
    if (startAngles.length === 0) return -1;
    for (let i = startAngles.length - 1; i >= 0; i--) {
      if (pointerAngleOnWheel >= startAngles[i]) {
        return i;
      }
    }
    return startAngles.length - 1; 
  };


  useEffect(() => { // Visible canvas drawing and tick sound logic
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
    
    const actualCurrentRotation = isIdleAnimating ? idleAnimationRotation : rotationAngle;

    ctx.save();
    ctx.translate(centerX, centerY); 
    ctx.rotate(actualCurrentRotation); 
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

    // Play discrete ticks if the sound is not continuous and conditions are met
    if (!isTickSoundContinuous && tickSound && segmentStartAnglesRef.current.length > 0 && actualCurrentRotation !== lastActualRotationForTickRef.current) {
        const StaticPointerScreenAngle = 3 * Math.PI / 2; 
        const pointerPositionOnWheel = ((StaticPointerScreenAngle - actualCurrentRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        
        const currentSegmentIdx = getSegmentIndexAtPointer(pointerPositionOnWheel, segmentStartAnglesRef.current);

        if (lastSegmentIndexUnderPointerRef.current !== null && 
            currentSegmentIdx !== lastSegmentIndexUnderPointerRef.current && 
            currentSegmentIdx !== -1) {
            
            let dynamicTickIntervalMs: number;
            const currentFrameDeltaRotation = Math.abs(actualCurrentRotation - lastActualRotationForTickRef.current);

            if (currentFrameDeltaRotation < 0.0001 && !isIdleAnimating) { 
                dynamicTickIntervalMs = TICK_INTERVAL_WHEN_SLOW_MS * 2; 
            } else {
                const speedRange = MAX_SPEED_FOR_TICK_CALC_RAD_PER_FRAME - MIN_SPEED_FOR_TICK_CALC_RAD_PER_FRAME;
                let normalizedSpeed = 0; 
                if (speedRange > 0) {
                     normalizedSpeed = Math.max(0, Math.min(1,
                        (currentFrameDeltaRotation - MIN_SPEED_FOR_TICK_CALC_RAD_PER_FRAME) / speedRange
                    ));
                } else if (currentFrameDeltaRotation >= MAX_SPEED_FOR_TICK_CALC_RAD_PER_FRAME) {
                    normalizedSpeed = 1; 
                }
                dynamicTickIntervalMs = TICK_INTERVAL_WHEN_FAST_MS +
                                       (1 - normalizedSpeed) * (TICK_INTERVAL_WHEN_SLOW_MS - TICK_INTERVAL_WHEN_FAST_MS);
            }
            
            const currentTime = performance.now();
            if (currentTime - lastTickPlayTimeRef.current > dynamicTickIntervalMs) {
                tickSound.currentTime = 0;
                tickSound.play().catch(e => console.warn("Tick sound play failed:", e));
                lastTickPlayTimeRef.current = currentTime;
            }
        }
        lastSegmentIndexUnderPointerRef.current = currentSegmentIdx;
    }
    lastActualRotationForTickRef.current = actualCurrentRotation;

  }, [rotationAngle, canvasSize, isIdleAnimating, idleAnimationRotation, names, imageStore, boostedParticipants, dynamicBackgroundColor, wheelTextColor, tickSound, isTickSoundContinuous]);

  const canSpin = (names.length > 0 || (isIdleAnimating && IDLE_SEGMENT_COUNT > 0)) && !isIdleAnimating ; 
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
