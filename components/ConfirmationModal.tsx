import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Xác nhận",
  cancelButtonText = "Hủy",
  confirmButtonVariant = 'primary',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose(); // Automatically close modal on confirm
  };

  let confirmButtonClass = "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
  if (confirmButtonVariant === 'danger') {
    confirmButtonClass = "bg-red-600 hover:bg-red-700 focus:ring-red-500";
  }


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmationModalTitle"
      aria-describedby="confirmationModalDescription"
      className="fixed inset-0 flex items-center justify-center p-4 z-[70] bg-black bg-opacity-75 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="w-full max-w-md rounded-lg shadow-xl overflow-hidden bg-slate-800 transform transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div id="confirmationModalTitle" className={`flex items-center justify-between p-4 ${confirmButtonVariant === 'danger' ? 'bg-red-700' : 'bg-sky-700'} text-white`}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold leading-none hover:opacity-75 transition-opacity"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        <div className="p-6 text-slate-300">
          <div id="confirmationModalDescription" className="text-sm">
            {message}
          </div>
        </div>

        <div className="px-6 py-4 flex justify-end items-center gap-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-colors"
            aria-label={cancelButtonText}
          >
            {cancelButtonText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white ${confirmButtonClass} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors`}
            aria-label={confirmButtonText}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;