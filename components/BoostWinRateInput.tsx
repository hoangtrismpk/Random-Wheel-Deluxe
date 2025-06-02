
import React, { useState, useEffect, useMemo } from 'react';
import type { BoostedParticipant } from '../types';
import type { ImageStore } from '../App';
import { useNotification } from './NotificationContext'; // Import useNotification
import ConfirmationModal from './ConfirmationModal'; // Import ConfirmationModal

interface BoostWinRateInputProps {
  boostedParticipants: BoostedParticipant[];
  setBoostedParticipants: React.Dispatch<React.SetStateAction<BoostedParticipant[]>>;
  isSpinning: boolean;
  namesOnWheel: string[];
  imageStore: ImageStore;
}

const BoostWinRateInput: React.FC<BoostWinRateInputProps> = ({
  boostedParticipants,
  setBoostedParticipants,
  isSpinning,
  namesOnWheel,
  imageStore,
}) => {
  const [newName, setNewName] = useState('');
  const [newPercentage, setNewPercentage] = useState<string>('');
  const { addNotification } = useNotification();

  const [showRemoveBoostConfirmModal, setShowRemoveBoostConfirmModal] = useState(false);
  const [boostParticipantToRemove, setBoostParticipantToRemove] = useState<BoostedParticipant | null>(null);

  const wheelDisplayNames = useMemo(() => {
    return namesOnWheel.map(nameOrId => (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase());
  }, [namesOnWheel, imageStore]);

  const handleAddParticipant = () => {
    const nameTrimmed = newName.trim();
    const percentageNum = parseInt(newPercentage, 10);

    if (!nameTrimmed) {
      addNotification('Vui lòng nhập tên người tham gia.', 'error');
      return;
    }
    if (isNaN(percentageNum) || percentageNum < 0) {
      addNotification('Tỉ lệ thắng phải là một số không âm.', 'error');
      setNewPercentage('');
      return;
    }
    if (percentageNum >= 100) {
        addNotification('Tỉ lệ thắng cho một người không được lớn hơn hoặc bằng 100%.', 'error');
        return;
    }
    
    if (boostedParticipants.some(p => p.name.toLowerCase() === nameTrimmed.toLowerCase())) {
        addNotification(`"${nameTrimmed}" đã có trong danh sách ưu tiên tỉ lệ thắng.`, 'error');
        return;
    }

    const currentTotalPercentage = boostedParticipants.reduce((sum, p) => sum + p.percentage, 0);
    if (currentTotalPercentage + percentageNum >= 100) {
        addNotification('Tổng tỉ lệ thắng của tất cả người tham gia không được lớn hơn hoặc bằng 100%.', 'error');
        return;
    }

    setBoostedParticipants(prev => [
      ...prev,
      {
        id: `boost_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: nameTrimmed,
        percentage: percentageNum,
      },
    ]);
    addNotification(`Đã thêm "${nameTrimmed}" với ${percentageNum}% tỉ lệ thắng.`, 'success');
    setNewName('');
    setNewPercentage('');
  };

  const promptRemoveParticipant = (participant: BoostedParticipant) => {
    setBoostParticipantToRemove(participant);
    setShowRemoveBoostConfirmModal(true);
  };

  const confirmRemoveBoostParticipant = () => {
    if (boostParticipantToRemove) {
      setBoostedParticipants(prev => prev.filter(p => p.id !== boostParticipantToRemove.id));
      addNotification(`Đã xóa "${boostParticipantToRemove.name}" khỏi danh sách tỉ lệ.`, 'info');
    }
    setBoostParticipantToRemove(null); 
    // Modal will close itself via its onConfirm prop
  };


  const handlePercentageChange = (id: string, value: string) => {
    const newPerc = parseInt(value, 10);
    // const participantToUpdate = boostedParticipants.find(p => p.id === id);
    // if (!participantToUpdate) return;
    
    setBoostedParticipants(prevList => {
        const itemToUpdate = prevList.find(p => p.id === id);
        if (!itemToUpdate) return prevList;

        const otherItemsTotal = prevList
            .filter(p => p.id !== id)
            .reduce((sum, p) => sum + p.percentage, 0);

        if (isNaN(newPerc) || newPerc < 0) { // Allow 0, but not negative or NaN
            // If user clears input or enters invalid, revert to 0 or previous valid value
            // For now, setting to 0 if invalid number (like empty string or negative)
            addNotification('Tỉ lệ phải là số không âm. Đặt thành 0%.', 'info');
            return prevList.map(p => (p.id === id ? { ...p, percentage: 0 } : p));
        }
        if (newPerc >= 100) {
            addNotification('Tỉ lệ thắng cho một người không được lớn hơn hoặc bằng 100%.', 'error');
            return prevList; // Keep current valid state
        }
        if (otherItemsTotal + newPerc >= 100) {
            addNotification('Tổng tỉ lệ thắng của tất cả người tham gia không được lớn hơn hoặc bằng 100%.', 'error');
            return prevList; // Keep current valid state
        }
        
        return prevList.map(p => (p.id === id ? { ...p, percentage: newPerc } : p));
    });
  };
  
  const totalConfiguredPercentage = boostedParticipants.reduce((sum, p) => sum + p.percentage, 0);

  const getParticipantValidation = (participant: BoostedParticipant, currentIndex: number) => {
    let isIndividuallyInvalid = participant.percentage >= 100;
    let causesTotalInvalid = false;

    let tempTotal = 0;
    // Check if this item, or any previous items in their current state, make the sum invalid up to this point
    for (let i = 0; i < boostedParticipants.length; i++) {
        const p = boostedParticipants[i];
        if (p.percentage < 100) { 
            tempTotal += p.percentage;
            if (tempTotal >= 100) {
                // If the sum becomes invalid, and the current item is the one being checked,
                // or one of the items up to the current one in the list that caused it
                if (i === currentIndex && p.id === participant.id) { // This item itself caused the sum to go >=100
                    causesTotalInvalid = true;
                    break;
                } else if (boostedParticipants.findIndex(bp => bp.id === participant.id) <= i) {
                    // If the current participant is at or before the item that pushed total >= 100
                    // and it's this specific participant's value causing it (or contributing significantly)
                     if (boostedParticipants.findIndex(bp => bp.id === participant.id) === i && p.percentage > 0) {
                       causesTotalInvalid = true;
                       break;
                     } else if (boostedParticipants.findIndex(bp => bp.id === participant.id) < i && participant.percentage > 0){
                        // If a *previous* item caused the overflow, but *this* item has a percentage,
                        // it's also considered part of the problem if *this* item has a non-zero percentage
                        // This logic might be too aggressive. The core idea is: if adding up to item `i`
                        // causes total >= 100, then item `i` (if it has a non-zero percentage) is invalid.
                        // Let's simplify: an item is "causing total invalid" if *its own percentage*
                        // makes the sum invalid, considering other valid percentages.
                        const sumExcludingCurrent = boostedParticipants
                          .filter((item, idx) => idx < i && item.percentage < 100) // Sum previous *valid* percentages
                          .reduce((s, item) => s + item.percentage, 0);
                        if (sumExcludingCurrent + p.percentage >= 100 && p.id === participant.id) {
                            causesTotalInvalid = true;
                            break;
                        }
                     }
                }
            }
        } else if (p.id === participant.id) { // Current participant has >= 100%
             isIndividuallyInvalid = true; 
             causesTotalInvalid = true; 
             break;
        }
    }
     // Simpler check for `causesTotalInvalid` specifically for the current participant
    if (!isIndividuallyInvalid) {
        const sumOfOthers = boostedParticipants
            .filter(p => p.id !== participant.id && p.percentage < 100)
            .reduce((s, item) => s + item.percentage, 0);
        if (sumOfOthers + participant.percentage >= 100 && participant.percentage > 0) {
            causesTotalInvalid = true;
        }
    }


    return { isIndividuallyInvalid, causesTotalInvalid };
  };


  return (
    <>
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-sky-400 mb-2 text-center">Thêm người và tỉ lệ thắng</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end p-3 border border-slate-600 rounded-md">
          <div>
            <label htmlFor="boostName" className="block text-xs font-medium text-slate-400 mb-1">Tên người tham gia</label>
            <input
              id="boostName"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSpinning}
            />
          </div>
          <div>
            <label htmlFor="boostPercentage" className="block text-xs font-medium text-slate-400 mb-1">Tỉ lệ thắng (%)</label>
            <input
              id="boostPercentage"
              type="number"
              value={newPercentage}
              onChange={(e) => setNewPercentage(e.target.value)}
              placeholder="Ví dụ: 40"
              min="0"
              max="99"
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              disabled={isSpinning}
            />
          </div>
          <button
            onClick={handleAddParticipant}
            disabled={isSpinning}
            className="sm:col-span-2 w-full mt-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-60"
            aria-label="Thêm người vào danh sách tăng tỉ lệ thắng"
          >
            Thêm Người
          </button>
        </div>

        {boostedParticipants.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {boostedParticipants.map((p, index) => {
              const { isIndividuallyInvalid, causesTotalInvalid } = getParticipantValidation(p, index);
              const isVisuallyInvalid = isIndividuallyInvalid || (causesTotalInvalid && p.percentage > 0) ;
              const isOnWheel = wheelDisplayNames.includes(p.name.trim().toLowerCase());

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-md shadow bg-slate-700/80
                    ${isVisuallyInvalid ? 'ring-2 ring-red-500 ring-inset' : ''}
                    ${!isOnWheel && p.name.trim() !== '' ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex-grow min-w-0">
                    <p 
                      className={`text-sm font-semibold truncate ${isVisuallyInvalid ? 'text-red-400 line-through' : 'text-slate-100'}`} 
                      title={p.name}
                    >
                      {p.name} {!isOnWheel && p.name.trim() !== '' && <span className="text-xs text-yellow-400">(Ngoài vòng quay)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={p.percentage.toString()} 
                      onChange={(e) => handlePercentageChange(p.id, e.target.value)}
                      min="0"
                      max="99"
                      className={`w-16 p-1 text-sm text-center border border-slate-600 rounded bg-slate-900 
                                  ${isVisuallyInvalid ? 'text-red-400 line-through' : 'text-slate-200'} 
                                  focus:ring-1 focus:ring-sky-500`}
                      disabled={isSpinning}
                      aria-label={`Tỉ lệ thắng cho ${p.name}`}
                    />
                    <span className={`text-sm ${isVisuallyInvalid ? 'text-red-400 line-through' : 'text-slate-300'}`}>%</span>
                  </div>
                  <button
                    onClick={() => promptRemoveParticipant(p)}
                    disabled={isSpinning}
                    className="text-red-500 hover:text-red-400 disabled:opacity-50 font-bold text-xl p-0.5 w-7 h-7 flex items-center justify-center leading-none focus:outline-none focus:ring-1 focus:ring-red-300 focus:ring-offset-1 focus:ring-offset-slate-700 rounded-full transition-colors"
                    aria-label={`Xóa ${p.name} khỏi danh sách tỉ lệ thắng`}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        )}
         {boostedParticipants.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-2">Chưa có ai trong danh sách tăng tỉ lệ.</p>
          )}

        <div className="mt-3 text-center">
          <p className={`text-sm font-medium ${totalConfiguredPercentage >= 100 ? 'text-red-400' : 'text-slate-300'}`}>
            Tổng tỉ lệ đã gán: {totalConfiguredPercentage}%
            {totalConfiguredPercentage >= 100 && " (Không hợp lệ, phải < 100%)"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
              {totalConfiguredPercentage < 100 ? 
                  `Còn lại ${100 - totalConfiguredPercentage}% sẽ chia đều cho những người khác trên vòng quay.` 
                  : "Sửa lại tỉ lệ để tính năng có hiệu lực."}
          </p>
           <p className="text-xs text-slate-500 mt-1">Lưu ý: Tên phải khớp với tên trên vòng quay (không phân biệt hoa thường) để có hiệu lực.</p>
        </div>
      </div>
      {boostParticipantToRemove && (
        <ConfirmationModal
          isOpen={showRemoveBoostConfirmModal}
          onClose={() => {
            setShowRemoveBoostConfirmModal(false);
            setBoostParticipantToRemove(null);
          }}
          onConfirm={confirmRemoveBoostParticipant}
          title="Xác nhận xóa tỉ lệ thắng"
          message={
            <>
              Bạn có chắc chắn muốn xóa{" "}
              <strong className="text-pink-400">{boostParticipantToRemove.name}</strong>
              {` (${boostParticipantToRemove.percentage}%) `}
              khỏi danh sách tăng tỉ lệ thắng không?
            </>
          }
          confirmButtonText="Xóa Tỉ Lệ"
          confirmButtonVariant="danger"
        />
      )}
    </>
  );
};

export default BoostWinRateInput;
