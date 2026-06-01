/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { saveFileToLocalDB } from '../lib/indexedDbHelper';
import imageCompression from 'browser-image-compression';
import { doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface FileUploadProps {
  label: string;
  onFilesSelected: (files: string[]) => void;
  maxFiles?: number;
  accept?: string;
}

export default function FileUpload({ label, onFilesSelected, maxFiles = 5, accept = "image/*,.pdf,.zip,.bmp,.tiff,.gif" }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<{ name: string, type: string, size: number, data: string }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsCompressing(true);
    const fileList: File[] = Array.from(files);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const processedFiles: { name: string, type: string, size: number, data: string }[] = [];

    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        alert(`File ${file.name} is too large. Max size is 100MB.`);
        continue;
      }
      try {
        let fileToProcess: File | Blob = file;
        if (file.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 0.15,
              maxWidthOrHeight: 1280,
              useWebWorker: true
            };
            fileToProcess = await imageCompression(file, options);
          } catch (compressErr) {
            console.error('Failed to compress image:', compressErr);
          }
        }

        let finalData = '';
        const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        try {
          // Attempt Firebase Storage Upload
          const storageRef = ref(storage, `attachments/${attachmentId}_${file.name}`);
          const uploadTask = await uploadBytes(storageRef, fileToProcess);
          const downloadUrl = await getDownloadURL(uploadTask.ref);
          finalData = downloadUrl;
        } catch (storageErr) {
          console.warn("Storage upload failed, falling back to Firestore attachments database:", storageErr);

          // Convert to base64
          const reader = new FileReader();
          const data = await new Promise<string>((resolve) => {
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsDataURL(fileToProcess);
          });

          let typePrefix = 'other';
          if (file.type.startsWith('image/')) {
            typePrefix = 'image';
          } else if (file.type.includes('pdf')) {
            typePrefix = 'pdf';
          } else if (file.type.includes('zip')) {
            typePrefix = 'zip';
          }

          try {
            await setDoc(doc(db, 'attachments', attachmentId), {
              id: attachmentId,
              data: data,
              name: file.name,
              createdAt: Date.now()
            });
            await saveFileToLocalDB(attachmentId, data);
            finalData = `FIRESTORE_ATTACHMENT:${typePrefix}:${attachmentId}`;
          } catch (uploadErr) {
            console.error("Failed to upload to Firestore attachments, fallback to IndexedDB:", uploadErr);
            const key = `file_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${fileToProcess.size}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await saveFileToLocalDB(key, data);
            const mimeType = data.split(';base64,')[0];
            finalData = `${mimeType};base64,IDB_${key}`;
          }
        }

        processedFiles.push({
          name: file.name,
          type: file.type,
          size: fileToProcess.size,
          data: finalData
        });
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    const updated = [...selectedFiles, ...processedFiles].slice(-maxFiles);
    setSelectedFiles(updated);
    onFilesSelected(updated.map(f => f.data));
    setIsCompressing(false);

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated.map(f => f.data));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        {isCompressing && (
          <div className="flex items-center gap-1.5 text-xs text-brand-primary animate-pulse font-bold">
            <Loader2 size={12} className="animate-spin" />
            Optimizing...
          </div>
        )}
      </div>
      <div
        onClick={() => !isCompressing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center group ${isCompressing ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-black hover:bg-gray-50'
          }`}
      >
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload size={24} className="text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-700">Click or drag to upload files</p>
        <p className="text-xs text-brand-primary mt-1 font-bold">Images are auto-optimized for HD quality (Max 100MB)</p>
        <p className="text-[10px] text-gray-400">PDF, ZIP or image files (Max {maxFiles} total)</p>
        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple
          disabled={isCompressing}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                {file.type.includes('image') ? <ImageIcon size={16} /> :
                  file.type.includes('zip') ? <Upload size={16} className="text-blue-500" /> :
                    <FileText size={16} className="text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB (Optimized)</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                disabled={isCompressing}
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
