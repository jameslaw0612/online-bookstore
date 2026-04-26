/**
 * ImageUpload.tsx - Facebook-Style Image Crop Component
 * 
 * PURPOSE: Allows admins to upload and crop book cover images
 * - Drag-and-drop image upload
 * - Interactive crop with visible frame (Facebook-style)
 * - Zoom in/out with slider
 * - Pan image by dragging
 * - Real-time accurate preview of crop area
 * - Repositioning arrows for fine-tuning
 * - Returns base64 encoded cropped image
 */

import { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  RefreshCw, 
  Camera, 
  Edit3, 
  Target, 
  Search, 
  Info, 
  X, 
  Check, 
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import '../styles/ImageUpload.css';

interface ImageUploadProps {
  onImageSelect: (base64Image: string) => void;
  onOriginalImageSelect?: (base64Image: string) => void;
  onPositionChange?: (position: { scale: number; offsetX: number; offsetY: number }) => void;
  maxWidth?: number;
  maxHeight?: number;
  resetTrigger?: number; // Increment this to trigger reset
  initialScale?: number; // Load with specific zoom level
  initialOffsetX?: number; // Load with specific pan X
  initialOffsetY?: number; // Load with specific pan Y
  initialImage?: string; // Load with existing image (base64 or URL)
  initialIsAlreadyCropped?: boolean; // If true, show cropped preview state immediately
}

export default function ImageUpload({
  onImageSelect,
  onOriginalImageSelect,
  onPositionChange,
  maxWidth = 300,
  maxHeight = 400,
  resetTrigger = 0,
  initialScale = 1,
  initialOffsetX = 0,
  initialOffsetY = 0,
  initialImage = null,
  initialIsAlreadyCropped = false
}: ImageUploadProps) {
  // State management
  const [preview, setPreview] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(initialIsAlreadyCropped && initialImage ? initialImage : null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropWidth] = useState(maxWidth);
  const [cropHeight] = useState(maxHeight);
  const [scale, setScale] = useState(initialScale);
  const [offsetX, setOffsetX] = useState(initialOffsetX);
  const [offsetY, setOffsetY] = useState(initialOffsetY);
  const [isDragPanning, setIsDragPanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle slider interaction to prevent page scrolling
   */
  const handleSliderMouseDown = () => {
    document.body.style.overflow = 'hidden';
  };

  const handleSliderMouseUp = () => {
    document.body.style.overflow = '';
  };

  /**
   * Load initial image from URL via proxy and convert to base64
   */
  useEffect(() => {
    if (initialImage && !initialImage.startsWith('data:') && initialIsAlreadyCropped) {
      // Extract filename from URL
      const urlParts = initialImage.split('/');
      const filename = urlParts[urlParts.length - 1];

      // Load image via fetch (avoids crossOrigin/CORS issues entirely)
      const imageUrl = `/backend/uploads/books/${encodeURIComponent(filename)}`;

      fetch(imageUrl)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setCroppedPreview(base64);
            setOriginalPreview(base64);
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error('Failed to load image:', imageUrl, err);
        });
    }
  }, [initialImage, initialIsAlreadyCropped]);

  /**
   * Reset all state when resetTrigger changes
   */
  useEffect(() => {
    if (resetTrigger > 0) {
      setPreview(null);
      setOriginalPreview(null);
      setCroppedPreview(null);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [resetTrigger]);


  /**
   * Process selected image file
   */
  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setOriginalPreview(result);
      if (onOriginalImageSelect) onOriginalImageSelect(result);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  /**
   * Handle image panning (drag to move)
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageRef.current || !containerRef.current) return;

    setIsDragPanning(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = offsetX;
    const startOffsetY = offsetY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      const newOffsetX = startOffsetX + deltaX;
      const newOffsetY = startOffsetY + deltaY;
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
      // Notify parent of position change
      if (onPositionChange) {
        onPositionChange({ scale, offsetX: newOffsetX, offsetY: newOffsetY });
      }
    };

    const handleMouseUp = () => {
      setIsDragPanning(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };


  /**
   * Reposition image with arrow buttons (prevents page scroll)
   */
  const moveImage = (direction: 'up' | 'down' | 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const moveStep = 5 / scale;
    let newOffsetX = offsetX;
    let newOffsetY = offsetY;

    switch (direction) {
      case 'up':
        newOffsetY = offsetY - moveStep;
        break;
      case 'down':
        newOffsetY = offsetY + moveStep;
        break;
      case 'left':
        newOffsetX = offsetX - moveStep;
        break;
      case 'right':
        newOffsetX = offsetX + moveStep;
        break;
    }

    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
    // Notify parent of position change
    if (onPositionChange) {
      onPositionChange({ scale, offsetX: newOffsetX, offsetY: newOffsetY });
    }
  };

  /**
   * Reset image position
   */
  const resetPosition = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
    // Notify parent of position change
    if (onPositionChange) {
      onPositionChange({ scale: 1, offsetX: 0, offsetY: 0 });
    }
  };

  /**
   * Reopen crop interface to reposition the image
   * Preserves current positioning to allow fine-tuning
   */
  const handleRepositionImage = () => {
    if (originalPreview) {
      setCroppedPreview(null); // Clear cropped preview to show crop interface
      setPreview(originalPreview);
      // IMPORTANT: Keep current scale, offsetX, offsetY to preserve positioning
      // Don't reset them so users can fine-tune from where they left off
    }
  };

  /**
   * Crop and export image
   */
  const handleCropImage = () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to final crop size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const img = imageRef.current;
    const scaledCropWidth = cropWidth / scale;
    const scaledCropHeight = cropHeight / scale;

    // Calculate the center offset of the image
    // When offset is 0, we want the center of the image to be visible
    const centerOffsetX = (img.width - scaledCropWidth) / 2;
    const centerOffsetY = (img.height - scaledCropHeight) / 2;

    // Calculate source region with center, scale and offset accounted for
    const srcX = centerOffsetX - offsetX / scale;
    const srcY = centerOffsetY - offsetY / scale;
    const srcWidth = scaledCropWidth;
    const srcHeight = scaledCropHeight;

    // Draw exactly what's visible in the crop frame
    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcWidth,
      srcHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    // Get base64 data and show preview
    const base64Image = canvas.toDataURL('image/jpeg', 0.95);
    setCroppedPreview(base64Image);
    onImageSelect(base64Image);
  };

  return (
    <div className="image-upload-container">
      <div className="upload-section">
        {croppedPreview ? (
          <>
            {/* Display Cropped Image */}
            <div className="cropped-preview-section">
              <h3><Camera size={20} className="icon" /> Your Cropped Image</h3>
              <div className="cropped-image-display">
                <img src={croppedPreview} alt="Cropped Book Cover" className="cropped-image" />
              </div>
              <div className="cropped-action-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRepositionImage}
                >
                  <Edit3 size={18} /> Reposition Image
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCroppedPreview(null);
                    setPreview(null);
                    setOriginalPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <RefreshCw size={18} /> Change Image
                </button>
              </div>
            </div>
          </>
        ) : !preview ? (
          <>
            {/* Drag and Drop Area */}
            <div
              className={`drag-drop-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={48} color="#20365f" style={{ marginBottom: '1rem' }} />
              <p>Drag and drop your book cover image here</p>
              <p className="or-text">or click to select a file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Facebook-Style Crop Interface */}
            <div className="facebook-crop-container">
              <div className="crop-wrapper" ref={containerRef}>
                {/* Crop Frame with Overlay */}
                <div className="crop-frame-container">
                  {/* Darkened overlay outside crop area */}
                  <div className="crop-overlay"></div>

                  {/* Image container */}
                  <div className="image-container">
                    <img
                      ref={imageRef}
                      src={preview}
                      alt="Crop Preview"

                      style={{
                        transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
                        cursor: isDragPanning ? 'grabbing' : 'grab',
                      }}
                      onMouseDown={handleMouseDown}
                    />
                  </div>

                  {/* Visible crop frame border */}
                  <div
                    className="crop-frame-border"
                    style={{
                      width: cropWidth,
                      height: cropHeight,
                    }}
                  >
                    <div className="crop-corner top-left"></div>
                    <div className="crop-corner top-right"></div>
                    <div className="crop-corner bottom-left"></div>
                    <div className="crop-corner bottom-right"></div>
                  </div>
                </div>

                {/* Controls Section */}
                <div className="crop-controls">
                  {/* Repositioning Controls */}
                  <div className="repositioning-controls">
                    <label><Target size={16} /> Reposition Image</label>
                    <div className="arrow-buttons-container">
                      <button type="button" className="arrow-btn" onMouseDown={(e) => moveImage('up', e)} title="Move up">
                        <ChevronUp size={16} />
                      </button>
                    </div>
                    <div className="arrow-buttons-row">
                      <button type="button" className="arrow-btn" onMouseDown={(e) => moveImage('left', e)} title="Move left">
                        <ChevronLeft size={16} />
                      </button>
                      <button type="button" className="reset-btn" onMouseDown={resetPosition} title="Reset position">
                        <RotateCcw size={14} /> Reset
                      </button>
                      <button type="button" className="arrow-btn" onMouseDown={(e) => moveImage('right', e)} title="Move right">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="arrow-buttons-container">
                      <button type="button" className="arrow-btn" onMouseDown={(e) => moveImage('down', e)} title="Move down">
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="control-group">
                    <label><Search size={16} /> Zoom</label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={scale}
                      onChange={(e) => {
                        const newScale = parseFloat(e.target.value);
                        setScale(newScale);
                        // Notify parent of position change (including zoom)
                        if (onPositionChange) {
                          onPositionChange({ scale: newScale, offsetX, offsetY });
                        }
                      }}
                      onMouseDown={handleSliderMouseDown}
                      onMouseUp={handleSliderMouseUp}
                      onTouchStart={handleSliderMouseDown}
                      onTouchEnd={handleSliderMouseUp}
                      className="zoom-slider"
                    />
                    <span className="zoom-value">{(scale * 100).toFixed(0)}%</span>
                  </div>

                  <div className="crop-dimensions">
                    <p className="dimension-label">
                      Size: <strong>{cropWidth}W × {cropHeight}H</strong>
                    </p>
                  </div>

                  <p className="instruction-text">
                    <Info size={14} /> Drag the image to position it or use arrow buttons. Use the zoom slider to adjust size.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCroppedPreview(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X size={18} /> Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCropImage}
                >
                  <Check size={18} /> Confirm & Use Image
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
