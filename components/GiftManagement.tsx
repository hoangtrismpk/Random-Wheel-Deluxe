
import React, { useState } from 'react';
import type { GiftItem } from '../types'; // Import GiftItem type
import ConfirmationModal from './ConfirmationModal'; // Import ConfirmationModal
import { useNotification } from './NotificationContext'; // Import useNotification

interface GiftManagementProps {
  giftList: GiftItem[];
  setGiftList: React.Dispatch<React.SetStateAction<GiftItem[]>>;
  isSpinning: boolean;
}

const GiftManagement: React.FC<GiftManagementProps> = ({ giftList, setGiftList, isSpinning }) => {
  const [newGiftTitle, setNewGiftTitle] = useState('');
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftQuantity, setNewGiftQuantity] = useState<number | string>(1);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [showRemoveGiftConfirmModal, setShowRemoveGiftConfirmModal] = useState(false);
  const [giftToRemove, setGiftToRemove] = useState<GiftItem | null>(null);
  
  const { addNotification } = useNotification(); // Hook for notifications

  const handleAddGift = () => {
    const quantity = parseInt(String(newGiftQuantity), 10);
    if (!newGiftTitle.trim() || !newGiftName.trim() || isNaN(quantity) || quantity <= 0) {
      addNotification('Vui lòng nhập đầy đủ thông tin hợp lệ cho quà tặng (Tiêu đề, Tên quà, Số lượng > 0).', 'error');
      return;
    }

    const newGift: GiftItem = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: newGiftTitle.trim(),
      giftName: newGiftName.trim(),
      quantity: quantity,
      originalQuantity: quantity,
    };

    setGiftList(prevList => [...prevList, newGift]);
    addNotification(`Đã thêm quà: ${newGift.title} - ${newGift.giftName}`, 'success');
    setNewGiftTitle('');
    setNewGiftName('');
    setNewGiftQuantity(1);
  };

  const promptRemoveGift = (gift: GiftItem) => {
    setGiftToRemove(gift);
    setShowRemoveGiftConfirmModal(true);
  };

  const confirmRemoveGift = () => {
    if (giftToRemove) {
      setGiftList(prevList => prevList.filter(g => g.id !== giftToRemove.id));
      addNotification(`Đã xóa quà: ${giftToRemove.title}`, 'info');
    }
    setGiftToRemove(null);
  };


  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 0) return; 
    setGiftList(prevList =>
      prevList.map(gift =>
        gift.id === id ? { ...gift, quantity: newQuantity, originalQuantity: Math.max(gift.originalQuantity, newQuantity) } : gift
      )
    );
  };
  
  const handleOriginalQuantityChange = (id: string, newOriginalQuantity: number) => {
    if (newOriginalQuantity <= 0) return;
     setGiftList(prevList =>
        prevList.map(gift =>
            gift.id === id ? { ...gift, originalQuantity: newOriginalQuantity, quantity: Math.min(gift.quantity, newOriginalQuantity) } : gift
        )
    );
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, id: string) => {
    if (isSpinning) {
        event.preventDefault();
        return;
    }
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(id);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>, hoverId: string) => {
    event.preventDefault();
    if (draggedItemId && draggedItemId !== hoverId) {
      setDragOverItemId(hoverId);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
  };

  const handleDragLeave = (id: string) => {
    if (id === dragOverItemId) {
      setDragOverItemId(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');

    if (!sourceId || sourceId === targetId || !draggedItemId) {
      setDragOverItemId(null); 
      return;
    }

    const sourceIndex = giftList.findIndex(item => item.id === sourceId);
    const targetIndex = giftList.findIndex(item => item.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDragOverItemId(null);
      return;
    }

    const items = Array.from(giftList);
    const [movedItem] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, movedItem);
    
    setGiftList(items);
    setDragOverItemId(null); 
    addNotification('Đã cập nhật thứ tự danh sách quà.', 'info');
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };


  return (
    <>
      <div className="mt-4 p-4 border border-slate-700 rounded-lg bg-slate-800/50 space-y-4">
        <h3 className="text-lg font-semibold text-sky-400 mb-3 text-center">Quản Lý Danh Sách Quà Tặng</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 border border-slate-600 rounded-md">
          <div>
            <label htmlFor="giftTitle" className="block text-xs font-medium text-slate-400 mb-1">Tiêu đề (VD: Giải Nhất)</label>
            <input
              id="giftTitle"
              type="text"
              value={newGiftTitle}
              onChange={(e) => setNewGiftTitle(e.target.value)}
              placeholder="Giải Nhất"
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSpinning}
            />
          </div>
          <div>
            <label htmlFor="giftName" className="block text-xs font-medium text-slate-400 mb-1">Tên phần quà</label>
            <input
              id="giftName"
              type="text"
              value={newGiftName}
              onChange={(e) => setNewGiftName(e.target.value)}
              placeholder="iPhone 15 Pro Max"
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSpinning}
            />
          </div>
          <div>
            <label htmlFor="giftQuantity" className="block text-xs font-medium text-slate-400 mb-1">Số lượng</label>
            <input
              id="giftQuantity"
              type="number"
              value={newGiftQuantity}
              onChange={(e) => setNewGiftQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
              min="1"
              placeholder="1"
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSpinning}
            />
          </div>
          <button
            onClick={handleAddGift}
            disabled={isSpinning}
            className="sm:col-span-3 w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-60"
            aria-label="Thêm quà mới vào danh sách"
          >
            Thêm Quà
          </button>
        </div>

        {giftList.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-xs text-slate-400 text-center">Kéo thả để thay đổi thứ tự. Thứ tự từ trên xuống dưới sẽ được ưu tiên.</p>
            {giftList.map((gift, index) => (
              <div 
                key={gift.id}
                draggable={!isSpinning}
                onDragStart={(e) => handleDragStart(e, gift.id)}
                onDragEnter={(e) => handleDragEnter(e, gift.id)}
                onDragOver={handleDragOver}
                onDragLeave={() => handleDragLeave(gift.id)}
                onDrop={(e) => handleDrop(e, gift.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-md shadow transition-all duration-150
                  ${isSpinning ? '' : 'cursor-grab'}
                  ${draggedItemId === gift.id ? 'opacity-40 scale-95 cursor-grabbing' : ''}
                  ${dragOverItemId === gift.id && draggedItemId !== gift.id && draggedItemId !== null ? 'ring-2 ring-sky-400 ring-inset bg-slate-600/70' : 'bg-slate-700'}
                `}
                aria-grabbed={draggedItemId === gift.id}
              >
                <span className="text-slate-400 font-medium text-sm w-6 text-center select-none">{index + 1}.</span>
                <div className="flex-grow select-none min-w-0"> {/* Added min-w-0 here */}
                  <p className="text-sm font-semibold text-slate-100 truncate" title={gift.title}>{gift.title}</p>
                  <p className="text-xs text-slate-300 truncate" title={gift.giftName}>{gift.giftName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 select-none">SL gốc:</span>
                  <input
                      type="number"
                      value={gift.originalQuantity}
                      onChange={(e) => handleOriginalQuantityChange(gift.id, Math.max(1, parseInt(e.target.value,10)))}
                      min="1"
                      className="w-12 p-1 text-xs text-center border border-slate-600 rounded bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500"
                      disabled={isSpinning}
                      aria-label={`Số lượng ban đầu của ${gift.giftName}`}
                  />
                  <span className="text-xs text-slate-400 select-none">Còn:</span>
                  <input 
                      type="number"
                      value={gift.quantity}
                      onChange={(e) => handleQuantityChange(gift.id, Math.max(0, parseInt(e.target.value,10)))}
                      min="0"
                      max={gift.originalQuantity}
                      className="w-12 p-1 text-xs text-center border border-slate-600 rounded bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500"
                      disabled={isSpinning}
                      aria-label={`Số lượng còn lại của ${gift.giftName}`}
                  />
                </div>
                <button
                  onClick={() => promptRemoveGift(gift)}
                  disabled={isSpinning}
                  className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xl p-0.5 w-7 h-7 flex items-center justify-center leading-none focus:outline-none focus:ring-1 focus:ring-red-300 focus:ring-offset-1 focus:ring-offset-slate-700 rounded-full transition-colors"
                  aria-label={`Xóa ${gift.title} - ${gift.giftName}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        {giftList.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-2">Chưa có quà nào được thêm.</p>
        )}
      </div>
      {giftToRemove && (
        <ConfirmationModal
          isOpen={showRemoveGiftConfirmModal}
          onClose={() => {
            setShowRemoveGiftConfirmModal(false);
            setGiftToRemove(null);
          }}
          onConfirm={confirmRemoveGift}
          title="Xác nhận xóa quà tặng"
          message={
            <>
              Bạn có chắc chắn muốn xóa quà tặng <strong className="text-pink-400">{giftToRemove.title} - {giftToRemove.giftName}</strong> không?
              <br />
              Hành động này không thể hoàn tác.
            </>
          }
          confirmButtonText="Xóa Quà"
          confirmButtonVariant="danger"
        />
      )}
    </>
  );
};

export default GiftManagement;