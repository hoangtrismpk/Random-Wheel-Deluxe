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

  if (container.children.length === 0 && container.textContent && container.textContent.trim() !== '') {
    // Case 1: Raw text directly in contentEditable (e.g., first character typed into empty div)
    const lines = container.textContent.split(/\r\n?|\n/);
    lines.forEach(line => {
      derivedNames.push(line.replace(/\u200B/g, '').trim());
    });
  } else {
    // Case 2: Structured <div> elements
    for (const child of Array.from(container.children)) {
      if (child instanceof HTMLDivElement) {
        const id = child.dataset.id;
        const type = child.dataset.type;

        const imageWrapperSpan = child.querySelector('span[contenteditable="false"]');
        const imgElement = imageWrapperSpan ? imageWrapperSpan.querySelector('img') : null;
        const hasActualImageStructure = !!imgElement;

        if (type === 'image' && id && currentImageStore[id] && hasActualImageStructure) {
          derivedNames.push(id);
        } else if (type === 'text' || !(type === 'image')) { // Treat as text if data-type is 'text' or not 'image'
          const rawTextContent = child.textContent || "";
          const linesFromTextContent = rawTextContent.split(/\r\n?|\n/);

          linesFromTextContent.forEach(finalLine => {
            derivedNames.push(finalLine.replace(/\u200B/g, '').trim());
          });
        }
      }
    }
  }

  return derivedNames.filter(nameOrId => {
    return currentImageStore[nameOrId] || nameOrId.trim() !== '';
  });
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

    isProgrammaticUpdateRef.current = true;

    let newHtml = '';
    currentNames.forEach(nameOrId => {
      const asset = imageStore[nameOrId];
      if (asset) {
        const escapedFileName = escapeHtml(asset.fileName);
        newHtml += `<div data-type="image" data-id="${nameOrId}">` +
                     `<span contenteditable="false">` +
                       `<img src="${asset.dataURL}" alt="${escapedFileName}" />` +
                     `</span>\u200B` + // Zero-width space for cursor behavior
                   `</div>`;
      } else {
        const escapedText = escapeHtml(nameOrId);
        newHtml += `<div data-type="text">${escapedText === '' ? '<br>' : escapedText}</div>`;
      }
    });

    if (editableDivRef.current.innerHTML !== newHtml) {
        const wasEditorFocused = document.activeElement === editableDivRef.current;
        const selectionState = saveSelection(editableDivRef.current);
        
        editableDivRef.current.innerHTML = newHtml;
        
        if (wasEditorFocused) {
            restoreSelection(editableDivRef.current, selectionState);
            // Ensure focus is maintained after programmatic update if it was focused
            // editableDivRef.current.focus(); // This might be redundant if restoreSelection handles it
        }
    }
    
    requestAnimationFrame(() => {
      isProgrammaticUpdateRef.current = false;
    });

  }, [currentNames, imageStore, isSpinning]);


  const triggerNamesUpdateFromDOM = useCallback(() => {
    if (!editableDivRef.current) return;
    const rawNamesFromDom = deriveNamesFromDOM(editableDivRef.current, imageStore);
    
    if (JSON.stringify(rawNamesFromDom) !== JSON.stringify(currentNames)) {
        onNamesChange(rawNamesFromDom);
    }
    setSortDirection('none'); 
  }, [imageStore, onNamesChange, currentNames]);


  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    if (isProgrammaticUpdateRef.current || isSpinning) {
      return;
    }
    lastUserEditTimeRef.current = Date.now(); 
    
    // Defer DOM reading and state update
    requestAnimationFrame(() => {
      if (editableDivRef.current && !isProgrammaticUpdateRef.current) { // Re-check refs and flags
        triggerNamesUpdateFromDOM();
      }
    });
  };

  const saveSelection = (containerEl: HTMLElement | null): {start: number, end: number, startNodePath: number[], endNodePath: number[]} | null => {
    if (!containerEl || !window.getSelection) return null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      const getNodePath = (node: Node): number[] => {
        const path: number[] = [];
        let currentNode: Node | null = node;
        while (currentNode && currentNode !== containerEl) {
          const parent = currentNode.parentNode;
          if (!parent) break;
          path.unshift(Array.from(parent.childNodes).indexOf(currentNode as ChildNode));
          currentNode = parent;
        }
        return path;
      };

      return {
        start: range.startOffset,
        end: range.endOffset,
        startNodePath: getNodePath(range.startContainer),
        endNodePath: getNodePath(range.endContainer)
      };
    }
    return null;
  };

  const restoreSelection = (containerEl: HTMLElement | null, savedSel: {start: number, end: number, startNodePath: number[], endNodePath: number[]} | null) => {
    if (!containerEl || !savedSel || !window.getSelection) return;

    const getNodeFromPath = (path: number[]): Node | null => {
        let currentNode: Node | null = containerEl;
        for (const index of path) {
            if (!currentNode || !currentNode.childNodes[index]) return null;
            currentNode = currentNode.childNodes[index];
        }
        return currentNode;
    };

    const startNode = getNodeFromPath(savedSel.startNodePath);
    const endNode = getNodeFromPath(savedSel.endNodePath);

    if (startNode && endNode) {
      try {
        const range = document.createRange();
        // Clamp offsets to be within node length
        const validStartOffset = Math.min(savedSel.start, startNode.textContent?.length ?? 0);
        const validEndOffset = Math.min(savedSel.end, endNode.textContent?.length ?? 0);

        range.setStart(startNode, validStartOffset);
        range.setEnd(endNode, validEndOffset);
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (e) {
        // console.warn("Failed to restore selection:", e);
        // Fallback: place cursor at the end of the container
        const range = document.createRange();
        range.selectNodeContents(containerEl);
        range.collapse(false);
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
      }
    } else { // Fallback if nodes not found (e.g. structure changed too much)
        const range = document.createRange();
        range.selectNodeContents(containerEl);
        range.collapse(false); // collapse to end
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    // Ensure focus if it was lost
    if (document.activeElement !== containerEl) {
      // containerEl.focus(); // This might steal focus unintentionally sometimes
    }
  };


  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (isSpinning) {
        event.preventDefault();
        return;
    }
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text/plain');
    const linesFromPaste = pastedText.split(/\r\n?|\n/).map(line => line.trim()).filter(line => line.length > 0);

    if (linesFromPaste.length === 0) {
        if (pastedText.trim() !== '') addNotification("Đã dán nội dung trống.", 'info');
        return;
    }

    const editor = editableDivRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        isProgrammaticUpdateRef.current = true;
        onNamesChange([...currentNames, ...linesFromPaste]);
        addNotification(`Đã dán ${linesFromPaste.length} mục vào cuối danh sách.`, 'info');
        return;
    }

    const range = selection.getRangeAt(0);
    const { collapsed } = range;

    // Function to find the array index corresponding to a DOM node (item div)
    const getItemIndexFromNode = (node: Node | null): number => {
        if (!editor || !node) return -1;
        let currentItemDiv: HTMLDivElement | null = null;
        let tempNode: Node | null = node;
        while (tempNode && tempNode !== editor) {
            if (tempNode.parentElement === editor && tempNode instanceof HTMLDivElement) {
                currentItemDiv = tempNode;
                break;
            }
            tempNode = tempNode.parentElement;
        }
        return currentItemDiv ? Array.from(editor.children).indexOf(currentItemDiv) : -1;
    };
    
    let startIndex = -1;
    let endIndex = -1;
    let textBeforePaste = "";
    let textAfterPaste = "";

    const startContainerItemIndex = getItemIndexFromNode(range.startContainer);
    const endContainerItemIndex = getItemIndexFromNode(range.endContainer);

    if (startContainerItemIndex !== -1) { // Selection starts within a known item
        startIndex = startContainerItemIndex;
        const startItemText = currentNames[startIndex] || ""; // Fallback for safety
        if (!imageStore[startItemText]) { // Only split text items
             textBeforePaste = startItemText.substring(0, range.startOffset);
        } else { // Start is within an image item div, treat as inserting before/after
             textBeforePaste = ""; // Don't split image items
             if (range.startOffset > 0) startIndex++; // Cursor after image content
        }

        if (collapsed) { // Cursor insertion
            endIndex = startIndex;
            if (!imageStore[startItemText]) {
                textAfterPaste = startItemText.substring(range.startOffset);
            } else {
                textAfterPaste = ""; // Will insert after this image item
            }
        } else { // Selection replacement
            if (endContainerItemIndex !== -1 && endContainerItemIndex >= startIndex) {
                endIndex = endContainerItemIndex;
                const endItemText = currentNames[endIndex] || "";
                if (!imageStore[endItemText]) { // Only split text items
                    textAfterPaste = endItemText.substring(range.endOffset);
                } else {
                    textAfterPaste = ""; // Will insert after this image item
                    // if selection ends exactly at start of image, don't consider its text part
                    if(range.endOffset === 0) endIndex--; 
                }
            } else { // Selection spans outside or into unknown territory, less precise
                endIndex = startIndex;
                textAfterPaste = "";
            }
        }
    } else { // Selection start is not within a direct child, e.g. editor is empty or between divs
        const container = range.startContainer;
        if (container === editor && editor.children.length > 0) { // Cursor is directly in editor, between child divs
            let insertAtIndex = editor.children.length; // Default to end
            for (let i = 0; i < editor.children.length; i++) {
                if (range.startOffset <= Array.from(editor.childNodes).indexOf(editor.children[i] as ChildNode)) {
                    insertAtIndex = i;
                    break;
                }
            }
            startIndex = insertAtIndex;
            endIndex = insertAtIndex -1; // For splice to insert
        } else { // Editor is empty or unhandled case
            startIndex = 0;
            endIndex = -1; // Insert at the beginning
        }
    }

    const itemsToKeepBefore = currentNames.slice(0, Math.max(0, startIndex));
    const itemsToKeepAfter = currentNames.slice(Math.max(0, endIndex + 1));
    
    const combinedPastedItems: string[] = [];
    if (textBeforePaste.trim() !== '' || imageStore[currentNames[startIndex]]) {
        if(imageStore[currentNames[startIndex]] && startIndex <= endIndex && !collapsed) {
          // if the start item of a non-collapsed selection is an image, don't add its textBeforePaste
        } else if (imageStore[currentNames[startIndex]]) {
          combinedPastedItems.push(currentNames[startIndex]); // Keep image ID as is
        } else if (textBeforePaste.trim() !== ''){
           combinedPastedItems.push(textBeforePaste.trim());
        }
    }
    
    combinedPastedItems.push(...linesFromPaste);
    
    if (textAfterPaste.trim() !== '' || (endIndex >=0 && imageStore[currentNames[endIndex]] && endIndex >= startIndex && !collapsed)) {
         if(imageStore[currentNames[endIndex]] && endIndex >= startIndex && !collapsed) {
           // If the end item of a non-collapsed selection is an image, don't add textAfterPaste (it was already handled or is next)
         } else if (imageStore[currentNames[endIndex]]) {
            // This case might be complex if textAfterPaste was from an image.
            // Assuming if endIndex is an image, and textAfterPaste is empty, the image itself is preserved by itemsToKeepAfter if not deleted.
         } else if (textAfterPaste.trim() !== ''){
            combinedPastedItems.push(textAfterPaste.trim());
         }
    }


    const finalNames = [
        ...itemsToKeepBefore,
        ...combinedPastedItems.filter(name => imageStore[name] || name.trim() !== ''), // Filter out empty strings from split parts
        ...itemsToKeepAfter
    ];

    isProgrammaticUpdateRef.current = true;
    onNamesChange(finalNames);
    lastUserEditTimeRef.current = Date.now();

    if (collapsed) {
        addNotification(`Đã chèn ${linesFromPaste.length} mục.`, 'info');
    } else {
        const numReplaced = Math.max(0, endIndex - startIndex + 1);
        addNotification(`Đã thay thế ${numReplaced} mục bằng ${linesFromPaste.length} mục mới.`, 'info');
    }
    
    // Restore selection to end of pasted content
    requestAnimationFrame(() => {
        if (editableDivRef.current && selection) {
            const editorNow = editableDivRef.current;
            let focusNodeIndex = Math.max(0, startIndex) + (textBeforePaste.trim() !== '' ? 1:0) + linesFromPaste.length -1 ;
            if (imageStore[currentNames[startIndex]] && textBeforePaste === "") { // If start was image and we inserted after
                focusNodeIndex = Math.max(0, startIndex) + linesFromPaste.length;
            }


            focusNodeIndex = Math.min(editorNow.children.length - 1, Math.max(0, focusNodeIndex));

            if (focusNodeIndex >= 0 && editorNow.children[focusNodeIndex]) {
                const targetDiv = editorNow.children[focusNodeIndex] as HTMLElement;
                const newRange = document.createRange();
                
                // Attempt to place cursor at the very end of the content of the target div
                newRange.selectNodeContents(targetDiv);
                newRange.collapse(false); // false means collapse to end

                selection.removeAllRanges();
                selection.addRange(newRange);
                editorNow.focus();
            } else if (editorNow.children.length === 0 && finalNames.length === 0) { // Editor became empty
                 const newRange = document.createRange();
                 newRange.selectNodeContents(editorNow);
                 newRange.collapse(true); 
                 selection.removeAllRanges();
                 selection.addRange(newRange);
                 editorNow.focus();
            } else { // Fallback, e.g. pasted empty content over selection
                let targetChildIndex = Math.max(0, startIndex);
                targetChildIndex = Math.min(editorNow.children.length - 1, targetChildIndex);
                const targetChild = editorNow.children[targetChildIndex] as HTMLElement;
                if (targetChild) {
                    const newRange = document.createRange();
                    newRange.selectNodeContents(targetChild);
                    newRange.collapse(true); // To start of item
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
                editorNow.focus();
            }
        }
    });
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
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
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