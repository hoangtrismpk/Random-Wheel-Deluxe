
import React, { useState } from 'react';
import { useNotification } from './NotificationContext'; // Import useNotification

interface ImageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (src: string) => void;
  purposeTitle?: string; // New prop for dynamic title
}

const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onImageSelected,
  purposeTitle = "Chọn Hình Ảnh" // Default title
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const { addNotification } = useNotification(); // Hook for notifications

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        addNotification('Loại tệp không hợp lệ. Vui lòng chọn ảnh PNG, JPG, hoặc WEBP.', 'error');
        event.target.value = ''; 
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        addNotification('Tệp quá lớn. Kích thước tối đa là 5MB.', 'error');
        event.target.value = ''; 
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
      };
      reader.onerror = () => {
        addNotification('Lỗi đọc tệp.', 'error');
        event.target.value = ''; 
      }
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      addNotification('Vui lòng nhập URL hình ảnh.', 'error');
      return;
    }
    try {
      const parsedUrl = new URL(urlInput);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        addNotification('Giao thức URL không hợp lệ. Phải là http hoặc https.', 'error');
        return;
      }
      // Basic check for common image extensions, not foolproof
      if (!/\.(jpeg|jpg|gif|png|webp)$/i.test(parsedUrl.pathname)) {
        addNotification('URL không giống như một đường dẫn hình ảnh hợp lệ. Hãy chắc chắn URL trỏ trực tiếp đến tệp ảnh.', 'error');
        return;
      }
      onImageSelected(urlInput);
    } catch (e) {
      addNotification('Định dạng URL không hợp lệ.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60] transition-opacity duration-300" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="imageSelectModalTitle"
    >
      <div 
        className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 id="imageSelectModalTitle" className="text-xl font-semibold text-pink-400">
                {purposeTitle}
            </h2>
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 text-2xl"
                aria-label="Đóng lựa chọn hình ảnh"
            >
                &times;
            </button>
        </div>
        
        <div className="mb-4 border-b border-slate-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => { setActiveTab('upload'); }}
              aria-pressed={activeTab === 'upload'}
              className={`py-3 px-4 font-medium text-sm border-b-2 outline-none focus:ring-2 focus:ring-pink-400 ${activeTab === 'upload' ? 'border-pink-500 text-pink-500' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
            >
              Tải Tệp Lên
            </button>
            <button
              onClick={() => { setActiveTab('url'); }}
              aria-pressed={activeTab === 'url'}
              className={`py-3 px-4 font-medium text-sm border-b-2 outline-none focus:ring-2 focus:ring-pink-400 ${activeTab === 'url' ? 'border-pink-500 text-pink-500' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
            >
              Từ URL
            </button>
          </nav>
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-300">
              Chọn ảnh (PNG, JPG, WEBP, tối đa 5MB):
            </label>
            <input
              id="imageUpload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
             <p className="text-xs text-slate-500">Hình ảnh được chọn sẽ được sử dụng ngay lập tức.</p>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="imageUrlInput" className="block text-sm font-medium text-slate-300 mb-1">
                URL Hình Ảnh:
              </label>
              <input
                id="imageUrlInput"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full p-2 border border-slate-700 rounded-md bg-slate-900 text-slate-200 focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <button
              onClick={handleUrlSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors"
            >
              Sử Dụng Ảnh Từ URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelectionModal;