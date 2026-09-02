import { describe, it, expect, beforeEach } from 'vitest';
import { soundService } from '../audio';

describe('SoundService', () => {
  beforeEach(() => {
    soundService.setSoundEnabled(true);
  });

  it('toggles and stores sound enabled state', () => {
    expect(soundService.isSoundEnabled()).toBe(true);
    soundService.setSoundEnabled(false);
    expect(soundService.isSoundEnabled()).toBe(false);
    soundService.setSoundEnabled(true);
    expect(soundService.isSoundEnabled()).toBe(true);
  });

  it('safely invokes audio methods without crashing when Web Audio API is uninitialized or disabled', () => {
    expect(() => {
      soundService.playTaskComplete();
      soundService.playReminderChime();
      soundService.playPomodoroComplete();
      soundService.playTimerClick();
      soundService.playSuccess();
      soundService.playNudge();
      soundService.playTick();
      soundService.playPomodoroAlarm();
      soundService.playStartTimer();
      soundService.playPauseTimer();
    }).not.toThrow();

    soundService.setSoundEnabled(false);
    expect(() => {
      soundService.playTaskComplete();
      soundService.playReminderChime();
    }).not.toThrow();
  });
});
