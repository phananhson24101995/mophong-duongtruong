/**
 * @file useDrivingExam.ts
 * @description Shared Hook quản lý logic chính của kỳ thi lái xe đường trường.
 * Được thiết kế để dùng chung cho Web (React) và Mobile (React Native/Expo).
 *
 * QUAN TRỌNG (CLAUDE.md): Kiểm tra kỹ hàm triggerError để đảm bảo không bị
 * trừ điểm lỗi 2 lần cho 1 lần bấm (dùng debounce guard).
 *
 * @module useDrivingExam
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  DrivingExamState,
  DrivingExamActions,
  ViolationLog,
  ExamStage,
} from './types';
import { EXAM_CONFIG } from './types';

// ==========================================
// KIỂU TRẢ VỀ CỦA HOOK
// ==========================================
export type UseDrivingExamReturn = DrivingExamState & DrivingExamActions;

// ==========================================
// KIỂU CẤU HÌNH HOOK
// ==========================================
interface UseDrivingExamOptions {
  /**
   * Callback phát âm thanh - được inject từ nền tảng cụ thể (Web / Mobile)
   * để giữ hook này thuần túy logic (không phụ thuộc platform)
   */
  onSpeak?: (text: string, priority?: boolean) => void;
  onPlayStart?: () => void;
  onPlayBeep?: () => void;
  onPlayTu?: () => void; // Âm thanh qua bài
  onVibrate?: (pattern: 'heavy' | 'light' | number[]) => void;
}

// ==========================================
// HOOK CHÍNH: useDrivingExam
// ==========================================
/**
 * Hook quản lý toàn bộ trạng thái và logic kỳ thi lái xe đường trường.
 *
 * @param options - Các callback platform-specific được inject vào
 * @returns DrivingExamState & DrivingExamActions
 *
 * @example
 * ```tsx
 * const exam = useDrivingExam({
 *   onSpeak: (text) => webAudioEngine.speak(text),
 *   onPlayStart: () => webAudioEngine.playStartSound(),
 *   onVibrate: (pattern) => navigator.vibrate(...),
 * });
 * ```
 */
export function useDrivingExam(options: UseDrivingExamOptions = {}): UseDrivingExamReturn {
  const { onSpeak, onPlayStart, onPlayBeep, onPlayTu, onVibrate } = options;

  // ==========================================
  // STATE
  // ==========================================
  const [candidateId, setCandidateId] = useState<string>('');
  const [score, setScore] = useState<number>(EXAM_CONFIG.MAX_SCORE);
  const [currentStage, setCurrentStage] = useState<ExamStage>('idle');
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [hasPassed, setHasPassed] = useState<boolean>(false);

  // ==========================================
  // REFS - Không trigger re-render
  // ==========================================
  // Guard chống double-tap (nhấn 2 lần nhanh)
  const isProcessingError = useRef<boolean>(false);
  // REF: Đánh dấu đang chờ xác nhận kết thúc bằng nút Qua bài
  const isEndingRef = useRef<boolean>(false);
  // REF: Guard cho nút Qua bài
  const isProcessingPass = useRef<boolean>(false);
  // Ref timer đếm thời gian thi
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  const isPassed = score >= EXAM_CONFIG.PASS_SCORE;

  // ==========================================
  // TIMER: Đếm thời gian thi
  // ==========================================
  useEffect(() => {
    if (currentStage === 'running') {
      // Bắt đầu đếm khi stage = running
      timerRef.current = setInterval(() => {
        setElapsedTime((prev: number) => prev + 1);
      }, 1000);
    } else {
      // Dừng đếm khi idle hoặc finished
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Cleanup khi unmount hoặc stage thay đổi
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStage]);


  // ==========================================
  // ACTION: Bắt đầu thi
  // ==========================================
  const startExam = useCallback(() => {
    if (currentStage !== 'idle') return; // Tránh gọi khi đã đang thi

    setCurrentStage('running');
    setElapsedTime(0);

    // Phát âm "Bính Boong" trước, rồi đọc lệnh
    onPlayStart?.();
    setTimeout(() => {
      onSpeak?.('Bắt đầu thi');
    }, 800); // Delay 800ms để Bính Boong phát xong
  }, [currentStage, onPlayStart, onSpeak]);

  // ==========================================
  // ACTION: Xử lý Kết thúc thực sự (Tính điểm)
  // ==========================================
  const finishExam = useCallback(() => {
    if (currentStage !== 'running') return;

    setCurrentStage('finished');
    isEndingRef.current = false;

    // Tính điểm và đọc kết quả
    setScore((prevScore: number) => {
      const passed = prevScore >= EXAM_CONFIG.PASS_SCORE;
      const resultText = passed
        ? `Chúc mừng bạn đã thi đạt. Số điểm của bạn là ${prevScore} điểm.`
        : `Bạn thi không đạt. Số điểm của bạn là ${prevScore} điểm. Hãy cố gắng hơn.`;

      // Đọc kết quả với độ trễ nhỏ để tránh xung đột âm thanh, KHÔNG ngắt âm thanh đang đọc (priority = false)
      setTimeout(() => {
        onSpeak?.(resultText, false); 
      }, 500);

      return prevScore; 
    });
  }, [currentStage, onSpeak]);

  // ==========================================
  // ACTION: Bấm nút Kết thúc (Chờ xác nhận)
  // ==========================================
  const endExam = useCallback(() => {
    if (currentStage !== 'running') return; // Chỉ có tác dụng khi đang thi
    isEndingRef.current = true;
    
    // Mở lại nút Qua bài để giám khảo ấn xác nhận hoàn tất
    setHasPassed(false);
    
    onSpeak?.('Kết thúc bài thi đường trường', true);
  }, [currentStage, onSpeak]);

  // ==========================================
  // AUTO FAIL: Kết thúc bài thi ngay nếu điểm < 80
  // ==========================================
  useEffect(() => {
    if (currentStage === 'running' && score < EXAM_CONFIG.PASS_SCORE) {
      // Dùng một timeout nhỏ để đảm bảo âm thanh lỗi vi phạm phát trước,
      // sau đó âm thanh trượt sẽ đè lên hoặc nối tiếp (bằng priority)
      const timeout = setTimeout(() => {
        finishExam();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [score, currentStage, finishExam]);

  // ==========================================
  // ACTION: Ghi nhận lỗi vi phạm - CORE FUNCTION
  // ==========================================
  // Ref để lưu lỗi vừa bấm và thời điểm bấm
  const lastErrorRef = useRef<{ label: string, time: number } | null>(null);

  /**
   * Ghi nhận lỗi vi phạm và thực hiện đồng thời:
   * 1. Trừ điểm ngay lập tức
   * 2. Phát âm thanh tên lỗi
   * 3. Rung Haptic
   * 4. Thêm vào log
   */
  const triggerError = useCallback((points: number, label: string) => {
    const now = Date.now();

    // Guard 1: Chống bấm 2 lỗi bất kỳ quá nhanh (double tap chung trong 500ms)
    if (isProcessingError.current) {
      return;
    }

    // Guard 2: KHÔNG cho bấm cùng 1 lỗi liên tục 2 lần trong vòng 3 giây
    if (lastErrorRef.current && lastErrorRef.current.label === label) {
      if (now - lastErrorRef.current.time < 3000) {
        console.warn(`[useDrivingExam] Chặn bấm lỗi "${label}" liên tục 2 lần`);
        return; // Bỏ qua nếu bấm trùng lỗi cũ quá nhanh
      }
    }

    if (currentStage !== 'running') return;

    // Cập nhật lỗi vừa bấm
    lastErrorRef.current = { label, time: now };
    isProcessingError.current = true;

    // 1. Trừ điểm ngay lập tức (không âm)
    setScore((prevScore: number) => Math.max(EXAM_CONFIG.MIN_SCORE, prevScore - points));

    // 2. Phát âm thanh tên lỗi
    onSpeak?.(label, true);

    // 3. Rung Haptic
    onVibrate?.('heavy');
    
    // 4. Khóa nút "Qua bài"
    setHasPassed(true);

    // 5. Thêm vào log
    const newLog: ViolationLog = {
      id: `violation_${now}_${Math.random().toString(36).slice(2, 7)}`,
      label,
      points,
      timestamp: now,
    };
    setViolationLogs((prev: ViolationLog[]) => [newLog, ...prev]);

    // Giải phóng guard chung sau 500ms
    setTimeout(() => {
      isProcessingError.current = false;
    }, 500);
  }, [currentStage, onSpeak, onVibrate]);

  // ==========================================
  // ACTION: Đọc lệnh tùy ý
  // ==========================================
  const triggerCommand = useCallback((text: string) => {
    if (currentStage !== 'running') return;
    
    // Khi giám khảo phát lệnh mới (Bài tiếp theo), cho phép bấm lại nút Qua bài
    setHasPassed(false);

    onPlayBeep?.(); // Phát "Bíp" trước lệnh
    setTimeout(() => {
      onSpeak?.(text);
    }, 200);
  }, [currentStage, onPlayBeep, onSpeak]);

  // ==========================================
  // ACTION: Đánh dấu qua bài
  // ==========================================
  const triggerPass = useCallback(() => {
    if (currentStage !== 'running' || hasPassed) return;
    if (isProcessingPass.current) return;

    isProcessingPass.current = true;
    setHasPassed(true); // Disable nút Qua bài vĩnh viễn cho đến khi reset
    onPlayTu?.(); // Phát âm Tu
    
    // Nếu đang trong trạng thái chờ kết thúc, thì hoàn tất bài thi
    if (isEndingRef.current) {
      setTimeout(() => {
        finishExam();
      }, 500); // Đợi tiếng Tu dứt rồi đọc kết quả
    } else {
      // Nhả guard sau 1 giây
      setTimeout(() => {
        isProcessingPass.current = false;
      }, 1000);
    }
  }, [currentStage, hasPassed, onPlayTu, finishExam]);

  // ==========================================
  // ACTION: Đặt lại trạng thái thi
  // ==========================================
  const resetExam = useCallback(() => {
    setCandidateId('');
    setScore(EXAM_CONFIG.MAX_SCORE);
    setCurrentStage('idle');
    setViolationLogs([]);
    setElapsedTime(0);
    isProcessingError.current = false;
    isProcessingPass.current = false;
    isEndingRef.current = false;
    setHasPassed(false);
  }, []);

  // ==========================================
  // TRẢ VỀ STATE & ACTIONS
  // ==========================================
  return {
    // State
    candidateId,
    score,
    currentStage,
    violationLogs,
    elapsedTime,
    isPassed: score >= EXAM_CONFIG.PASS_SCORE,
    hasPassed, // Export hasPassed state
    
    // Actions
    setCandidateId,
    startExam,
    endExam,
    triggerError,
    resetExam,
    triggerCommand,
    triggerPass,
  };
}
