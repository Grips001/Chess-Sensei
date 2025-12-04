/**
 * Sound Manager for Chess-Sensei
 *
 * Handles playing sound effects for chess moves and game events.
 * Per Task 2.2.5: Move sound effects
 *
 * @see source-docs/TASKS.md - Task 2.2.5
 */

export type SoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'castle'
  | 'promotion';

/**
 * Sound Manager class
 * Handles loading and playing chess sound effects
 */
export class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.loadSounds();
  }

  /**
   * Load all sound files
   */
  private loadSounds(): void {
    const soundFiles: Record<SoundType, string> = {
      move: '/assets/sounds/move.mp3',
      capture: '/assets/sounds/capture.mp3',
      check: '/assets/sounds/notify.mp3',
      checkmate: '/assets/sounds/notify.mp3',
      stalemate: '/assets/sounds/notify.mp3',
      castle: '/assets/sounds/notify.mp3',
      promotion: '/assets/sounds/notify.mp3',
    };

    for (const [type, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';

      // Handle load errors gracefully
      audio.addEventListener('error', () => {
        console.warn(`Sound file not found: ${path}`);
      });

      this.sounds.set(type as SoundType, audio);
    }
  }

  /**
   * Play a sound effect
   * @param type - Type of sound to play
   */
  play(type: SoundType): void {
    if (!this.enabled) return;

    const sound = this.sounds.get(type);
    if (!sound) {
      console.warn(`Sound not loaded: ${type}`);
      return;
    }

    // Reset and play
    sound.currentTime = 0;
    sound.play().catch((error) => {
      // Silently fail if sound cannot be played (e.g., browser restrictions)
      console.debug(`Could not play sound ${type}:`, error);
    });
  }

  /**
   * Enable or disable sound effects
   * @param enabled - Whether sounds should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set volume level
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => {
      sound.volume = this.volume;
    });
  }

  /**
   * Get current volume level
   */
  getVolume(): number {
    return this.volume;
  }
}
