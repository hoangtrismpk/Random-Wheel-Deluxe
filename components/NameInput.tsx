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
    // This filter ensures empty strings from text (not image IDs) are removed
    // before calling onNamesChange.
    const filteredNames = rawNamesFromDom.filter(nameOrId => {
      if (imageStore[nameOrId]) { // Keep if it's an image ID (even if filename is empty)
        return true;
      }
      return nameOrId.trim() !== ''; // For text, keep only if non-empty after trim
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
    const linesFromPaste = pastedText.split(/\r\n?|\n/);

    // Filter out empty lines that result from multiple newlines,
    // but keep lines that are just whitespace if we want to allow names like "  " (trim later).
    // For consistency with triggerNamesUpdateFromDOM, we will trim and filter empty strings.
    const processedLines = linesFromPaste
        .map(line => line.trim()) // Trim each line
        .filter(line => line !== ''); // Remove lines that are empty after trimming

    if (processedLines.length === 0 && pastedText.trim() !== '') {
        // If pastedText was not empty but processedLines is (e.g. pasted only whitespace),
        // we might want to add a single empty string if the app supports it,
        // or do nothing if empty entries are not desired from paste.
        // For now, if all lines are empty after trim, it results in no new names.
    }
    
    // Get current names that are not image IDs to merge with pasted text
    const existingTextNames = currentNames.filter(nameOrId => !imageStore[nameOrId]);
    const combinedNames = [...existingTextNames, ...processedLines];
    
    // Re-add image names, preserving their original order relative to each other if possible,
    // but new text names will be appended after existing text names.
    // A simpler approach: add all existing image IDs at the beginning or end of the new text list.
    // For now, let's just replace currentNames with the new set derived from paste,
    // effectively replacing all content. If selection-based pasting is desired, this needs more complex logic.

    isProgrammaticUpdateRef.current = true;
    // The `onNamesChange` will trigger the useEffect to rebuild the DOM,
    // including setting the cursor at the end.
    // `currentNames` in App.tsx will become these `processedLines` (if it's a full replacement)
    // Or, if appending: need to get current selection and merge.
    // For simplicity of this fix, let's assume paste replaces all text content.
    // To achieve this, we need to combine existing images with new text.
    const imageNames = currentNames.filter(nameOrId => imageStore[nameOrId]);

    // If the contentEditable was focused and had a selection, this simplistic replace might not be ideal.
    // However, the original problem is about bulk pasting usually into an empty or fully selected area.
    // Let's make pasted content replace current text items but keep existing images.
    
    const finalNames = [...imageNames, ...processedLines];
    
    onNamesChange(finalNames);
    
    lastUserEditTimeRef.current = Date.now();
    addNotification(`Đã dán ${processedLines.length} mục.`, 'info');
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