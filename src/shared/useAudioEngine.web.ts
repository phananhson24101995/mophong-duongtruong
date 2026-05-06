/**
 * @file useAudioEngine.web.ts
 * @description Audio Engine cho nền tảng Web.
 * - Phát giọng nói: Web Speech API (SpeechSynthesis)
 * - Phát hiệu ứng: HTML5 Audio (pre-loaded)
 * - Ưu tiên: Cảnh báo lỗi ngắt âm thanh đang phát (theo PROJECT-RULES.md)
 */

import { EXAM_CONFIG } from './types';

// ==========================================
// AUDIO CACHE - Pre-load âm thanh để đáp ứng < 100ms
// ==========================================
const audioCache: Map<string, HTMLAudioElement> = new Map();

/**
 * Tải file âm thanh MP3 thực tế. Nếu không có file (404), fallback về âm thanh tổng hợp.
 * @param url Đường dẫn tới file âm thanh (vd: /sounds/bingbong.mp3)
 * @param fallback Hàm tạo âm thanh tổng hợp
 */
function createRealSoundWithFallback(url: string, fallback: () => void): () => void {
  const audio = new Audio(url);
  audio.load(); // Bắt đầu load ngầm

  return () => {
    // Nếu audio đã sẵn sàng hoặc đang load và url đúng, thử phát
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Lỗi không tìm thấy file hoặc browser chặn autoplay
        console.warn(`[AudioEngine] Lỗi phát ${url}, dùng âm thanh tổng hợp fallback:`, err.message);
        fallback();
      });
    } else {
      fallback();
    }
    
    // Reset thời gian để phát lại từ đầu nếu gọi liên tục
    audio.currentTime = 0;
  };
}

/**
 * Tạo âm thanh "Bính Boong" bằng Web Audio API (oscillator) - Fallback
 * Không cần file âm thanh ngoài - hoàn toàn tổng hợp
 */
function synthesizeBingBongSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();

      // Nốt "Bính" - tần số cao
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880; // A5
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.5, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Nốt "Boong" - tần số thấp hơn
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 660; // E5
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc2.start(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.7);

    // Tự đóng context sau khi phát xong
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.warn('[AudioEngine] Không thể tổng hợp Bính Boong:', e);
  }
}

/**
 * Tạo âm thanh "Bíp" ngắn - Fallback
 */
function synthesizeBeepSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000; // 1kHz
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    console.warn('[AudioEngine] Không thể tổng hợp Bíp:', e);
  }
}

/**
 * Tạo âm thanh "Tu" (dài hơn Bíp, báo hiệu qua bài) - Fallback
 */
function synthesizeTuSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600; // 600Hz cho âm Tu
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.warn('[AudioEngine] Không thể tổng hợp Tu:', e);
  }
}

// Khởi tạo các hàm phát âm thanh (Ưu tiên file MP3 thực tế, fallback sang tự động tổng hợp)
// Người dùng chỉ cần bỏ file bingbong.mp3 vào /apps/web/public/sounds/
const playBingBong = createRealSoundWithFallback('/sounds/bingbong.mp3', synthesizeBingBongSound);
const playBeep = createRealSoundWithFallback('/sounds/bip.mp3', synthesizeBeepSound);
const playTu = createRealSoundWithFallback('/sounds/tu.mp3', synthesizeTuSound);

// ==========================================
// VOICE CACHE - Load voices async khi khởi động
// Vấn đề: getVoices() trả về [] nếu gọi trước khi voiceschanged
// ==========================================
let cachedViVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

/**
 * Load và cache giọng tiếng Việt từ Web Speech API.
 * Phải gọi qua event voiceschanged vì voices load bất đồng bộ.
 */
function loadVietnameseVoice(): void {
  const tryLoad = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return; // Chưa ready

    // Ưu tiên: vi-VN > vi > fallback null
    cachedViVoice =
      voices.find(v => v.lang === 'vi-VN') ||
      voices.find(v => v.lang.startsWith('vi')) ||
      null;

    voicesReady = true;
    console.log(
      '[AudioEngine] Giọng tiếng Việt:',
      cachedViVoice ? `${cachedViVoice.name} (${cachedViVoice.lang})` : 'Không tìm thấy, dùng mặc định'
    );
  };

  // Trình duyệt Chromium: voices load ngay lập tức
  tryLoad();

  // Trình duyệt Firefox/Safari: cần đợi event voiceschanged
  if (!voicesReady && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      tryLoad();
      window.speechSynthesis.onvoiceschanged = null; // Chỉ cần load 1 lần
    };
  }
}

// Khởi động load voices ngay khi module được import
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Delay nhỏ để đảm bảo DOM sẵn sàng trên một số trình duyệt
  setTimeout(loadVietnameseVoice, 100);
}

// ==========================================
// WEB AUDIO ENGINE - Giao diện chính
// ==========================================
export const webAudioEngine = {
  /**
   * Phát âm thanh "Bính Boong" khi xuất phát
   */
  playStartSound: () => {
    playBingBong();
  },

  /**
   * Phát âm "Bíp" ngắn (dùng cho Tun / nút lệnh)
   */
  playBeep: () => {
    playBeep();
  },

  /**
   * Phát âm "Tu" dài (dùng khi qua bài)
   */
  playTu: () => {
    playTu();
  },

  /**
   * Đọc văn bản bằng giọng nói tiếng Việt.
   * Tự động hủy phát âm đang chạy (ưu tiên cao nhất cho lỗi).
   * @param text - Văn bản cần đọc
   * @param priority - Nếu true, ngắt âm thanh đang phát ngay lập tức
   */
  speak: (text: string, priority: boolean = false) => {
    if (!window.speechSynthesis) {
      console.warn('[AudioEngine] Web Speech API không được hỗ trợ');
      return;
    }

    // Ưu tiên cao: hủy ngay âm thanh đang phát
    if (priority) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // FIX: Dùng cachedViVoice đã load sẵn thay vì gọi getVoices() trực tiếp
    // getVoices() trả về [] nếu chưa có event voiceschanged -> không nói được
    if (cachedViVoice) {
      utterance.voice = cachedViVoice;
      utterance.lang = cachedViVoice.lang; // Đảm bảo lang khớp với voice
    } else {
      // Fallback: set lang vi-VN để trình duyệt tự chọn giọng phù hợp
      utterance.lang = EXAM_CONFIG.VOICE_LANG;
    }

    utterance.rate = EXAM_CONFIG.VOICE_RATE;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Workaround: Chrome đôi khi bị freeze khi speechSynthesis.speak()
    // Giải pháp: dùng setTimeout(0) để đưa vào event queue
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 0);
  },

  /**
   * Dừng tất cả âm thanh đang phát
   */
  stopAll: () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Phát rung (Vibration API - nếu trình duyệt hỗ trợ)
   * @param pattern - Mẫu rung [ms rung, ms nghỉ, ...]
   */
  vibrate: (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },
};
