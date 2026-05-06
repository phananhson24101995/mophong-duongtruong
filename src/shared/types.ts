/**
 * @file types.ts
 * @description Các kiểu dữ liệu dùng chung (Shared Types) cho hệ thống Sát hạch Đường trường Pro.
 * Được sử dụng bởi cả Web (Vite/React) và Mobile (Expo).
 */

// ==========================================
// TRẠNG THÁI THI
// ==========================================
export type ExamStage =
  | 'idle'      // Chờ khởi động
  | 'running'   // Đang thi
  | 'finished'; // Đã kết thúc

// ==========================================
// BẢN GHI LỖI VI PHẠM
// ==========================================
export interface ViolationLog {
  id: string;           // UUID duy nhất của bản ghi
  label: string;        // Tên lỗi (VD: "Không thắt dây an toàn")
  points: number;       // Số điểm bị trừ
  timestamp: number;    // Unix timestamp (ms) khi lỗi xảy ra
}

// ==========================================
// ĐỊNH NGHĨA NÚT LỖI
// ==========================================
export interface ErrorButton {
  id: string;       // ID định danh nút
  label: string;    // Nhãn hiển thị
  points: number;   // Điểm bị trừ khi nhấn
  shortLabel?: string; // Nhãn ngắn cho mobile
  category: 'Xuất phát' | 'Động cơ & Số' | 'Lưu thông' | 'Đình chỉ thi'; // Phân nhóm lỗi
}

// ==========================================
// ĐỊNH NGHĨA HÀNH ĐỘNG BÀI THI
// ==========================================
export interface ExamAction {
  id: string;       // ID định danh hành động
  label: string;    // Nhãn hiển thị
  type: 'start' | 'end' | 'command'; // Loại hành động
  audioText?: string; // Văn bản đọc khi nhấn (nếu có)
}

// ==========================================
// TRẠNG THÁI HOOK useDrivingExam
// ==========================================
export interface DrivingExamState {
  candidateId: string;        // Số báo danh thí sinh
  score: number;              // Điểm hiện tại (0-100)
  currentStage: ExamStage;    // Giai đoạn thi hiện tại
  violationLogs: ViolationLog[]; // Danh sách vi phạm
  isPassed: boolean;          // Kết quả: Đạt hay Không đạt
  hasPassed: boolean;         // Đã nhấn qua bài hay chưa
  elapsedTime: number;        // Thời gian thi (giây)
}

// ==========================================
// HÀNH ĐỘNG HOOK useDrivingExam
// ==========================================
export interface DrivingExamActions {
  setCandidateId: (id: string) => void;           // Cập nhật số báo danh
  startExam: () => void;                          // Bắt đầu thi
  endExam: () => void;                            // Kết thúc thi
  triggerError: (points: number, label: string) => void; // Ghi nhận lỗi vi phạm
  resetExam: () => void;                          // Đặt lại trạng thái
  triggerCommand: (text: string) => void;         // Đọc lệnh tùy ý
  triggerPass: () => void;                        // Đánh dấu qua bài (phát âm Tu)
}

// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
export const EXAM_CONFIG = {
  MAX_SCORE: 100,     // Điểm tối đa
  PASS_SCORE: 80,     // Điểm đạt
  MIN_SCORE: 0,       // Điểm thấp nhất (không âm)
  VOICE_RATE: 1.1,    // Tốc độ đọc giọng nói
  VOICE_LANG: 'vi-VN', // Ngôn ngữ giọng nói
} as const;

// ==========================================
// DANH SÁCH LỖI PHỔ BIẾN
// ==========================================
export const ERROR_BUTTONS: ErrorButton[] = [
  // 1. NHÓM XUẤT PHÁT & DỪNG XE
  { id: 'err_seatbelt',      category: 'Xuất phát', label: 'Không thắt dây an toàn',       shortLabel: 'Dây an toàn', points: 5 },
  { id: 'err_signal_start',  category: 'Xuất phát', label: 'Không bật đèn xi nhan trái khi xuất phát', shortLabel: 'Ko xi nhan trái', points: 5 },
  { id: 'err_signal_end',    category: 'Xuất phát', label: 'Không bật đèn xi nhan phải',   shortLabel: 'Ko xi nhan phải', points: 5 },
  { id: 'err_brake_start',   category: 'Xuất phát', label: 'Không nhả hết phanh tay khi khởi hành', shortLabel: 'Quên nhả phanh', points: 5 },
  { id: 'err_brake_end',     category: 'Xuất phát', label: 'Không kéo phanh tay khi xe dừng hẳn', shortLabel: 'Quên kéo phanh', points: 5 },
  { id: 'err_neutral_end',   category: 'Xuất phát', label: 'Khi xe dừng hẳn, không về được số "không" (hoặc "P")', shortLabel: 'Không về số 0/P', points: 5 },

  // 2. NHÓM ĐỘNG CƠ & SỐ
  { id: 'err_jerk',          category: 'Động cơ & Số', label: 'Xe bị rung giật mạnh',         shortLabel: 'Rung giật',   points: 5 },
  { id: 'err_stall',         category: 'Động cơ & Số', label: 'Lái xe bị chết máy',           shortLabel: 'Chết máy',    points: 5 },
  { id: 'err_rpm',           category: 'Động cơ & Số', label: 'Để tốc độ động cơ quá 4000 vòng/phút', shortLabel: 'Vòng tua >4K',points: 5 },
  { id: 'err_dist_gear_15',  category: 'Động cơ & Số', label: 'Trong khoảng 15 m không tăng từ số 1 lên số 3', shortLabel: '15m ko lên số 3', points: 5 },
  { id: 'err_gear_up_100',   category: 'Động cơ & Số', label: 'Trong khoảng 100 m không tăng được số, tốc độ', shortLabel: '100m ko tăng số',points: 5 },
  { id: 'err_gear_down_100', category: 'Động cơ & Số', label: 'Trong khoảng 100 m không giảm được số, tốc độ', shortLabel: '100m ko giảm số',points: 5 },
  { id: 'err_gear_wrong',    category: 'Động cơ & Số', label: 'Sử dụng từ tay số 3 trở lên khi tốc độ xe chạy dưới 20 km/h', shortLabel: 'Sai số (<20km/h)', points: 2 }, 

  // 3. NHÓM LƯU THÔNG
  { id: 'err_rule',          category: 'Lưu thông', label: 'Vi phạm quy tắc giao thông đường bộ', shortLabel: 'Vi phạm GT',  points: 10 },
  
  // 4. NHÓM ĐÌNH CHỈ THI (Loại trực tiếp)
  { id: 'err_start_30s',     category: 'Đình chỉ thi', label: 'Quá 30 giây kể từ khi có lệnh xuất phát, chưa khởi hành xe', shortLabel: 'Quá 30s X.P', points: 25 },
  { id: 'err_accident',      category: 'Đình chỉ thi', label: 'Xử lý tình huống không hợp lý gây tai nạn', shortLabel: 'Gây tai nạn', points: 25 },
  { id: 'err_lane_fail',     category: 'Đình chỉ thi', label: 'Khi tăng hoặc giảm số, xe bị choạng lái quá làn đường quy định', shortLabel: 'Choạng lái',  points: 25 },
  { id: 'err_disobey',       category: 'Đình chỉ thi', label: 'Không thực hiện theo hiệu lệnh của sát hạch viên', shortLabel: 'Chống hiệu lệnh', points: 25 },
];

// ==========================================
// DANH SÁCH HÀNH ĐỘNG BÀI THI
// ==========================================
export const EXAM_ACTIONS: ExamAction[] = [
  {
    id: 'action_start',
    label: 'Xuất phát',
    type: 'start',
    audioText: 'Bắt đầu bài thi đường trường',
  },
  {
    id: 'action_gear_up',
    label: 'Tăng số',
    type: 'command',
    audioText: 'Tăng số, tăng tốc độ',
  },
  {
    id: 'action_gear_down',
    label: 'Giảm số',
    type: 'command',
    audioText: 'Giảm số, giảm tốc độ',
  },
  {
    id: 'action_end',
    label: 'Kết thúc',
    type: 'end',
  },
];
