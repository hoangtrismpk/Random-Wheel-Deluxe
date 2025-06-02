import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageStore, ImageAsset } from '../App'; // Import ImageStore type
import { useNotification } from './NotificationContext'; // Import useNotification

interface NameInputProps {
  currentNames: string[];
  imageStore: ImageStore;
  onNamesChange: (names: string[]) => void;
  addNewImageToWheel: (id: string, dataURL: string, fileName: string) => void;
  isSpinning: boolean;
}

type SortDirection = 'none' | 'asc' | 'desc';

// Fisher-Yates Shuffle Algorithm
const shuffleArray = (array: string[]): string[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Helper to escape HTML characters
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const deriveNamesFromDOM = (container: HTMLDivElement | null, currentImageStore: ImageStore): string[] => {
  if (!container) return [];
  const derivedNames: string[] = [];

  for (const child of Array.from(container.children)) {
    if (child instanceof HTMLDivElement) {
      const id = child.dataset.id;
      const type = child.dataset.type;

      const imageWrapperSpan = child.querySelector('span[contenteditable="false"]');
      const imgElement = imageWrapperSpan ? imageWrapperSpan.querySelector('img') : null;
      const hasActualImageStructure = !!imgElement;

      if (type === 'image' && id && currentImageStore[id] && hasActualImageStructure) {
        derivedNames.push(id);
      } else { 
        // Handle text content, potentially with <br> tags or plain text newlines
        if (child.innerHTML.trim().toLowerCase() === '<br>') { // Check for <div><br></div> specifically
          derivedNames.push(''); 
        } else {
          const brPattern = /<br\s*\/?>/gi;
          // First, split by <br> tags to handle HTML line breaks (e.g., from Excel)
          const htmlSegments = child.innerHTML.split(brPattern);
          
          htmlSegments.forEach((segmentHTML) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = segmentHTML; // Use innerHTML to correctly parse the segment
            const textContentOfSegment = tempDiv.textContent || '';

            // Then, split the textContent of this segment by actual newline characters
            // This handles plain text newlines (e.g., from Notepad)
            const linesFromTextContent = textContentOfSegment.split(/\r\n?|\n/);

            linesFromTextContent.forEach(finalLine => {
              // Clean and push each final line
              derivedNames.push(finalLine.replace(/\u200B/g, '').trim());
            });
          });
        }
      }
    }
  }
  return derivedNames;
};


const NameInput: React.FC<NameInputProps> = ({
  currentNames,
  imageStore,
  onNamesChange,
  addNewImageToWheel,
  isSpinning
}) => {
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editableDivRef = useRef<HTMLDivElement>(null);
  const isProgrammaticUpdateRef = useRef(false);
  const lastUserEditTimeRef = useRef(0);
  const { addNotification } = useNotification();


  useEffect(() => {
    if (!editableDivRef.current || isSpinning) return;

    const wasTriggeredProgrammatically = isProgrammaticUpdateRef.current;

    if (!wasTriggeredProgrammatically) {
      const domDerivedNames = deriveNamesFromDOM(editableDivRef.current, imageStore);
      const filteredDomDerivedNames = domDerivedNames.filter(nameOrId => {
        if (imageStore[nameOrId]) return true; 
        return nameOrId.trim() !== ''; 
      });

      if (JSON.stringify(filteredDomDerivedNames) === JSON.stringify(currentNames)) {
        return; 
      }
    }

    isProgrammaticUpdateRef.current = true;

    let newHtml = '';
    currentNames.forEach(nameOrId => {
      const asset = imageStore[nameOrId];
      if (asset) {
        const escapedFileName = escapeHtml(asset.fileName);
        newHtml += `<div data-type="image" data-id="${nameOrId}">` +
                     `<span contenteditable="false">` +
                       `<img src="${asset.dataURL}" alt="${escapedFileName}" />` +
                     `</span>\u200B` + 
                   `</div>`;
      } else {
        const escapedText = escapeHtml(nameOrId);
        newHtml += `<div data-type="text">${escapedText === '' ? '<br>' : escapedText}</div>`;
      }
    });

    if (editableDivRef.current.innerHTML !== newHtml) {
        editableDivRef.current.innerHTML = newHtml;
        
        if (wasTriggeredProgrammatically && window.getSelection) {
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                if (editableDivRef.current.childNodes.length > 0) {
                    const lastChild = editableDivRef.current.lastChild;
                    if (lastChild) {
                        range.selectNodeContents(lastChild);
                        range.collapse(false); 
                    } else { 
                        range.selectNodeContents(editableDivRef.current);
                        range.collapse(false);
                    }
                } else {
                    range.selectNodeContents(editableDivRef.current);
                    range.collapse(false);
                }
                try {
                  selection.removeAllRanges();
                  selection.addRange(range);
                } catch (e) {
                  // console.warn("Failed to set selection range:", e);
                }
            }
        }
    }
    requestAnimationFrame(() => {
      isProgrammaticUpdateRef.current = false;
    });

  }, [currentNames, imageStore, isSpinning]);


  const triggerNamesUpdateFromDOM = useCallback(() => {
    if (!editableDivRef.current) return;
    const rawNamesFromDom = deriveNamesFromDOM(editableDivRef.current, imageStore);
    const filteredNames = rawNamesFromDom.filter(nameOrId => {
      if (imageStore[nameOrId]) {
        return true;
      }
      return nameOrId.trim() !== '';
    });

    if (JSON.stringify(filteredNames) !== JSON.stringify(currentNames)) {
        onNamesChange(filteredNames);
    }
    setSortDirection('none');
  }, [imageStore, onNamesChange, currentNames]);


  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    if (isProgrammaticUpdateRef.current || isSpinning) {
      return;
    }
    lastUserEditTimeRef.current = Date.now();
    triggerNamesUpdateFromDOM();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (isSpinning) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text/plain');
    const lines = pastedText.split(/\r\n?|\n/);

    const selection = window.getSelection();
    if (!selection || !editableDivRef.current) {
        addNotification('Không thể dán nội dung: lỗi vùng chọn.', 'error');
        return;
    }
    
    let range: Range;
    if (selection.rangeCount > 0 && editableDivRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        range = selection.getRangeAt(0);
    } else {
        editableDivRef.current.focus(); 
        range = document.createRange();
        range.selectNodeContents(editableDivRef.current);
        range.collapse(false); 
        selection.removeAllRanges();
        selection.addRange(range);
    }

    range.deleteContents(); 

    const fragment = document.createDocumentFragment();
    lines.forEach((line) => {
      const div = document.createElement('div');
      if (line.trim() === '') { 
        div.innerHTML = '<br>';
      } else {
        div.textContent = line; 
      }
      fragment.appendChild(div);
    });

    const lastNodeOfFragment = fragment.lastChild; 
    range.insertNode(fragment);

    if (lastNodeOfFragment) {
      range.setStartAfter(lastNodeOfFragment);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    lastUserEditTimeRef.current = Date.now();
    triggerNamesUpdateFromDOM();
  };


  const handleAddImageClick = () => {
    if (isSpinning) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        addNotification('Loại tệp không hợp lệ. Vui lòng chọn ảnh PNG, JPG, WEBP, hoặc GIF.', 'error');
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        addNotification('Tệp quá lớn. Kích thước tối đa cho ảnh trên vòng quay là 2MB.', 'error');
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataURL = reader.result as string;
        const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        isProgrammaticUpdateRef.current = true; 
        addNewImageToWheel(id, dataURL, file.name);
        addNotification(`Đã thêm ảnh: ${file.name}`, 'success');
        if(fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.onerror = () => {
        addNotification('Lỗi đọc tệp.', 'error');
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
      reader.readAsDataURL(file);
    }
  };


  const handleShuffleNames = () => {
    if (isSpinning || currentNames.length === 0) return;
    const shuffledNames = shuffleArray(currentNames);
    isProgrammaticUpdateRef.current = true; 
    onNamesChange(shuffledNames);
    setSortDirection('none');
    addNotification('Đã trộn danh sách!', 'info');
  };

  const handleSortNames = () => {
    if (isSpinning || currentNames.length === 0) return;

    const sortableItems = currentNames.map(nameOrId => {
      let displayText = nameOrId;
      if (imageStore[nameOrId]) {
        displayText = `Ảnh: ${imageStore[nameOrId].fileName}`; 
      }
      return { original: nameOrId, display: displayText };
    });

    let newSortedOriginals: string[];
    let nextSortDirection: SortDirection;

    if (sortDirection === 'asc') {
      sortableItems.sort((a, b) => b.display.localeCompare(a.display, 'vi', { sensitivity: 'base' }));
      nextSortDirection = 'desc';
    } else {
      sortableItems.sort((a, b) => a.display.localeCompare(b.display, 'vi', { sensitivity: 'base' }));
      nextSortDirection = 'asc';
    }

    newSortedOriginals = sortableItems.map(item => item.original);
    isProgrammaticUpdateRef.current = true; 
    onNamesChange(newSortedOriginals);
    setSortDirection(nextSortDirection);
    addNotification(`Đã sắp xếp ${nextSortDirection === 'asc' ? 'A-Z' : 'Z-A'}.`, 'info');
  };

  return (
    <>
      <div
        ref={editableDivRef}
        onInput={handleInput}
        onPaste={handlePaste} 
        contentEditable={!isSpinning}
        suppressContentEditableWarning={true}
        className="name-input-editable-area custom-scrollbar"
        data-placeholder="Nhập tên (mỗi mục một dòng) hoặc thêm ảnh bằng nút bên dưới..."
        aria-label="Danh sách tên và ảnh cho vòng quay"
        role="textbox"
        aria-multiline="true"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        aria-hidden="true"
      />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleAddImageClick}
          disabled={isSpinning}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Thêm ảnh vào vòng quay"
        >
          Thêm ảnh
        </button>
        <button
          onClick={handleShuffleNames}
          disabled={isSpinning || currentNames.length === 0}
          className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Trộn danh sách các mục ngẫu nhiên"
        >
          Trộn danh sách
        </button>
        <button
          onClick={handleSortNames}
          disabled={isSpinning || currentNames.length === 0}
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={sortDirection === 'asc' ? "Sắp xếp các mục theo thứ tự Z đến A" : "Sắp xếp các mục theo thứ tự A đến Z"}
        >
          Sắp xếp {sortDirection === 'asc' ? '(A-Z ↓)' : sortDirection === 'desc' ? '(Z-A ↑)' : ''}
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-3 text-center">Mỗi mục sẽ là một dòng. Vòng quay tự động cập nhật.</p>
    </>
  );
};

export default NameInput;