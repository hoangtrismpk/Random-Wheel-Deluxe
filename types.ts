
export interface WheelSegment {
  text: string;
  color: string;
}

// Định nghĩa cho một mục trong danh sách quà tặng
export interface GiftItem {
  id: string; // ID duy nhất cho React keys và thao tác
  title: string; // Ví dụ: Giải Nhất, Giải Nhì
  giftName: string; // Ví dụ: iPhone 15, Voucher 100k
  quantity: number; // Số lượng hiện tại còn lại
  originalQuantity: number; // Số lượng ban đầu để hiển thị
}

// Định nghĩa chi tiết về người chiến thắng để sử dụng trong lịch sử
export interface WinnerDetails {
  id: string; // ID gốc nameOrId từ những người tham gia vòng quay (có thể là text hoặc ID hình ảnh)
  displayName: string; // Tên để hiển thị (text hoặc tên tệp)
  isImage: boolean;
  imageDataURL?: string;
}

// Mục lịch sử cho giải thưởng từ danh sách quà
export interface GiftAwardHistoryItem {
  type: 'gift';
  giftTitle: string;
  giftAwardedName: string; // Tên của giải thưởng cụ thể
  winner: WinnerDetails;
  timestamp: number;
}

// Mục lịch sử cho người chiến thắng tiêu chuẩn (không có danh sách quà)
export interface NonGiftWinnerHistoryItem {
  type: 'standard';
  winner: WinnerDetails;
  timestamp: number;
}

// Kiểu kết hợp cho một mục trong lịch sử người chiến thắng
export type WinnerHistoryItem = GiftAwardHistoryItem | NonGiftWinnerHistoryItem;
