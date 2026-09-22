# Steal a Happiness — luật v3, phòng trực tuyến

## Phạm vi
Route /game mặc định mở tạo/vào phòng và sảnh chờ, 2–8 người. Chủ phòng bắt đầu cho tất cả.
Java API tại dự án ../steal-a-happiness, H2 lưu bền mặc định. FE proxy /api/backend tới GAME_API_URL (mặc định http://127.0.0.1:8080).
Chạy backend theo README của nó; FE: node node_modules/next/dist/bin/next dev --port 3000.
Token khách lưu sessionStorage riêng từng tab: tải lại tiếp tục; đóng tab có thể mất quyền vào lại.
Nút chơi thử với bot vẫn dùng engine FE, không cần API. Bản lưu mock cũ không nạp bằng luật v3.

## Nhịp chơi
Ván 480 giây, bốn mùa 120 giây. Bắt đầu với ba mầm; vườn mẫu trong chế độ bot có cây chín, 3 gỗ, hai thẻ và điểm mẫu.
Mọi loại cây mở ngay: Độc lập 45s/120đ, Tự do 28s/50đ, Hạnh phúc 16s/20đ.
Các mốc lịch sử trên thẻ mùa là kể chuyện; không phải mô phỏng niên đại chính xác bằng tốc độ game.

## Điểm và trộm trực tiếp
Cân bằng = round(min(số quả đã hái)/max(số quả đã hái) × 100); chưa hái gì = 0.
Hệ số = 0.5 + cân bằng × 0.015; từ 0.5 đến 2.
Điểm Tổng = round(điểm gốc quy đổi × hệ số), một bảng duy nhất. Bằng điểm cùng hạng.
Hái quả cộng giá trị còn lại vào điểm gốc và +1 số quả của loại đó.
Quả đổi gỗ hoặc bị giảm về 0 không cộng số quả để tránh tăng cân bằng miễn phí.

**PvP lấy Điểm Tổng, kể cả điểm có nguồn gốc từ Độc lập.**
Ví dụ victim 1.000đ, attacker 500đ: trộm 20% chuyển 200đ, còn 800 và 700.
Để giữ công thức một hệ số mà không nhân hai lần số điểm chuyển, engine đổi điểm gốc của mỗi người thành Điểm Tổng mới / hệ số riêng của họ.
Điểm gốc sau PvP vì thế có thể là số thập phân, không còn bằng tổng thô giá trị quả.
Nếu hệ số thay đổi do lần hái sau, toàn bộ điểm gốc quy đổi chịu hệ số mới.
UI và hướng dẫn gọi rõ là “điểm gốc quy đổi”. Đây là quyết định nhất quán với yêu cầu lấy trực tiếp Điểm Tổng.

## PvP — src/lib/game/pvp.ts
Mỗi người 1 lần chủ động mỗi mùa từ mùa 2. Mùa 1 chỉ trồng và xây. Lượt dùng ngay khi trận được tạo, không hoàn khi sai; không tích sang mùa.
Hai người cùng 1 câu, 8 giây, mỗi người khóa 1 đáp án. Công bố đồng thời khi hết giờ.
- attacker đúng, defender sai: 70% trộm thành công.
- cả hai đúng: 30%.
- attacker sai, defender đúng: 50% phản đòn.
- cả hai sai/bỏ qua: không chuyển điểm.
Thành công lấy floor(20% Điểm Tổng lúc bắt đầu); phản đòn cũng 20% Điểm Tổng attacker lúc bắt đầu.
Mục tiêu cần >=5 Điểm Tổng, không cần quả chín. Một người chỉ tham gia một cuộc đấu.
Khóa thao tác vườn trong đấu để giá trị cược không đổi; sau kết thúc miễn bị thách đấu 20s.
Chụp rào/bẫy lúc bắt đầu. Không nhận PvE khi đang đấu, không mở đấu khi đang nhận PvE.
Không mở trận nếu không còn đủ 8s. Đáp án hết hạn, gửi lặp và event ID cũ bị từ chối.

## PvE — src/lib/game/pve.ts
Dữ liệu monsters riêng và resolveMonster riêng; không dùng bảng/hàm xử lý đấu trộm.
Hai đợt mỗi mùa, ở giây 40 và 100 của mùa; tối đa 8 đợt cả ván.
Báo chiêng bằng banner 5s (không còn nút chiêng), sau đó quiz 12s.
Đói: chủ đề Hạnh phúc, nhắm một cây Hạnh phúc; Dốt: quyền/tự do/độc lập, nhắm một cây Tự do.
Từ mùa 3: 25% đợt là giặc cấp cao, quiz chủ đề quyền.
Đúng: không mất điểm; 30% nhận thẻ (trong số thẻ: 65% tăng tốc, 35% bẫy).
Sai/hết giờ: ceil(40% giá trị quả còn lại) ở ô nhắm, kể cả chưa chín. Không có cây phù hợp thì không thiệt hại.
Giặc cấp cao sai: thêm 15% khả năng cắn 40% giá trị một quả Độc lập.
Không trừ thêm vào điểm đã hái; không sửa plantedAt/readyAt; không tự tái tạo quả.
Các vườn bận được bỏ qua đợt, không xếp chồng hai quiz. Không tạo đợt thiếu 17s cuối ván.
Ngân hàng câu hỏi gồm 15 câu (Độc lập, Tự do, Hạnh phúc) có giải thích đáp án và nguồn trích dẫn. Có thể mở rộng ngân hàng câu hỏi.

## Hàng rào
Mỗi cây có xác suất 25% tìm gỗ được gieo sẵn bằng PRNG, không roll lại khi click/tải trang.
Lúc hái có thể hiện lựa chọn gỗ khi kho dưới 6, không yêu cầu loại cây đang sống.
Đổi cả quả lấy 1 gỗ hoặc giữ điểm. Hết 8s tự giữ điểm; không khóa vườn vô thời hạn.
Chỉ cần 3 gỗ => rào độ bền 3, trừ 3 gỗ. Xây được ngay từ mùa 1.
Rào giảm 50% thiệt hại PvP kể cả phản đòn; chỉ mất 1 bền khi thực sự chặn số điểm >0.
Không giảm PvE, không nhận lá chắn tự động, không cần hai cây kề nhau.

## Thẻ
Giữ tối đa 3 mỗi loại, tiêu khi kích hoạt.
Tăng tốc: giảm ngay 30% thời gian còn lại tất cả cây hiện đang lớn; không có cây thì không tiêu.
Bẫy: gài sẵn trước đấu, lượt trộm tới tự thất bại và nhận phản đòn, tiêu bẫy một lần.
Rào của attacker vẫn giảm phản đòn. Bẫy không xếp chồng và không kích hoạt giữa trận.

## Đồng hồ, lưu và kiểm thử
Mô phỏng dựa trên lịch sự kiện tuyệt đối; catch-up qua các deadline theo thứ tự.
UI lấy cùng readyAt cho cả countdown và maturity. Không còn freeze Độc lập hoặc reset cây khi bị ăn.
Thời gian tiếp tục khi rời tab hoặc mở hướng dẫn; quiz bỏ lỡ được xử lý đúng một lần.
Hook không lùi đồng hồ trong phiên; mỗi tab lưu riêng chống ghi đè chéo.
Tải bản lưu mock hỏng hiển thị lỗi thay vì crash. Bản cũ không chuyển sang v3 vì thay đổi luật.
Engine test: node --test tests/garden-engine.test.cjs
Typecheck: node node_modules/typescript/bin/tsc --noEmit
Build: node node_modules/next/dist/bin/next build

## Backend đã tích hợp
GameEntry.tsx quản lý sảnh, token, polling 800ms, hàng đợi thao tác và idempotency key.
Backend làm chủ thời gian, điểm, PRNG, đáp án, quyền sở hữu vườn, quota mùa và khóa giao dịch.
Đáp án quiz đang chơi và thông tin riêng đối thủ được che khỏi snapshot gửi FE.
Snapshot DB cập nhật trong transaction khóa hàng phòng; hai người thấy cùng trận và deadline.
Chế độ bot vẫn chỉ là mô phỏng tại trình duyệt. API thực tế dành cho phòng nhỏ trên một server; chưa đo tải lớn.
