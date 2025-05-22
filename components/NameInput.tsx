
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageStore, ImageAsset } from '../App'; // Import ImageStore type

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
        const textContent = child.textContent || '';
        const textContentWithoutZWS = textContent.replace(/\u200B/g, '').trim();

        if (textContentWithoutZWS === '') {
          derivedNames.push(id);
        } else {
          // This case should ideally not happen if ZWS is the only text content for images
          derivedNames.push(textContentWithoutZWS);
        }
      } else {
        if (child.innerHTML.toLowerCase() === '<br>') {
          derivedNames.push('');
        } else {
          const textContent = child.textContent || '';
          // Preserve internal newlines within a single div as spaces, then trim.
          // Actual line breaks are handled by separate divs.
          const normalizedText = textContent.replace(/\r\n?|\n/g, ' ');
          const trimmedText = normalizedText.trim();

          if (trimmedText === '\u200B') { // ZWS from an image placeholder that lost its structure
            derivedNames.push('');
          } else {
            derivedNames.push(trimmedText);
          }
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


  useEffect(() => {
    if (!editableDivRef.current || isSpinning) return;

    // Capture if the trigger for this effect was an explicit programmatic action
    // (like sort/shuffle/add image) that set this ref to true *before* onNamesChange.
    const wasTriggeredProgrammatically = isProgrammaticUpdateRef.current;

    // If this update is NOT due to an explicit programmatic action 
    // (i.e., likely user typing that called onNamesChange via handleInput)
    // AND the DOM's current semantic content already matches the new currentNames,
    // then don't rewrite innerHTML to preserve cursor position.
    if (!wasTriggeredProgrammatically) {
      const domDerivedNames = deriveNamesFromDOM(editableDivRef.current, imageStore);
      const filteredDomDerivedNames = domDerivedNames.filter(nameOrId => {
        if (imageStore[nameOrId]) return true; // Image IDs are always valid
        return nameOrId.trim() !== ''; // Text items must not be empty after trim
      });

      if (JSON.stringify(filteredDomDerivedNames) === JSON.stringify(currentNames)) {
        return; // DOM is semantically in sync, avoid rewrite and cursor jump
      }
    }

    // Signal that this effect is now performing a programmatic update to the DOM.
    // This flag is used by handleInput to ignore its own parsing during this rewrite.
    // And also by the cursor restoration logic.
    isProgrammaticUpdateRef.current = true;

    let newHtml = '';
    currentNames.forEach(nameOrId => {
      const asset = imageStore[nameOrId];
      if (asset) {
        const escapedFileName = escapeHtml(asset.fileName);
        newHtml += `<div data-type="image" data-id="${nameOrId}">` +
                     `<span contenteditable="false">` +
                       `<img src="${asset.dataURL}" alt="${escapedFileName}" />` +
                     `</span>\u200B` + // Zero-width space
                   `</div>`;
      } else {
        const escapedText = escapeHtml(nameOrId);
        newHtml += `<div data-type="text">${escapedText === '' ? '<br>' : escapedText}</div>`;
      }
    });

    if (editableDivRef.current.innerHTML !== newHtml) {
        editableDivRef.current.innerHTML = newHtml;
        
        // Restore cursor to the end, primarily for explicit programmatic updates
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

    // Reset the flag after the DOM update (and potential cursor restoration) is complete.
    // This ensures subsequent user inputs are not treated as programmatic.
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
    
    const htmlToInsert = lines.map(line => {
      const escapedLine = escapeHtml(line);
      return `<div>${escapedLine === '' ? '<br>' : escapedLine}</div>`;
    }).join('');

    const selection = window.getSelection();
    if (selection && editableDivRef.current && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!editableDivRef.current.contains(range.commonAncestorContainer)) {
            editableDivRef.current.focus();
            const newRange = document.createRange();
            newRange.selectNodeContents(editableDivRef.current);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    } else if (editableDivRef.current) {
        editableDivRef.current.focus();
        const newRange = document.createRange();
        newRange.selectNodeContents(editableDivRef.current);
        newRange.collapse(false); 
        if(selection) {
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }


    if (!document.execCommand('insertHTML', false, htmlToInsert)) {
        console.warn('execCommand insertHTML failed. Pasting might not work as expected. Trying to fallback to direct DOM manipulation for paste (less reliable for complex cases).');
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !editableDivRef.current) return;
        let range = sel.getRangeAt(0);
        if (!editableDivRef.current.contains(range.commonAncestorContainer)) {
            range.selectNodeContents(editableDivRef.current);
            range.collapse(false);
        }
        range.deleteContents();
        const fragment = document.createDocumentFragment();
        lines.forEach((line) => {
            const div = document.createElement('div');
            div.setAttribute('data-type', 'text');
            if (line === '') div.innerHTML = '<br>';
            else div.textContent = line;
            fragment.appendChild(div);
        });
        range.insertNode(fragment);
        if (fragment.lastChild) {
            range.setStartAfter(fragment.lastChild);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
    
    lastUserEditTimeRef.current = Date.now();
    // After paste, the DOM is definitely changed by user action, ensure it's not seen as programmatic
    isProgrammaticUpdateRef.current = false; 
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
        alert('Loại tệp không hợp lệ. Vui lòng chọn ảnh PNG, JPG, WEBP, hoặc GIF.');
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Tệp quá lớn. Kích thước tối đa cho ảnh trên vòng quay là 2MB.');
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataURL = reader.result as string;
        const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        isProgrammaticUpdateRef.current = true; // Signal programmatic update
        addNewImageToWheel(id, dataURL, file.name);
        if(fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.onerror = () => {
        alert('Lỗi đọc tệp.');
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
      reader.readAsDataURL(file);
    }
  };


  const handleShuffleNames = () => {
    if (isSpinning || currentNames.length === 0) return;
    const shuffledNames = shuffleArray(currentNames);
    isProgrammaticUpdateRef.current = true; // Signal programmatic update
    onNamesChange(shuffledNames);
    setSortDirection('none');
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
    isProgrammaticUpdateRef.current = true; // Signal programmatic update
    onNamesChange(newSortedOriginals);
    setSortDirection(nextSortDirection);
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
