
import React, { useRef, useEffect, useState } from 'react';
import type { ImageStore } from '../App'; // Import ImageStore type

interface WheelCanvasProps {
  names: string[]; // Now contains text names or image IDs
  imageStore: ImageStore; // To look up image data using IDs
  rotationAngle: number; // in radians
  canvasSize?: number;
  onSpinComplete?: () => void; // Optional callback
  centerImageSrc?: string | null;
  wheelBackgroundImageSrc?: string | null; // New prop for wheel background
}

const SEGMENT_COLORS = [
  "#FFC107", "#FF5722", "#4CAF50", "#2196F3", "#9C27B0", 
  "#E91E63", "#00BCD4", "#8BC34A", "#CDDC39", "#FF9800", 
  "#795548", "#607D8B"
];

const TEXT_COLOR = "#1F2937"; 
const BORDER_COLOR = "#FFFFFF"; 
const POINTER_COLOR = "#F87171"; 
const LOGO_DIAMETER = 150;
const LOGO_RADIUS = LOGO_DIAMETER / 2;

const MIN_FONT_SIZE = 6;

const IDLE_SEGMENT_COUNT = 5;
const IDLE_ROTATION_SPEED = 0.003; // Radians per frame


const drawSegmentTextInternal = (
  ctx: CanvasRenderingContext2D,
  text: string,
  segmentAngle: number, // This is the middle angle of the segment
  radius: number,
  baseCanvasSize: number,
  isPlaceholder: boolean = false
) => {
  ctx.save();
  ctx.rotate(segmentAngle); 
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isPlaceholder ? "#A0A0A0" : TEXT_COLOR; // Lighter color for placeholders
  
  const maxTextWidth = radius * 0.55; 
  let fontSize = Math.min(18, radius / 10, baseCanvasSize / 30);
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
  
  if (displayText && displayText.length > 0 && fontSize >= MIN_FONT_SIZE * 0.8) {
      ctx.fillText(displayText, radius * 0.85, 0); 
  }
  ctx.restore();
};

const drawSegmentImageInternal = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  segmentMiddleRotation: number, // Middle rotation angle of the segment
  radius: number,
  _baseCanvasSize: number, // Unused for now, but kept for signature consistency
  anglePerSegment: number // The angle span of one segment
) => {
  ctx.save();
  ctx.rotate(segmentMiddleRotation);

  const imgW = image.width;
  const imgH = image.height;

  if (imgW <= 0 || imgH <= 0) { // Don't draw if image has no dimensions
    ctx.restore();
    return;
  }

  const radialPositionForImageCenter = radius * 0.70; 
  const maxRadialSpaceForImage = radius * 0.25; 
  const tangentialSpaceAtRadialPosition = radialPositionForImageCenter * anglePerSegment;
  const maxTangentialSpaceForImage = tangentialSpaceAtRadialPosition * 0.8; 

  const boxW = maxTangentialSpaceForImage;
  const boxH = maxRadialSpaceForImage;

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
  names, imageStore, rotationAngle, canvasSize = 500, centerImageSrc, wheelBackgroundImageSrc
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [loadedCenterImage, setLoadedCenterImage] = useState<HTMLImageElement | null>(null);
  const [loadedWheelBackgroundImage, setLoadedWheelBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [loadedSegmentImages, setLoadedSegmentImages] = useState<Record<string, HTMLImageElement | 'error' | 'loading'>>({});

  // State for idle animation
  const [isIdleAnimating, setIsIdleAnimating] = useState<boolean>(false);
  const [idleAnimationRotation, setIdleAnimationRotation] = useState<number>(0);
  const idleAnimationFrameIdRef = useRef<number | null>(null);


  useEffect(() => {
    if (names.length === 0) {
      setIsIdleAnimating(true);
    } else {
      setIsIdleAnimating(false);
    }
  }, [names]);


  useEffect(() => {
    if (isIdleAnimating) {
      let lastTimestamp = 0;
      const animateIdle = (timestamp: number) => {
        if (lastTimestamp === 0) lastTimestamp = timestamp;
        // const deltaTime = timestamp - lastTimestamp; // Can be used for frame-rate independent speed if needed

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
      setIdleAnimationRotation(0); // Reset rotation when not idle
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

    if (isIdleAnimating) {
      // Draw idle wheel (5 colored segments)
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
    } else if (names.length === 0 && !loadedWheelBackgroundImage) { 
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#A0A0A0";
      ctx.font = `bold ${Math.min(20, canvasSize / 25)}px Arial`;
      ctx.fillText("Thêm mục để quay!", 0, 0); 
    } else if (names.length > 0 || loadedWheelBackgroundImage) {
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
        const dx = -dWidth / 2;
        const dy = -dHeight / 2;
        ctx.drawImage(img, dx, dy, dWidth, dHeight);
        ctx.restore(); 
      }

      if (names.length > 0) {
        const numSegments = names.length;
        const anglePerSegment = (2 * Math.PI) / numSegments;

        for (let i = 0; i < numSegments; i++) {
          const nameOrId = names[i];
          const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          const startAngle = i * anglePerSegment;
          const endAngle = (i + 1) * anglePerSegment;

          if (!loadedWheelBackgroundImage) { // Only draw segment color if no wheel background
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
          if (loadedWheelBackgroundImage) ctx.lineTo(0,0); 
          ctx.closePath();
          ctx.strokeStyle = BORDER_COLOR;
          ctx.lineWidth = numSegments > 50 ? 0.5 : (numSegments > 20 ? 1.5 : 2.5);
          ctx.stroke();

          const itemAngle = startAngle + anglePerSegment / 2;
          const imageAsset = imageStore[nameOrId];
          if (imageAsset) { 
            const loadedImage = loadedSegmentImages[nameOrId];
            if (loadedImage instanceof HTMLImageElement) {
              drawSegmentImageInternal(ctx, loadedImage, itemAngle, radius, canvasSize, anglePerSegment);
            } else if (loadedImage === 'loading') {
              drawSegmentTextInternal(ctx, "Đang tải ảnh...", itemAngle, radius, canvasSize, true);
            } else { 
              drawSegmentTextInternal(ctx, `Lỗi: ${imageAsset.fileName.substring(0,10)}...`, itemAngle, radius, canvasSize, true);
            }
          } else { 
            drawSegmentTextInternal(ctx, nameOrId, itemAngle, radius, canvasSize);
          }
        }
      }
    }

    // Draw Center Logo (always on top of wheel segments or idle animation)
    if (loadedCenterImage) {
        ctx.save(); 
        ctx.beginPath();
        ctx.arc(0, 0, LOGO_RADIUS, 0, 2 * Math.PI); 
        ctx.closePath();
        ctx.clip();

        const imgWidth = loadedCenterImage.width;
        const imgHeight = loadedCenterImage.height;
        let dWidth, dHeight, dx, dy;
        if (imgWidth / imgHeight > 1) { 
            dHeight = LOGO_DIAMETER;
            dWidth = imgWidth * (LOGO_DIAMETER / imgHeight);
        } else { 
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
        ctx.lineWidth = 2.5; 
        ctx.stroke();
    } else {
        const outerDefaultRadius = LOGO_RADIUS * 0.9;
        const innerDefaultRadius = LOGO_RADIUS * 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, outerDefaultRadius, 0, 2 * Math.PI); 
        ctx.fillStyle = BORDER_COLOR;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, innerDefaultRadius, 0, 2 * Math.PI); 
        ctx.fillStyle = "#A0A0A0"; 
        ctx.fill();
    }
    
    ctx.restore(); 
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 

  }, [names, canvasSize, loadedCenterImage, imageStore, loadedSegmentImages, loadedWheelBackgroundImage, wheelBackgroundImageSrc, isIdleAnimating]);


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
    
    // Determine rotation for the main canvas
    const currentDisplayRotation = isIdleAnimating ? idleAnimationRotation : rotationAngle;

    ctx.save();
    ctx.translate(centerX, centerY); 
    ctx.rotate(currentDisplayRotation); 
    ctx.drawImage(offscreenCanvasRef.current, -centerX, -centerY, canvasSize, canvasSize);
    ctx.restore(); 
    
    // Draw pointer (always, for now)
    ctx.fillStyle = POINTER_COLOR;
    ctx.beginPath();
    ctx.moveTo(centerX - 15, 10); 
    ctx.lineTo(centerX + 15, 10); 
    ctx.lineTo(centerX, 35);      
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  }, [names, rotationAngle, canvasSize, loadedCenterImage, imageStore, loadedSegmentImages, loadedWheelBackgroundImage, wheelBackgroundImageSrc, isIdleAnimating, idleAnimationRotation]); 

  return <canvas ref={canvasRef} className="max-w-full max-h-full aspect-square"></canvas>;
};

export default WheelCanvas;
