
import React, { useRef, useEffect, useState } from 'react';

interface WheelCanvasProps {
  names: string[];
  rotationAngle: number; // in radians
  canvasSize?: number;
  onSpinComplete?: () => void; // Optional callback
  centerImageSrc?: string | null; // New prop for center image
}

const SEGMENT_COLORS = [
  "#FFC107", // Amber
  "#FF5722", // Deep Orange
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#9C27B0", // Purple
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#8BC34A", // Light Green
  "#CDDC39", // Lime
  "#FF9800", // Orange
  "#795548", // Brown
  "#607D8B", // Blue Grey
];

const TEXT_COLOR = "#1F2937"; 
const BORDER_COLOR = "#FFFFFF"; 
const POINTER_COLOR = "#F87171"; 
const LOGO_DIAMETER = 150; // px - Increased from 50px
const LOGO_RADIUS = LOGO_DIAMETER / 2;

const drawSegmentTextInternal = (
  ctx: CanvasRenderingContext2D,
  text: string,
  segmentAngle: number,
  radius: number,
  baseCanvasSize: number 
) => {
  ctx.save();
  ctx.rotate(segmentAngle); 
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEXT_COLOR;
  
  const maxTextWidth = radius * 0.55; 
  let fontSize = Math.min(18, radius / 10, baseCanvasSize / 30);
  const MIN_FONT_SIZE = 6;

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  while (ctx.measureText(text).width > maxTextWidth && fontSize > MIN_FONT_SIZE) { 
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
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
          displayText = displayText.substring(0, Math.floor(maxTextWidth / (fontSize > 0 ? fontSize : 1)));
       }
  }
  
  if (displayText && displayText.length > 0 && fontSize >= MIN_FONT_SIZE * 0.8) {
      ctx.fillText(displayText, radius * 0.85, 0); 
  }
  ctx.restore();
};

const WheelCanvas: React.FC<WheelCanvasProps> = ({ names, rotationAngle, canvasSize = 500, centerImageSrc }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [loadedCenterImage, setLoadedCenterImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (centerImageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous"; 
      img.onload = () => {
        setLoadedCenterImage(img);
      };
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

    if (names.length === 0) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#A0A0A0";
      ctx.font = `bold ${Math.min(20, canvasSize / 25)}px Arial`;
      ctx.fillText("Thêm tên để quay!", 0, 0); 
    } else {
      const numSegments = names.length;
      const anglePerSegment = (2 * Math.PI) / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const segmentColor = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        const startAngle = i * anglePerSegment;
        const endAngle = (i + 1) * anglePerSegment;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = segmentColor;
        ctx.fill();

        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = numSegments > 50 ? 0.5 : (numSegments > 20 ? 1.5 : 2.5);
        ctx.stroke();

        const textAngle = startAngle + anglePerSegment / 2;
        drawSegmentTextInternal(ctx, names[i], textAngle, radius, canvasSize);
      }
    }

    if (loadedCenterImage) {
      ctx.save(); 
      ctx.beginPath();
      ctx.arc(0, 0, LOGO_RADIUS, 0, 2 * Math.PI); 
      ctx.closePath();
      ctx.clip();

      const imgWidth = loadedCenterImage.width;
      const imgHeight = loadedCenterImage.height;
      
      let dWidth, dHeight, dx, dy;
      if (imgWidth / imgHeight > LOGO_DIAMETER / LOGO_DIAMETER) { 
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

  }, [names, canvasSize, loadedCenterImage]); 


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

    if (names.length > 0 || loadedCenterImage) { 
        ctx.save();
        ctx.translate(centerX, centerY); 
        ctx.rotate(rotationAngle); 
        ctx.drawImage(offscreenCanvasRef.current, -centerX, -centerY, canvasSize, canvasSize);
        ctx.restore(); 
    } else { 
        ctx.drawImage(offscreenCanvasRef.current, 0, 0, canvasSize, canvasSize);
    }
    
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

  }, [names.length, rotationAngle, canvasSize, offscreenCanvasRef.current, loadedCenterImage]); 

  return <canvas ref={canvasRef} className="max-w-full max-h-full aspect-square"></canvas>;
};

export default WheelCanvas;
