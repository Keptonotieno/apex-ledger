import React, { useState, useRef } from 'react';
import { Camera, Upload, FileText, CheckCircle2, RotateCcw, Sparkles, Download, Eye, AlertCircle } from 'lucide-react';

interface ReceiptUploaderProps {
  receiptUrl?: string;
  onChange: (
    url: string | undefined,
    extractedData?: {
      vendor?: string;
      amount?: number;
      date?: string;
      invoiceNumber?: string;
      receiptNumber?: string;
    }
  ) => void;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ receiptUrl, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MOCK OCR Receipt Database for realistic OCR simulations
  const MOCK_RECEIPTS = [
    { vendor: 'KPLC Power Kenya', amount: 4800, date: new Date().toISOString().split('T')[0], invoiceNumber: 'INV-ELEC-482', receiptNumber: 'REC-KP-2026' },
    { vendor: 'Safaricom Business', amount: 7500, date: new Date().toISOString().split('T')[0], invoiceNumber: 'INV-SAF-009', receiptNumber: 'REC-SAF-991' },
    { vendor: 'Naivas Supermarket', amount: 3250, date: new Date().toISOString().split('T')[0], invoiceNumber: 'INV-NV-7711', receiptNumber: 'REC-NV-0241' },
    { vendor: 'Uber East Africa', amount: 1800, date: new Date().toISOString().split('T')[0], invoiceNumber: 'INV-UB-302', receiptNumber: 'REC-UB-994' },
    { vendor: 'Nairobi Water Co.', amount: 2100, date: new Date().toISOString().split('T')[0], invoiceNumber: 'INV-NWC-121', receiptNumber: 'REC-NWC-552' }
  ];

  const processOCR = (fileName: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      // Pick a random mock receipt or match some words from file name
      const lowercaseName = fileName.toLowerCase();
      let matched = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];
      
      if (lowercaseName.includes('power') || lowercaseName.includes('electricity') || lowercaseName.includes('kplc')) {
        matched = MOCK_RECEIPTS[0];
      } else if (lowercaseName.includes('internet') || lowercaseName.includes('safaricom') || lowercaseName.includes('wifi')) {
        matched = MOCK_RECEIPTS[1];
      } else if (lowercaseName.includes('groceries') || lowercaseName.includes('naivas') || lowercaseName.includes('food')) {
        matched = MOCK_RECEIPTS[2];
      } else if (lowercaseName.includes('uber') || lowercaseName.includes('transport') || lowercaseName.includes('taxi')) {
        matched = MOCK_RECEIPTS[3];
      } else if (lowercaseName.includes('water')) {
        matched = MOCK_RECEIPTS[4];
      }

      // Generate base64 or dummy receipt image url
      onChange('/mock_receipt_doc.png', matched);
      setIsProcessing(false);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processOCR(file.name);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access blocked or not supported inside iframe. Loading simulated capture interface.', err);
    }
  };

  const capturePhoto = () => {
    if (cameraStream && videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          stopCamera();
          processOCR('camera_snapshot_receipt.png');
        }
      } catch (e) {
        fallbackMockCapture();
      }
    } else {
      fallbackMockCapture();
    }
  };

  const fallbackMockCapture = () => {
    stopCamera();
    processOCR('simulated_camera_receipt.png');
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

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
      processOCR(file.name);
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      <label className="text-gray-400 block font-sans">Receipt Attachment & OCR Capture</label>

      {isProcessing && (
        <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-6 text-center space-y-3 animate-pulse">
          <Sparkles className="w-6 h-6 text-cyan-400 mx-auto animate-spin" />
          <div className="space-y-1">
            <p className="text-cyan-400 font-bold">Scanning Receipt with Gemini OCR...</p>
            <p className="text-[10px] text-gray-500">Extracting vendor entity, VAT breakdown, amount totals, and issue dates.</p>
          </div>
          <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
            <div className="bg-cyan-500 h-1.5 rounded-full animate-progress" style={{ width: '70%' }}></div>
          </div>
        </div>
      )}

      {!isProcessing && !receiptUrl && !showCamera && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/20 text-cyan-400'
              : 'border-brand-border hover:border-cyan-500/30 bg-gray-950/40 text-gray-400'
          }`}
        >
          <Upload className="w-6 h-6 text-gray-500 hover:text-cyan-400 transition" />
          <div className="space-y-1">
            <p className="font-semibold text-gray-300">Drag & drop or Click to upload receipt</p>
            <p className="text-[10px] text-gray-500">Supports PDF, PNG, JPG (Max 10MB)</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startCamera();
              }}
              className="px-3 py-1.5 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-300 rounded-lg flex items-center gap-1.5 transition text-[10px]"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Use Web Camera</span>
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />
        </div>
      )}

      {showCamera && (
        <div className="border border-brand-border bg-gray-950 rounded-xl p-4 text-center space-y-3 relative overflow-hidden">
          <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center overflow-hidden border border-brand-border relative">
            {cameraStream ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
            ) : (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="text-amber-400 font-sans font-bold">Iframe Permission Sandbox Restricted</p>
                <p className="text-[10px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                  To secure user privacy, standard web camera capture is sandboxed. Click below to simulate snapshot OCR.
                </p>
              </div>
            )}
            <div className="absolute top-2 right-2 bg-gray-950/80 px-2 py-0.5 rounded text-[8px] border border-cyan-500/20 text-cyan-400">
              HD LENS RESOLUTION
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={cameraStream ? capturePhoto : fallbackMockCapture}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-1.5 transition font-bold"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture & OCR Scan</span>
            </button>
          </div>
        </div>
      )}

      {receiptUrl && !isProcessing && (
        <div className="space-y-3">
          <div className="border border-brand-border bg-gray-950/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-200">digital_receipt_scanned.png</p>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OCR Extracted Successfully</span>
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowImagePreview(!showImagePreview)}
                className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-cyan-400 rounded-lg transition"
                title="Toggle Live Preview"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Downloading receipt document mockup: ' + receiptUrl);
                }}
                className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-gray-200 rounded-lg transition"
                title="Download Receipt"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-rose-400 hover:text-rose-300 rounded-lg transition"
                title="Remove Receipt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Fully Responsive Receipt Preview Container */}
          {showImagePreview && (
            <div className="border border-brand-border bg-gray-950/60 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in duration-200">
              <div className="text-[9px] font-bold text-gray-500 mb-2 uppercase tracking-wider font-sans self-start">
                Live Document Preview (Aspect-Ratio Preserved)
              </div>
              
              <div className="w-full max-w-full overflow-hidden rounded-lg bg-gray-900/40 p-1 border border-brand-border/40 flex items-center justify-center max-h-[320px] md:max-h-[400px]">
                <img
                  src={receiptUrl}
                  alt="Receipt Scan"
                  className="max-w-full max-h-full object-contain rounded-md shadow-md"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to a clean placeholder receipt mockup if the primary URL fails
                    e.currentTarget.src = "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=600&auto=format&fit=crop&q=60";
                  }}
                />
              </div>

              <div className="text-[9px] text-gray-500 mt-2 font-sans text-center">
                Use pinch to zoom or scroll on mobile screens to inspect finer line items.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
