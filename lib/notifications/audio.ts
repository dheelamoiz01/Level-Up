/**
 * Web Audio API synthesizer for Level Up.
 * Plays clean, professional acoustic/harmonic sine chimes and ringing alarms with zero audio file latency.
 * Fully compatible with mobile phone browsers (iOS Safari, Android Chrome).
 */

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** Pre-unlock AudioContext on first user interaction (touch/click) for mobile browsers */
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
    } catch {}
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("touchend", unlockAudio);
    window.removeEventListener("click", unlockAudio);
  };
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("touchend", unlockAudio, { passive: true });
  window.addEventListener("click", unlockAudio, { passive: true });
}

/**
 * Play harmonic notification chimes (Session start, alerts)
 */
export async function playChime(variant: "session_start" | "session_end" | "alert" | "ringing" = "session_start") {
  if (variant === "ringing") {
    playTimerRingingSound();
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (variant === "session_start") {
      // Crisp 3-tone ascending alert chime for Owner: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.32, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.5, now + 0.1);
      gain2.gain.setValueAtTime(0.38, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.55);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1318.5, now + 0.22);
      gain3.gain.setValueAtTime(0.42, now + 0.22);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.22);
      osc3.stop(now + 0.85);
    } else if (variant === "session_end") {
      // Settled transaction chime (C6: 1046.5Hz harmonic ring)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    } else {
      // Cautionary prompt chime (F5: 698.46Hz -> D5: 587.33Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(698.46, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.3);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Autoplay policy silent catch
  }
}

let alarmIntervalId: NodeJS.Timeout | null = null;

/**
 * Start continuous looping ringing alarm on manager phone.
 * Rings every 1.8 seconds with phone vibration until explicitly stopped.
 */
export function startContinuousAlarm() {
  stopContinuousAlarm();
  playTimerRingingSound();
  alarmIntervalId = setInterval(() => {
    playTimerRingingSound();
  }, 1800);
}

/**
 * Stop continuous ringing alarm immediately (e.g. when manager taps OK)
 */
export function stopContinuousAlarm() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

/**
 * Loud, rhythmic ringing alarm for manager's phone when ANY session expires (Time Up).
 * Produces a crisp 4-pulse bell ring sequence with vibration.
 */
export function playTimerRingingSound() {
  const ctx = getAudioContext();

  // Trigger mobile phone vibration if supported
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([400, 150, 400, 150, 600]);
    } catch {}
  }

  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    const now = ctx.currentTime;
    // 4 rhythmic double-chime pulses: (Ding-Ding, Ding-Ding, Ding-Ding, Ding-Ding)
    const pulses = [0, 0.35, 0.7, 1.05];

    pulses.forEach((offset) => {
      const startTime = now + offset;

      // High ring tone (1174.66Hz - D6)
      const oscA = ctx.createOscillator();
      const gainA = ctx.createGain();
      oscA.type = "sine";
      oscA.frequency.setValueAtTime(1174.66, startTime);
      gainA.gain.setValueAtTime(0.24, startTime);
      gainA.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      oscA.connect(gainA);
      gainA.connect(ctx.destination);
      oscA.start(startTime);
      oscA.stop(startTime + 0.22);

      // Resonant bell fundamental (880Hz - A5)
      const oscB = ctx.createOscillator();
      const gainB = ctx.createGain();
      oscB.type = "sine";
      oscB.frequency.setValueAtTime(880, startTime + 0.04);
      gainB.gain.setValueAtTime(0.28, startTime + 0.04);
      gainB.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
      oscB.connect(gainB);
      gainB.connect(ctx.destination);
      oscB.start(startTime + 0.04);
      oscB.stop(startTime + 0.28);
    });
  } catch (e) {
    // Autoplay policy catch
  }
}
