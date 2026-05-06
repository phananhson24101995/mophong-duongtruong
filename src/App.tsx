/**
 * @file App.tsx
 * @description Component gốc của Web App - Sát hạch Đường trường Pro.
 * Kết nối shared hook useDrivingExam với Web Audio Engine.
 * Layout: Dashboard (điểm số) + Control Pad (2 grid khu vực)
 */
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
// Import từ shared module (copy vào src/shared để Vite resolve được)
import { useDrivingExam } from './shared/useDrivingExam';
import { webAudioEngine } from './shared/useAudioEngine.web';
import { ERROR_BUTTONS } from './shared/types';
import type { ExamStage } from './shared/types';

// ==========================================
// ICON COMPONENTS (Inline SVG để tránh bundle lớn)
// ==========================================
const Icon = {
  Play: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Stop: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Reset: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.94" />
    </svg>
  ),
  Alert: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 20h20L12 2zm0 3l7 13H5L12 5zm-1 4v4h2V9h-2zm0 6v2h2v-2h-2z" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Trophy: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

// ==========================================
// HELPER: Format thời gian MM:SS
// ==========================================
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ==========================================
// HELPER: Xác định màu score
// ==========================================
function getScoreClass(score: number): string {
  if (score >= 80) return '';
  if (score >= 50) return 'score-mid';
  return 'score-low';
}

// ==========================================
// COMPONENT: StageBadge
// ==========================================
function StageBadge({ stage }: { stage: ExamStage }) {
  const labels: Record<ExamStage, string> = {
    idle: 'Chờ khởi động',
    running: 'Đang thi',
    finished: 'Đã kết thúc',
  };
  return (
    <div className={`stage-badge ${stage}`}>
      <span className="stage-dot" />
      {labels[stage]}
    </div>
  );
}

// ==========================================
// COMPONENT: VoiceStatus - Hiển thị giọng nói đang dùng
// ==========================================
function VoiceStatus() {
  const [voiceInfo, setVoiceInfo] = useState<string>('Đang kiểm tra...');
  const [voiceFound, setVoiceFound] = useState<boolean | null>(null);

  useEffect(() => {
    // Kiểm tra voices sau khi load
    const checkVoice = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      const vi = voices.find(v => v.lang === 'vi-VN') || voices.find(v => v.lang.startsWith('vi'));
      if (vi) {
        setVoiceInfo(`✓ ${vi.name}`);
        setVoiceFound(true);
      } else if (voices.length > 0) {
        setVoiceInfo('⚠ Không có giọng vi-VN');
        setVoiceFound(false);
      } else {
        setVoiceInfo('Đang tải...');
      }
    };
    // Chạy ngay và lắng nghe sự kiện
    checkVoice();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = checkVoice;
    }
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <div style={{
      fontSize: 10, color: voiceFound === false ? '#f59e0b' : '#64748b',
      display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
    }}
      title="Nhấn để test giọng nói"
      onClick={() => {
        const u = new SpeechSynthesisUtterance('Xin chào, đây là giọng nói tiếng Việt');
        u.lang = 'vi-VN';
        u.rate = 1.1;
        const vi = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('vi'));
        if (vi) u.voice = vi;
        window.speechSynthesis.cancel();
        setTimeout(() => window.speechSynthesis.speak(u), 0);
      }}
    >
      🔊 {voiceInfo}
    </div>
  );
}

// ==========================================
// COMPONENT: ErrorGridSection (Memoized)
// ==========================================
const ErrorGridSection = memo(({ currentStage, triggerError }: { currentStage: ExamStage, triggerError: (points: number, label: string) => void }) => {
  return (
    <div>
      <div className="section-header">
        <span className="section-header-title">Ghi nhận lỗi vi phạm</span>
        <div className="section-header-line" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {['Xuất phát', 'Động cơ & Số', 'Lưu thông', 'Đình chỉ thi'].map(cat => (
          <div key={cat}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {cat}
            </div>
            <div className="error-grid">
              {ERROR_BUTTONS.filter(b => b.category === cat).map(btn => (
                <button
                  key={btn.id}
                  id={`btn-error-${btn.id}`}
                  className="btn-error"
                  onClick={() => triggerError(btn.points, btn.label)}
                  disabled={currentStage !== 'running'}
                  aria-label={`Lỗi: ${btn.label} - trừ ${btn.points} điểm`}
                >
                  <span>{btn.shortLabel || btn.label}</span>
                  <span className="btn-error-points">-{btn.points}đ</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ==========================================
// COMPONENT: ViolationLogSection (Memoized)
// ==========================================
const ViolationLogSection = memo(({ violationLogs }: { violationLogs: any[] }) => {
  return (
    <div className="violation-log-section" style={{ padding: 0 }}>
      <div className="section-header">
        <span className="section-header-title">
          <Icon.Alert />
          &nbsp;Lịch sử vi phạm ({violationLogs.length})
        </span>
        <div className="section-header-line" />
      </div>

      <div className="violation-log-list">
        {violationLogs.length === 0 ? (
          <div className="violation-log-empty">
            Chưa có lỗi vi phạm nào được ghi nhận
          </div>
        ) : (
          violationLogs.map(log => (
            <div key={log.id} className="violation-log-item">
              <span className="violation-log-label">{log.label}</span>
              <div className="violation-log-right">
                <span className="violation-log-points">-{log.points}đ</span>
                <span className="violation-log-time">
                  {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

// ==========================================
// COMPONENT: ControlPadSection (Memoized)
// ==========================================
const ControlPadSection = memo(({
  currentStage,
  candidateId,
  startExam,
  endExam,
  triggerPass,
  triggerCommand,
  resetExam,
  hasPassed
}: {
  currentStage: ExamStage;
  candidateId: string;
  startExam: () => void;
  endExam: () => void;
  triggerPass: () => void;
  triggerCommand: (text: string) => void;
  resetExam: () => void;
  hasPassed: boolean;
}) => {
  return (
    <div>
      <div className="section-header">
        <span className="section-header-title">Điều khiển bài thi</span>
        <div className="section-header-line" />
      </div>

      <div className="exam-grid">
        {/* Nút Xuất phát */}
        <button
          id="btn-start-exam"
          className="btn-exam btn-start"
          onClick={startExam}
          disabled={currentStage !== 'idle' || !candidateId.trim()}
          aria-label="Bắt đầu bài thi - phát âm thanh Bính Boong"
        >
          <div className="btn-icon"><Icon.Play /></div>
          <div className="btn-label">Xuất phát</div>
          <div className="btn-sublabel">Bính Boong ▸ Giọng nói</div>
        </button>

        {/* Nút Kết thúc */}
        <button
          id="btn-end-exam"
          className="btn-exam btn-end"
          onClick={endExam}
          disabled={currentStage !== 'running'}
          aria-label="Kết thúc bài thi"
        >
          <div className="btn-icon"><Icon.Stop /></div>
          <div className="btn-label">Kết thúc</div>
          <div className="btn-sublabel">Tổng kết điểm</div>
        </button>



        {/* Nút Tăng số */}
        <button
          id="btn-gear-up"
          className="btn-exam"
          onClick={() => triggerCommand('Tăng số, tăng tốc độ')}
          disabled={currentStage !== 'running'}
          aria-label="Lệnh tăng số"
        >
          <div className="btn-icon"><Icon.ArrowUp /></div>
          <div className="btn-label">Tăng số</div>
        </button>

        {/* Nút Giảm số */}
        <button
          id="btn-gear-down"
          className="btn-exam"
          onClick={() => triggerCommand('Giảm số, giảm tốc độ')}
          disabled={currentStage !== 'running'}
          aria-label="Lệnh giảm số"
        >
          <div className="btn-icon"><Icon.ArrowDown /></div>
          <div className="btn-label">Giảm số</div>
        </button>

        {/* Nút Qua bài - Đánh dấu hoàn thành một bài nhỏ */}
        <button
          id="btn-pass-stage"
          className="btn-exam col-span-2"
          onClick={triggerPass}
          disabled={currentStage !== 'running' || hasPassed}
          aria-label="Qua bài"
          style={{ borderColor: 'rgba(168,85,247,0.4)', backgroundColor: 'rgba(168,85,247,0.12)', color: '#d8b4fe' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.CheckCircle />
            <span className="btn-label" style={{ color: '#d8b4fe' }}>Qua bài</span>
          </div>
          <div className="btn-sublabel" style={{ color: '#e9d5ff' }}>Âm thanh Tu</div>
        </button>

        {/* Nút Reset - Full width */}
        <button
          id="btn-reset-exam"
          className="btn-exam col-span-2"
          onClick={resetExam}
          disabled={currentStage === 'running'}
          aria-label="Đặt lại bài thi"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.Reset />
            <span className="btn-label">Bài thi mới</span>
          </div>
        </button>
      </div>
    </div>
  );
});

// ==========================================
// COMPONENT CHÍNH: App
// ==========================================
export default function App() {
  // Inject platform callbacks vào shared hook
  const exam = useDrivingExam({
    onSpeak: useCallback((text: string, priority?: boolean) => {
      webAudioEngine.speak(text, priority);
    }, []),
    onPlayStart: useCallback(() => {
      webAudioEngine.playStartSound();
    }, []),
    onPlayBeep: useCallback(() => {
      webAudioEngine.playBeep();
    }, []),
    onPlayTu: useCallback(() => {
      webAudioEngine.playTu();
    }, []),
    onVibrate: useCallback((pattern: 'heavy' | 'light' | number[]) => {
      if (pattern === 'heavy') {
        webAudioEngine.vibrate([100, 50, 100]); // Rung dài cho lỗi
      } else if (pattern === 'light') {
        webAudioEngine.vibrate(50); // Rung ngắn
      } else {
        webAudioEngine.vibrate(pattern as number[]);
      }
    }, []),
  });

  // Ref để animate score khi trừ điểm
  const scoreRef = useRef<HTMLDivElement>(null);
  const prevScore = useRef(exam.score);

  // Animate khi điểm giảm
  useEffect(() => {
    if (exam.score < prevScore.current && scoreRef.current) {
      scoreRef.current.classList.remove('animate-score-drop');
      // Force reflow để restart animation
      void scoreRef.current.offsetWidth;
      scoreRef.current.classList.add('animate-score-drop');
    }
    prevScore.current = exam.score;
  }, [exam.score]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="app-container">
      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="header-title">🚗 Sát hạch Đường trường Pro</div>
          {/* Hiển thị giọng nói đang dùng - nhấn để test */}
          <VoiceStatus />
        </div>
        <span className={`header-badge ${exam.currentStage === 'running' ? 'active' : ''}`}>
          {exam.currentStage === 'running' ? '● ĐANG THI' :
            exam.currentStage === 'finished' ? '✓ XONG' : 'CHỜ'}
        </span>
      </header>

      {/* ===== DASHBOARD: ĐIỂM SỐ & TRẠNG THÁI ===== */}
      <section className="dashboard-section">
        <div className="score-card">
          {/* Điểm số lớn - Digital Font */}
          <div
            ref={scoreRef}
            id="score-display"
            className={`score-value ${getScoreClass(exam.score)}`}
            aria-label={`Điểm hiện tại: ${exam.score}`}
          >
            {exam.score}
          </div>
          <div className="score-label">Điểm</div>

          <div className="score-divider" />

          {/* Row thống kê phụ */}
          <div className="status-row">
            <div className="status-item">
              <div className="status-item-value flex-center" style={{ gap: 4 }}>
                <Icon.Clock />
                {formatTime(exam.elapsedTime)}
              </div>
              <div className="status-item-label">Thời gian</div>
            </div>

            <div className="status-dot" />

            <div className="status-item">
              <div className="status-item-value text-red">
                -{100 - exam.score}
              </div>
              <div className="status-item-label">Điểm bị trừ</div>
            </div>

            <div className="status-dot" />

            <div className="status-item">
              <div className="status-item-value">
                {exam.violationLogs.length}
              </div>
              <div className="status-item-label">Lỗi</div>
            </div>
          </div>

          {/* Stage badge và SBD Input */}
          <div className="flex-center" style={{ flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <StageBadge stage={exam.currentStage} />

            {exam.currentStage === 'idle' ? (
              <input
                type="text"
                placeholder="Nhập Số Báo Danh..."
                className="sbd-input"
                value={exam.candidateId}
                onChange={(e) => exam.setCandidateId(e.target.value)}
              />
            ) : (
              exam.candidateId && (
                <div className="sbd-display">SBD: {exam.candidateId}</div>
              )
            )}
          </div>

          {/* Kết quả cuối kỳ */}
          {exam.currentStage === 'finished' && (
            <div className={`result-banner ${exam.isPassed ? 'passed' : 'failed'}`}>
              {exam.isPassed
                ? '🏆 CHÚC MỪNG! BẠN ĐÃ THI ĐẠT'
                : '❌ BẠN ĐÃ THI TRƯỢT. MỜI BẠN ĐƯA XE VỀ NƠI ĐỖ VÀ CHUẨN BỊ CHO KỲ THI LẦN SAU!'}
            </div>
          )}
        </div>
      </section>

      {/* ===== CONTROL PAD: CÁC HÀNH ĐỘNG BÀI THI ===== */}
      <section className="control-section">
        {/* -- Khu vực 1: Grid 2 cột - Bài thi chính (Blue) -- */}
        <ControlPadSection
          currentStage={exam.currentStage}
          candidateId={exam.candidateId}
          startExam={exam.startExam}
          endExam={exam.endExam}
          triggerPass={exam.triggerPass}
          triggerCommand={exam.triggerCommand}
          resetExam={exam.resetExam}
          hasPassed={exam.hasPassed}
        />

        {/* -- Khu vực 2: Grid 3 cột - Nút lỗi (White/Border Red) -- */}
        <ErrorGridSection currentStage={exam.currentStage} triggerError={exam.triggerError} />

        {/* -- Khu vực 3: Log vi phạm -- */}
        <ViolationLogSection violationLogs={exam.violationLogs} />

        {/* Safe area bottom */}
        <div className="safe-bottom" style={{ height: 16 }} />
      </section>
    </div>
  );
}
