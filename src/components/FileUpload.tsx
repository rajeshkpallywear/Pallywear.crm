/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  label: string;
  onFilesSelected: (files: string[]) => void;
  maxFiles?: number;
  accept?: string;
}

export default function FileUpload({ label, onFilesSelected, maxFiles = 5, accept = "image/*,.pdf" }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<{ name: string, type: string, size: number, data: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 100 * 1024 * 1024) {
        alert(`${file.name} is too large. Max size is 100MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newData = event.target?.result as string;
        const newFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: newData
        };

        const updated = [...selectedFiles, newFile].slice(-maxFiles);
        setSelectedFiles(updated);
        onFilesSelected(updated.map(f => f.data));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated.map(f => f.data));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-black hover:bg-gray-50 transition-all cursor-pointer text-center group"
      >
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload size={24} className="text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-700">Click or drag to upload files</p>
        <p className="text-xs text-gray-500 mt-1">{accept.includes('pdf') && accept.includes('image') ? 'PDF or image files' : accept.includes('pdf') ? 'PDF files only' : 'Image files only'} (Max 100MB)</p>
        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                {file.type.includes('image') ? <ImageIcon size={16} /> : <FileText size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
