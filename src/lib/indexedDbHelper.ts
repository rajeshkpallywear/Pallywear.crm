/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export function saveFileToLocalDB(key: string, base64Data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pallywear_files', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const dbInstance = request.result;
      const tx = dbInstance.transaction('files', 'readwrite');
      tx.objectStore('files').put(base64Data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export function getFileFromLocalDB(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('pallywear_files', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const dbInstance = request.result;
      try {
        const tx = dbInstance.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
}

export function isPointerUrl(url: string | null | undefined): boolean {
  if (typeof url !== 'string') return false;
  return url.startsWith('FIRESTORE_ATTACHMENT:') || (url.startsWith('data:') && url.includes(';base64,IDB_'));
}

// Intercept data url for download or render
export async function resolveAttachmentDataUrl(url: string): Promise<string> {
  if (!url) return '';
  
  if (url.startsWith('FIRESTORE_ATTACHMENT:')) {
    const parts = url.split(':');
    const key = parts[parts.length - 1];
    try {
      const localData = await getFileFromLocalDB(key);
      if (localData) {
        return localData;
      }
      
      const docRef = doc(db, 'attachments', key);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const fileData = snap.data().data;
        if (fileData) {
          await saveFileToLocalDB(key, fileData);
          return fileData;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve file from Firestore attachments for key:", key, e);
    }
    
    if (url.includes(':pdf:')) {
      return 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA1NQo+PgpzdHJlYW0KQlQgL0YxIDEyIFRmIDcwIDcwMCBUZCAoRHVtbXkgUERGIFBsYWNlaG9sZGVyKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMDc5IDAwMDAwIG4gCjAwMDAwMDAxNDQgMDAwMDAgbiAKMDAwMDAwMDI1NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjM2MQolJUVPRgo=';
    }
    if (url.includes(':zip:')) {
      return 'data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==';
    }
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5CYII=';
  }

  if (url.startsWith('data:') && url.includes(';base64,IDB_')) {
    const parts = url.split(';base64,IDB_');
    const key = parts[1];
    const mimeType = parts[0].replace('data:', '');
    try {
      const localData = await getFileFromLocalDB(key);
      if (localData) {
        return localData;
      }
    } catch (e) {
      console.warn("Failed to retrieve file from local IndexedDB for key:", key, e);
    }
    if (mimeType.includes('zip')) {
      return 'data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==';
    }
    if (mimeType.includes('pdf')) {
      return 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA1NQo+PgpzdHJlYW0KQlQgL0YxIDEyIFRmIDcwIDcwMCBUZCAoRHVtbXkgUERGIFBsYWNlaG9sZGVyKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMDc5IDAwMDAwIG4gCjAwMDAwMDAxNDQgMDAwMDAgbiAKMDAwMDAwMDI1NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjM2MQolJUVPRgo=';
    }
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5CYII=';
  }
  return url;
}

// ==========================================
// GLOBAL MONKEY-PATCHING FOR TRANSPARENT LOADS
// ==========================================

export function initializeGlobalAttachmentIntercepts() {
  if (typeof window === 'undefined') return;

  // 1. Intercept HTMLImageElement.prototype.src property setter
  const imgProto = HTMLImageElement.prototype;
  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(imgProto, 'src');
  
  if (originalSrcDescriptor && originalSrcDescriptor.set) {
    Object.defineProperty(imgProto, 'src', {
      set: function (val) {
        const self = this;
        if (typeof val === 'string' && isPointerUrl(val)) {
          resolveAttachmentDataUrl(val).then((resolved) => {
            originalSrcDescriptor.set!.call(self, resolved);
          });
        } else {
          originalSrcDescriptor.set!.call(self, val);
        }
      },
      get: function () {
        return originalSrcDescriptor.get!.call(this);
      },
      configurable: true,
      enumerable: true
    });
  }

  // 2. Intercept Element.prototype.setAttribute
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (name === 'src' && this instanceof HTMLImageElement && typeof value === 'string' && isPointerUrl(value)) {
      const self = this;
      resolveAttachmentDataUrl(value).then((resolved) => {
        originalSetAttribute.call(self, 'src', resolved);
      });
    } else {
      originalSetAttribute.call(this, name, value);
    }
  };

  // 3. Intercept global document click events on anchor tags with download attributes
  const handleGlobalClick = async (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a[download]');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && isPointerUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
        const filename = anchor.getAttribute('download') || 'download';
        try {
          const resolvedUrl = await resolveAttachmentDataUrl(href);
          const link = document.createElement('a');
          link.href = resolvedUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('Failed to resolve and download file:', err);
        }
      }
    }
  };

  document.addEventListener('click', handleGlobalClick, true);
}
