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

  // ==========================================
  // REFS - Không trigger re-render
  // ==========================================
  // Guard chống double-tap (nhấn 2 lần nhanh)
  const isProcessingError = useRef<boolean>(false);
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
        setElapsedTime(prev => prev + 1);
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
      onSpeak?.('Bắt đầu bài thi đường trường');
    }, 800); // Delay 800ms để Bính Boong phát xong
  }, [currentStage, onPlayStart, onSpeak]);

  // ==========================================
  // ACTION: Kết thúc thi
  // ==========================================
  const endExam = useCallback(() => {
    if (currentStage !== 'running') return; // Chỉ kết thúc khi đang thi

    setCurrentStage('finished');

    // Tính điểm và đọc kết quả
    // Sử dụng functional update để lấy score mới nhất
    setScore(prevScore => {
      const passed = prevScore >= EXAM_CONFIG.PASS_SCORE;
      const resultText = passed
        ? `Chúc mừng bạn đã thi đạt. Số điểm của bạn là ${prevScore} điểm.`
        : `Bạn thi không đạt. Số điểm của bạn là ${prevScore} điểm. Hãy cố gắng hơn.`;

      // Đọc kết quả với độ trễ nhỏ để tránh xung đột âm thanh
      setTimeout(() => {
        onSpeak?.(resultText, true); // priority=true để ngắt mọi âm thanh đang phát
      }, 300);

      return prevScore; // Không thay đổi score
    });
  }, [currentStage, onSpeak]);

  // ==========================================
  // ACTION: Ghi nhận lỗi vi phạm - CORE FUNCTION
  // ==========================================
  /**
   * Ghi nhận lỗi vi phạm và thực hiện đồng thời:
   * 1. Trừ điểm ngay lập tức
   * 2. Phát âm thanh tên lỗi (ưu tiên cao, ngắt âm thanh khác)
   * 3. Rung Haptic mức Heavy
   * 4. Thêm vào log với timestamp
   *
   * GUARD: isProcessingError đảm bảo không trừ điểm 2 lần trong 500ms
   */
  const triggerError = useCallback((points: number, label: string) => {
    // Guard chống double-tap: bỏ qua nếu đang xử lý lỗi trước đó
    if (isProcessingError.current) {
      console.warn(`[useDrivingExam] Bỏ qua lỗi "${label}" - đang xử lý lỗi trước đó`);
      return;
    }
    // Chỉ xử lý lỗi khi đang thi
    if (currentStage !== 'running') return;

    // Kích hoạt guard
    isProcessingError.current = true;

    // 1. Trừ điểm ngay lập tức (không âm)
    setScore(prevScore => Math.max(EXAM_CONFIG.MIN_SCORE, prevScore - points));

    // 2. Phát âm thanh tên lỗi (priority: ngắt âm thanh đang phát)
    onSpeak?.(label, true);

    // 3. Rung Haptic mức Heavy (rung dài theo SYSTEM_DESIGN.md)
    onVibrate?.('heavy');

    // 4. Thêm vào log vi phạm với timestamp
    const newLog: ViolationLog = {
      id: `violation_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label,
      points,
      timestamp: Date.now(),
    };
    setViolationLogs(prev => [newLog, ...prev]); // Thêm vào đầu danh sách (mới nhất trên cùng)

    // Giải phóng guard sau 500ms
    setTimeout(() => {
      isProcessingError.current = false;
    }, 500);
  }, [currentStage, onSpeak, onVibrate]);

  // ==========================================
  // ACTION: Đọc lệnh tùy ý
  // ==========================================
  const triggerCommand = useCallback((text: string) => {
    if (currentStage !== 'running') return;
    onPlayBeep?.(); // Phát "Bíp" trước lệnh
    setTimeout(() => {
      onSpeak?.(text);
    }, 200);
  }, [currentStage, onPlayBeep, onSpeak]);

  // ==========================================
  // ACTION: Đánh dấu qua bài
  // ==========================================
  const triggerPass = useCallback(() => {
    if (currentStage !== 'running') return;
    onPlayTu?.(); // Phát âm Tu
  }, [currentStage, onPlayTu]);

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
    isPassed,
    elapsedTime,
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
