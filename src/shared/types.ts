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
// DANH SÁCH LỖI PHỔ BIẾN (DỰA TRÊN INFOGRAPHIC THỰC TẾ)
// ==========================================
export const ERROR_BUTTONS: ErrorButton[] = [
  // Phần 1 & 3: Cơ bản & Kỹ năng
  { id: 'err_seatbelt',    label: 'Không thắt dây an toàn',       shortLabel: 'Dây an toàn', points: 5 },
  { id: 'err_signal',      label: 'Không bật xi nhan',             shortLabel: 'Xi nhan',     points: 5 },
  { id: 'err_stall',       label: 'Chết máy',                      shortLabel: 'Chết máy',    points: 5 },
  { id: 'err_gear',        label: 'Nhầm số',                       shortLabel: 'Nhầm số',     points: 5 },
  
  // Vi phạm điển hình (-10đ theo Infographic)
  { id: 'err_observe_start', label: 'Không quan sát khi xuất phát', shortLabel: 'Ko Q.Sát XP', points: 10 },
  { id: 'err_parking',       label: 'Dừng, đỗ xe sai quy định',     shortLabel: 'Dừng đỗ sai', points: 10 },
  { id: 'err_signs',         label: 'Không chấp hành biển báo cấm', shortLabel: 'Biển báo',    points: 10 },
  { id: 'err_speed',         label: 'Chạy quá tốc độ quy định',     shortLabel: 'Quá tốc độ',  points: 10 },

  // Phần 2 & 4: Giao thông & Xử lý tình huống
  { id: 'err_lane',          label: 'Đè vạch, lấn làn đường',       shortLabel: 'Lấn làn',     points: 10 },
  { id: 'err_police',        label: 'Không chấp hành hiệu lệnh',    shortLabel: 'Hiệu lệnh',   points: 10 },
  { id: 'err_yield',         label: 'Không nhường đường',           shortLabel: 'Nhường đường',points: 10 },
  { id: 'err_hazard',        label: 'Xử lý tình huống kém',         shortLabel: 'Xử lý kém',   points: 10 },
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
