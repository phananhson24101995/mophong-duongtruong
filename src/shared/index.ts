/**
 * @file index.ts
 * @description Barrel export cho package shared.
 * Export tất cả types, constants và hooks dùng chung.
 */

// Types & Constants
export * from './types';

// Shared Hook
export { useDrivingExam } from './useDrivingExam';
export type { UseDrivingExamReturn } from './useDrivingExam';

// Web Audio Engine (chỉ import trên Web)
export { webAudioEngine } from './useAudioEngine.web';
