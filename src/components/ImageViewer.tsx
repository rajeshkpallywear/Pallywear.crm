/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, Download, Search } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
  fileName?: string;
}

export default function ImageViewer({ src, onClose, fileName = 'attachment' }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${fileName}_high_res`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full p-1.5 border border-white/20">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-white text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <ZoomIn size={20} />
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-all font-bold flex items-center gap-2 shadow-lg"
        >
          <Download size={20} />
          <span className="hidden sm:inline">Download HD</span>
        </button>

        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-red-500 rounded-full text-white transition-all border border-white/20"
        >
          <X size={24} />
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center overflow-auto cursor-grab active:cursor-grabbing">
        <motion.div
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {src.startsWith('data:image') || src.includes('.png') || src.includes('.jpg') ? (
            <img src={src} className="max-w-none shadow-2xl rounded-lg" draggable={false} />
          ) : (
            <div className="bg-white p-12 rounded-3xl text-center max-w-md">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download size={40} className="text-brand-primary" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {src.includes('zip') ? 'ZIP Archive' : 'File Document'}
              </h3>
              <p className="text-gray-500 mt-2">
                {src.includes('zip')
                  ? 'ZIP files must be downloaded to access machine language contents.'
                  : 'PDF/Docs cannot be previewed directly. Please download to view.'}
              </p>
              <button
                onClick={handleDownload}
                className="mt-6 px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <Download size={20} />
                Download Now
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
