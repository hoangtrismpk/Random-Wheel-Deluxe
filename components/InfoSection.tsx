import React, { useState } from 'react';

const InfoIcon: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3 flex-shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#334155" />
      <path d="M12 2a10 10 0 0 0-7.53 16.59" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M19.53 18.59A10 10 0 0 0 12 2" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M4.47 18.59A10 10 0 0 0 19.53 18.59" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, children }) => (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg flex flex-col border border-slate-700/50">
      <h2 className="flex items-center text-xl font-semibold text-slate-100 mb-4">
        {icon}
        <span>{title}</span>
      </h2>
      <div className="text-slate-300 space-y-4 flex-grow flex flex-col">
        {children}
      </div>
    </div>
);

const InfoSection: React.FC = () => {
  const [isWhatIsItExpanded, setIsWhatIsItExpanded] = useState(false);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [isFairnessExpanded, setIsFairnessExpanded] = useState(false);
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false);

  // Updated prose classes to match user's CSS request for padding and font-weight.
  const proseClasses = "prose prose-invert text-[17px] leading-[29px] max-w-none prose-p:py-[10px] prose-p:m-0 prose-ul:py-[10px] prose-ul:m-0 prose-ol:py-[10px] prose-ol:m-0 prose-li:p-[10px] prose-li:list-inside prose-li:m-0 prose-headings:py-[10px] prose-headings:font-extrabold prose-headings:text-slate-100 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline";

  return (
    <section className="w-full max-w-screen-xl mx-auto py-16 px-4 md:px-8" aria-labelledby="info-section-title">
        <h2 id="info-section-title" className="sr-only">Thông tin và Tính năng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <InfoCard icon={<InfoIcon />} title="Vòng quay may mắn là gì? Ai nên dùng?">
                <>
                    <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isWhatIsItExpanded ? 'max-h-[9999px]' : 'max-h-48'}`}>
                        <div className={proseClasses}>
                            <p><strong>Vòng quay may mắn</strong> (còn gọi là bánh xe may mắn, spin wheel, hay vòng quay random) là một công cụ trực tuyến mô phỏng trò chơi vòng quay truyền thống. Người dùng có thể nhập vào danh sách các lựa chọn (tên, vật phẩm, nhiệm vụ…), và công cụ sẽ quay ngẫu nhiên để chọn ra một kết quả duy nhất.</p>
                            <p>Đây là một công cụ cực kỳ linh hoạt, phù hợp cho nhiều đối tượng và mục đích khác nhau:</p>
                            <ul>
                                <li><strong>Giáo viên & người đào tạo:</strong> Dùng để gọi tên học sinh, chia nhóm, hoặc tạo minigame trong lớp học.</li>
                                <li><strong>Nhà tổ chức sự kiện & streamer:</strong> Tạo hoạt động bốc thăm trúng thưởng, quay số may mắn để tăng tương tác.</li>
                                <li><strong>Doanh nghiệp & cửa hàng:</strong> Triển khai các chương trình khuyến mãi, tặng quà ngẫu nhiên cho khách hàng.</li>
                                <li><strong>Nhóm bạn & gia đình:</strong> Quyết định ngẫu nhiên các hoạt động như "Ăn gì tối nay?", "Xem phim gì?", hoặc chơi các trò chơi sai khiến.</li>
                                <li><strong>Cá nhân:</strong> Giúp đưa ra quyết định nhanh chóng khi phân vân giữa nhiều lựa chọn.</li>
                            </ul>

                            <hr className="!my-4 border-slate-700" />

                            <h2>Ứng dụng vòng quay may mắn trong đời sống & kinh doanh</h2>
                            
                            <h3>1) Giáo dục: Tăng tương tác lớp học với vòng quay may mắn miễn phí</h3>
                            <p>Vòng quay may mắn giúp giáo viên gọi ngẫu nhiên học sinh trả lời câu hỏi, tạo cảm giác khách quan và hứng thú. Bạn có thể tạo các vòng quay theo từng lớp, từng nhóm học viên hoặc từng chủ đề để đổi mới không khí.</p>
                            <ul>
                                <li><strong>Gọi tên ngẫu nhiên:</strong> nhập danh sách học sinh → bấm QUAY → công bố người trả lời ngay trên màn hình.</li>
                                <li><strong>Khen thưởng theo buổi/tuần:</strong> thêm phần thưởng nhỏ (sticker, sao thi đua, điểm cộng) vào vòng quay trúng thưởng để khích lệ.</li>
                                <li><strong>Trung tâm ngoại ngữ:</strong> dùng vòng quay minigame quay quà như sách, bút, đồ chơi giáo dục, đồ dùng học tập, voucher khóa học → tăng tương tác 2 chiều giữa trung tâm & học viên.</li>
                            </ul>
                            <p><strong>Tip thao tác nhanh:</strong> Nhấn mũi tên cạnh số thứ tự để mở phần nhập chi tiết câu hỏi, chỉnh sửa trước khi quay. Cách này rất tiện khi bạn có ngân hàng câu hỏi và muốn random ngay tại lớp.</p>
                            <p><strong>Gợi ý triển khai:</strong> Tạo chuyên mục “vòng quay may mắn miễn phí cho giáo viên” và hướng dẫn học viên tự thêm tên trước giờ học để tiết kiệm thời gian.</p>
                            
                            <h3>2) Trò chơi & giải trí: vòng quay trúng thưởng làm nóng mọi cuộc vui</h3>
                            <p>Trong party, offline cộng đồng hay buổi họp mặt, bánh xe may rủi luôn là điểm nhấn:</p>
                            <ul>
                                <li><strong>Bốc thăm trúng thưởng:</strong> “quay là trúng” quà lưu niệm, voucher, code giảm giá.</li>
                                <li><strong>Game “vòng quay sai khiến”:</strong> giao nhiệm vụ ngẫu nhiên → vui – công bằng – dễ tổ chức.</li>
                                <li><strong>Tiệc/bàn nhậu:</strong> dùng vòng quay ngẫu nhiên để quyết định ai uống bia/rượu hay ăn “món đặc biệt”.</li>
                            </ul>
                            <p><strong>Mẹo:</strong> Kết hợp âm thanh quay và gradient màu để tạo hiệu ứng hồi hộp, giữ người chơi tập trung đến giây cuối.</p>

                            <h3>3) Quyết định cá nhân: vòng quay quyết định cho lựa chọn khách quan</h3>
                            <p>Khi phân vân nhiều phương án, spin wheel random là cách thú vị để ra quyết định nhanh – công bằng:</p>
                            <ul>
                                <li>Đặt tên cho con / thú cưng</li>
                                <li>Chọn điểm du lịch / lịch trình cuối tuần</li>
                                <li>Ăn gì tối nay / chọn nhà hàng</li>
                            </ul>
                            <p>Nhập mỗi lựa chọn một dòng, bấm QUAY – mọi do dự biến thành trải nghiệm vui vẻ.</p>
                            
                            <h3>4) Kinh doanh: Kích hoạt khuyến mãi bằng vòng quay may mắn</h3>
                            <p>Thay vì khuyến mãi cố định, hãy để khách tự quay số may mắn để nhận quà ngẫu nhiên. Vòng quay trúng thưởng tạo cao trào cảm xúc, tăng tỉ lệ tương tác & chốt đơn.</p>
                            <ul>
                                <li><strong>Tại cửa hàng:</strong> khách check-in/điền form → nhận 1 lượt quay (quà: voucher, phụ kiện, freeship…).</li>
                                <li><strong>Livestream bán hàng:</strong> yêu cầu comment từ khóa để nhận lượt quay → tăng view & watch time.</li>
                                <li><strong>Hội chợ/activation:</strong> dựng booth với vòng quay may mắn để thu hút đám đông & thu lead.</li>
                            </ul>
                            <p><strong>Ví dụ kịch bản (bán lẻ/laptop):</strong> Thay vì tặng quà cố định, thiết kế các bậc phần thưởng (balo, chuột, bàn di, voucher tiền mặt…). Khách tự tay quay để nhận quà → cảm giác “mình may mắn” mạnh hơn, phấn khích hơn và dễ chốt tại chỗ.</p>
                            
                            <h3>5) Tổ chức sự kiện: Khuấy động bằng vòng quay trúng thưởng</h3>
                            <p>Ở sự kiện đông người, vòng quay may mắn là “điểm rơi cảm xúc”:</p>
                            <ul>
                                <li><strong>Tạo khoảnh khắc chờ đợi:</strong> mọi ánh mắt đổ dồn vào bánh xe, tăng khả năng ghi nhớ chương trình.</li>
                                <li><strong>Phân bổ quà minh bạch:</strong> hiển thị lịch sử trúng thưởng công khai, tạo niềm tin cho người tham dự.</li>
                                <li><strong>Kết hợp sân khấu & màn hình lớn:</strong> âm thanh + visual giúp “bắt” đám đông ngay lập tức.</li>
                            </ul>
                        </div>
                        {!isWhatIsItExpanded && (
                            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsWhatIsItExpanded(!isWhatIsItExpanded)}
                        className="text-blue-400 hover:underline mt-auto pt-2 text-sm font-semibold self-start"
                        aria-expanded={isWhatIsItExpanded}
                    >
                        {isWhatIsItExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                </>
            </InfoCard>

            <InfoCard icon={<InfoIcon />} title="Tính năng chi tiết">
                <>
                    <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isFeaturesExpanded ? 'max-h-[9999px]' : 'max-h-48'}`}>
                        <div className={proseClasses}>
                            <h2>1) Chức năng cơ bản & nhập liệu</h2>
                            <ul>
                                <li><strong>Nhập tên hoặc mục:</strong> Tab “Nhập Liệu” → dán mỗi mục một dòng. Vòng quay cập nhật real-time khi nhập.</li>
                                <li><strong>Thêm ảnh:</strong> Nhấn “Thêm ảnh” → chọn PNG/JPG/WEBP/GIF (≤ 2MB/ảnh). Ảnh được xem như một mục để quay.</li>
                                <li><strong>Trộn danh sách:</strong> “Trộn danh sách” để xáo ngẫu nhiên toàn bộ mục (tên & ảnh).</li>
                                <li><strong>Sắp xếp danh sách:</strong> “Sắp xếp” lần 1 A–Z, lần 2 Z–A; nút hiển thị trạng thái (vd. A–Z ↓).</li>
                                <li><strong>Quay vòng quay:</strong> Bấm nút “QUAY!” lớn màu xanh hoặc click trực tiếp vào vòng quay.</li>
                            </ul>

                            <h2>2) Tùy chỉnh vòng quay (đẹp – đúng brand – dễ nhớ)</h2>
                             <ul>
                                <li><strong>Logo trung tâm:</strong> “Chọn Logo Trung Tâm” (upload/URL). Có nút “Xóa Logo Trung Tâm” khi cần.</li>
                                <li><strong>Ảnh nền & Màu nền:</strong> Thay thế màu mặc định của múi bằng ảnh, màu đơn, hoặc gradient (linear/radial).</li>
                                <li><strong>Màu chữ vòng quay:</strong> Đổi màu text trên từng múi để tăng tương phản – dễ đọc.</li>
                            </ul>

                             <h2>3) Tùy chỉnh giao diện chung (🎨)</h2>
                             <ul>
                                <li><strong>Nội dung & Màu sắc tiêu đề:</strong> Sửa text và áp dụng màu đơn hoặc gradient cho headline.</li>
                                <li><strong>Màu nền ứng dụng:</strong> Đổi nền toàn trang bằng màu đơn/gradient (đồng bộ visual).</li>
                            </ul>

                             <h2>4) Tùy chọn quay nâng cao</h2>
                             <ul>
                                <li><strong>Trước khi quay:</strong> Quản lý danh sách quà tặng (ưu tiên quay theo thứ tự) và tăng tỉ lệ thắng cho người cụ thể.</li>
                                <li><strong>Trong khi quay:</strong> Điều chỉnh thời gian quay (5-60s) và chọn/tải lên âm thanh riêng (MP3/WAV/OGG, ≤ 2MB).</li>
                                <li><strong>Sau khi quay:</strong> Bật chế độ tự động trộn danh sách hoặc tự động xóa người đã trúng thưởng để đảm bảo công bằng.</li>
                            </ul>

                             <h2>5) Quản lý kết quả</h2>
                             <ul>
                                <li><strong>Xem lịch sử:</strong> Lưu lại mọi người chiến thắng, được nhóm theo giải thưởng nếu có.</li>
                                <li><strong>Sao chép & Xóa:</strong> Sao chép toàn bộ lịch sử sang Excel/Sheets chỉ với một cú nhấp, hoặc xóa lịch sử với xác nhận.</li>
                            </ul>

                            <p className="!pt-4 !mt-4 !border-t !border-slate-700/50">
                                <strong className="text-amber-400">Tip minh bạch:</strong> Khi public, hãy công bố thể lệ, cách chọn người chơi, cách trao quà; bật tự xóa người trúng để thể hiện công bằng.
                            </p>
                        </div>
                        {!isFeaturesExpanded && (
                            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                        className="text-blue-400 hover:underline mt-auto pt-2 text-sm font-semibold self-start"
                        aria-expanded={isFeaturesExpanded}
                        aria-controls="detailed-features-content"
                    >
                        {isFeaturesExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                </>
            </InfoCard>

            <InfoCard icon={<InfoIcon />} title="Vòng quay có thể gian lận không?">
                <>
                    <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isFairnessExpanded ? 'max-h-[9999px]' : 'max-h-48'}`}>
                        <div className={proseClasses}>
                           <p>
                                Không có chức năng nào để xác định trước kết quả. Khi bạn nhấp vào vòng quay, nó sẽ tăng tốc trong một giây, sau đó được đặt ở một góc quay ngẫu nhiên từ 0 đến 360 độ, và cuối cùng giảm tốc rồi dừng lại. Quá trình này hoàn toàn ngẫu nhiên.
                            </p>
                            <p><a href="#">Tìm hiểu về tính ngẫu nhiên</a></p>
                        </div>
                        {!isFairnessExpanded && (
                            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsFairnessExpanded(!isFairnessExpanded)}
                        className="text-blue-400 hover:underline mt-auto pt-2 text-sm font-semibold self-start"
                        aria-expanded={isFairnessExpanded}
                    >
                        {isFairnessExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                </>
            </InfoCard>
            
            <InfoCard icon={<InfoIcon />} title="Dữ liệu của tôi có riêng tư không?">
                 <>
                    <div className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isPrivacyExpanded ? 'max-h-[9999px]' : 'max-h-48'}`}>
                        <div className={proseClasses}>
                            <p>
                                Chúng tôi cam kết bảo vệ và tôn trọng quyền riêng tư cũng như bảo mật dữ liệu của bạn. Chúng tôi tuân thủ các quy định và áp dụng các tiêu chuẩn tốt nhất trong ngành. Mọi dữ liệu bạn nhập đều được lưu trữ ngay trên trình duyệt của bạn.
                            </p>
                            <p><a href="#">Cách chúng tôi bảo vệ bạn</a></p>
                        </div>
                         {!isPrivacyExpanded && (
                            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsPrivacyExpanded(!isPrivacyExpanded)}
                        className="text-blue-400 hover:underline mt-auto pt-2 text-sm font-semibold self-start"
                        aria-expanded={isPrivacyExpanded}
                    >
                        {isPrivacyExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                </>
            </InfoCard>

        </div>
    </section>
  );
};

export default InfoSection;