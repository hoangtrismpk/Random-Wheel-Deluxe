
import React, { useRef, useEffect, useState } from 'react';
import type { ImageStore } from '../App'; // Import ImageStore type
import type { BoostedParticipant, WheelDynamicBackground, LinearGradientBackgroundConfig } from '../types'; // Import types

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
  onWheelClick?: () => void; // New prop for clicking the wheel
}

const SEGMENT_COLORS = [
  "#FFC107", "#FF5722", "#4CAF50", "#2196F3", "#9C27B0", 
  "#E91E63", "#00BCD4", "#8BC34A", "#CDDC39", "#FF9800", 
  "#795548", "#607D8B"
];

const TEXT_COLOR = "#1F2937"; 
const BORDER_COLOR = "#FFFFFF"; 
const POINTER_COLOR = "#F87171"; 

const MIN_FONT_SIZE = 6;

const IDLE_SEGMENT_COUNT = 5;
const IDLE_ROTATION_SPEED = 0.003; // Radians per frame


const drawSegmentTextInternal = (
  ctx: CanvasRenderingContext2D,
  text: string,
  segmentMiddleAngle: number, // This is the middle angle of the segment
  segmentAngleSpan: number, // The angular width of this specific segment
  radius: number,
  baseCanvasSize: number,
  isPlaceholder: boolean = false
) => {
  ctx.save();
  ctx.rotate(segmentMiddleAngle); 
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isPlaceholder ? "#A0A0A0" : TEXT_COLOR;
  
  // Adjust maxTextWidth based on segmentAngleSpan - narrower segments get less space
  // A very small segment might only allow a few characters.
  // The factor 0.55 of radius was for average segments. For very thin ones, this might be too large.
  // Max text width should also be proportional to how "wide" the segment is at the text position.
  const textArcLength = (radius * 0.7) * segmentAngleSpan; // Arc length where text is roughly placed
  let maxTextWidth = Math.min(radius * 0.55, textArcLength * 0.8);


  let fontSize = Math.min(18, radius / 10, baseCanvasSize / 30);
   // Further reduce font size for very narrow segments
  if (segmentAngleSpan < (Math.PI / 12)) { // Less than 15 degrees
    fontSize *= 0.8;
  }
  if (segmentAngleSpan < (Math.PI / 24)) { // Less than 7.5 degrees
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
       // Truncation logic (same as before, but now maxTextWidth can be smaller)
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
  
  if (displayText && displayText.length > 0 && fontSize >= MIN_FONT_SIZE * 0.8 && segmentAngleSpan > Math.PI / 180) { // Only draw if segment has some visible angle
      ctx.fillText(displayText, radius * 0.85, 0); 
  }
  ctx.restore();
};

const drawSegmentImageInternal = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  segmentMiddleRotation: number, // Middle rotation angle of the segment
  radius: number,
  _baseCanvasSize: number, 
  segmentAngleSpan: number // The angle span of one segment
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
  const maxRadialSpaceForImage = radius * 0.25; // How "tall" the image can be along the radius
  
  // Tangential space (width) is dependent on the segment's angle span
  const tangentialSpaceAtRadialPosition = radialPositionForImageCenter * segmentAngleSpan;
  const maxTangentialSpaceForImage = tangentialSpaceAtRadialPosition * 0.7; // Use 70% of the arc length at that radius

  const boxW = maxTangentialSpaceForImage;
  const boxH = maxRadialSpaceForImage;

  if (boxW < 1 || boxH < 1) { // If the segment is too small to draw anything meaningful
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
  names, imageStore, boostedParticipants, rotationAngle, canvasSize = 500, centerImageSrc, wheelBackgroundImageSrc, dynamicBackgroundColor, onWheelClick
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

    ctx.scale(dpr, dpr); 

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radius = canvasSize / 2 * 0.9; 

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    
    ctx.save(); 
    ctx.translate(centerX, centerY);

    // 1. Draw Dynamic Background (Solid or Gradient)
    if (dynamicBackgroundColor) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.clip();

      if (typeof dynamicBackgroundColor === 'string') { // Solid color
        ctx.fillStyle = dynamicBackgroundColor;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      } else if (dynamicBackgroundColor.type === 'linear-gradient') {
        const gradConfig = dynamicBackgroundColor as LinearGradientBackgroundConfig;
        // Convert CSS-like angle (0deg=top, 90deg=right) to canvas angle (0=right, PI/2=down)
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
      }
      ctx.restore(); // Restore from clipping
    }


    if (isIdleAnimating) {
      const anglePerIdleSegment = (2 * Math.PI) / IDLE_SEGMENT_COUNT;
      for (let i = 0; i < IDLE_SEGMENT_COUNT; i++) {
        const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        const startAngle = i * anglePerIdleSegment;
        const endAngle = (i + 1) * anglePerIdleSegment;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = segmentColor;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
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
    } else if (names.length > 0 || loadedWheelBackgroundImage || dynamicBackgroundColor) { // Modified condition
      // 2. Draw Wheel Background Image (if exists)
      if (loadedWheelBackgroundImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.clip();
        const img = loadedWheelBackgroundImage;
        const imgRatio = img.width / img.height;
        const wheelDiameter = radius * 2;
        let dWidth, dHeight;
        if (img.width / wheelDiameter < img.height / wheelDiameter ) { // Fit width
            dWidth = wheelDiameter;
            dHeight = dWidth / imgRatio;
        } else { // Fit height
            dHeight = wheelDiameter;
            dWidth = dHeight * imgRatio;
        }
        // Center the image if it's larger than the wheel diameter after fitting
        const dx = (wheelDiameter - dWidth) / 2 - radius; // adjust for translation
        const dy = (wheelDiameter - dHeight) / 2 - radius; // adjust for translation
        ctx.drawImage(img, -radius + (wheelDiameter - dWidth)/2, -radius + (wheelDiameter - dHeight)/2, dWidth, dHeight);
        ctx.restore(); 
      }

      // 3. Draw Segments
      if (names.length > 0) {
        let effectiveParticipants: Array<{
          nameOrId: string;
          displayName: string;
          probability: number;
        }> = [];

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
              effectiveParticipants.push({
                nameOrId,
                displayName: boostedEntry.name, 
                probability: boostedEntry.percentage / 100,
              });
            } else if (nonBoostedOnWheel.some(nb => nb.originalIdOrName === nameOrId) && percentagePerNonBoosted > 0) {
              effectiveParticipants.push({
                nameOrId,
                displayName: (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase(),
                probability: percentagePerNonBoosted / 100,
              });
            }
          });
        } else { 
          const numSegments = names.length;
          const probPerSegment = numSegments > 0 ? 1 / numSegments : 0;
          names.forEach(nameOrId => {
            effectiveParticipants.push({
              nameOrId,
              displayName: (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase(),
              probability: probPerSegment,
            });
          });
        }
        
        effectiveParticipants = effectiveParticipants.filter(p => p.probability * 2 * Math.PI >= 0.0001); 

        const currentTotalProbability = effectiveParticipants.reduce((sum, p) => sum + p.probability, 0);
        if (effectiveParticipants.length > 0 && currentTotalProbability > 0 && Math.abs(currentTotalProbability - 1.0) > 1e-9) {
          effectiveParticipants = effectiveParticipants.map(p => ({
            ...p,
            probability: p.probability / currentTotalProbability,
          }));
        }
        
        let currentAngle = 0;
        effectiveParticipants.forEach((participant, i) => {
          const nameOrId = participant.nameOrId;
          const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length]; 
          
          const segmentAngleSpan = participant.probability * 2 * Math.PI;
          if (segmentAngleSpan <= 0) return;

          const startAngle = currentAngle;
          const endAngle = currentAngle + segmentAngleSpan;

          if (!loadedWheelBackgroundImage && !dynamicBackgroundColor) { // Only draw segment color if no wheel bg image AND no dynamic bg
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
          ctx.lineWidth = names.length > 50 ? 0.5 : (names.length > 20 ? 1.5 : 2.5);
          ctx.stroke();

          const itemDisplayAngle = startAngle + segmentAngleSpan / 2;
          const imageAsset = imageStore[nameOrId];
          if (imageAsset) { 
            const loadedImage = loadedSegmentImages[nameOrId];
            if (loadedImage instanceof HTMLImageElement) {
              drawSegmentImageInternal(ctx, loadedImage, itemDisplayAngle, radius, canvasSize, segmentAngleSpan);
            } else if (loadedImage === 'loading') {
              drawSegmentTextInternal(ctx, "Đang tải ảnh...", itemDisplayAngle, segmentAngleSpan, radius, canvasSize, true);
            } else { 
              drawSegmentTextInternal(ctx, `Lỗi: ${imageAsset.fileName.substring(0,10)}...`, itemDisplayAngle, segmentAngleSpan, radius, canvasSize, true);
            }
          } else { 
            drawSegmentTextInternal(ctx, nameOrId, itemDisplayAngle, segmentAngleSpan, radius, canvasSize);
          }
          currentAngle = endAngle;
        });
      }
    }

    // 4. Draw Center Logo/Default
    const wheelVisualDiameter = canvasSize * 0.9; // This is the actual wheel diameter (radius * 2)
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
        let dWidth, dHeight, dx, dy;
        if (imgWidth / imgHeight > 1) { // Landscape or square
            dHeight = LOGO_DIAMETER;
            dWidth = imgWidth * (LOGO_DIAMETER / imgHeight);
        } else { // Portrait
            dWidth = LOGO_DIAMETER;
            dHeight = imgHeight * (LOGO_DIAMETER / imgWidth);
        }
        dx = -dWidth / 2; 
        dy = -dHeight / 2; 
        ctx.drawImage(loadedCenterImage, dx, dy, dWidth, dHeight);
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

  }, [names, canvasSize, loadedCenterImage, imageStore, loadedSegmentImages, loadedWheelBackgroundImage, wheelBackgroundImageSrc, isIdleAnimating, boostedParticipants, dynamicBackgroundColor]);


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
    
    const currentDisplayRotation = isIdleAnimating ? idleAnimationRotation : rotationAngle;

    ctx.save();
    ctx.translate(centerX, centerY); 
    ctx.rotate(currentDisplayRotation); 
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

  }, [rotationAngle, canvasSize, isIdleAnimating, idleAnimationRotation, names, imageStore, boostedParticipants, dynamicBackgroundColor]); // Added dynamicBackgroundColor

  const canSpin = names.length > 0 && !isIdleAnimating; 

  return (
    <canvas 
      ref={canvasRef} 
      onClick={canSpin ? onWheelClick : undefined} 
      className={`max-w-full max-h-full aspect-square ${canSpin ? 'cursor-pointer' : 'cursor-default'}`}
      aria-label="Vòng quay may mắn"
      role="button" 
      tabIndex={canSpin ? 0 : -1} 
      onKeyDown={canSpin && onWheelClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onWheelClick(); } : undefined}
    ></canvas>
  );
};

export default WheelCanvas;
