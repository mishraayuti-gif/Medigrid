import type { MusicTrack } from '../types/wellness';

/**
 * Procedural Web Audio API soundscape synthesizer.
 * Generates soothing, zero-latency ambient textures directly in the browser
 * without relying on unverified or fragile external MP3 URLs.
 */
class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stopNodes: (() => void)[] = [];
  private activePreset: MusicTrack['synthPreset'] | null = null;
  private currentVolume = 0.55;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.currentVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.08);
    }
  }

  public stop() {
    for (const fn of this.stopNodes) {
      try {
        fn();
      } catch {
        // ignore cleanup errors
      }
    }
    this.stopNodes = [];
    this.activePreset = null;
  }

  public start(preset: MusicTrack['synthPreset'], volume?: number) {
    if (volume !== undefined) this.currentVolume = volume;
    this.stop();
    const ctx = this.ensureContext();
    const out = this.masterGain!;
    out.gain.setTargetAtTime(this.currentVolume, ctx.currentTime, 0.2);
    this.activePreset = preset;

    if (preset === 'rain' || preset === 'brownNoise' || preset === 'forest' || preset === 'ocean') {
      this.startNoiseTexture(ctx, out, preset);
    } else if (preset === 'drone432' || preset === 'warmPad' || preset === 'focusPulse') {
      this.startHarmonicPad(ctx, out, preset);
    } else if (preset === 'lofi') {
      this.startLofiChords(ctx, out);
    }
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'pink' | 'brown'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.5;
      }
    } else {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  private startNoiseTexture(
    ctx: AudioContext,
    out: GainNode,
    preset: 'rain' | 'brownNoise' | 'forest' | 'ocean'
  ) {
    const buffer = this.createNoiseBuffer(ctx, preset === 'brownNoise' ? 'brown' : 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = preset === 'forest' ? 'bandpass' : 'lowpass';
    filter.frequency.value =
      preset === 'rain' ? 1400 : preset === 'brownNoise' ? 320 : preset === 'forest' ? 750 : 620;
    filter.Q.value = preset === 'forest' ? 1.1 : 0.7;

    const textureGain = ctx.createGain();
    textureGain.gain.value = preset === 'brownNoise' ? 0.55 : 0.48;

    let lfo: OscillatorNode | null = null;
    if (preset === 'ocean' || preset === 'forest') {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = preset === 'ocean' ? 0.1 : 0.16;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = preset === 'ocean' ? 0.24 : 180;
      lfo.connect(lfoGain);
      if (preset === 'ocean') {
        lfoGain.connect(textureGain.gain);
      } else {
        lfoGain.connect(filter.frequency);
      }
      lfo.start();
    }

    source.connect(filter);
    filter.connect(textureGain);
    textureGain.connect(out);
    source.start();

    this.stopNodes.push(() => {
      source.stop();
      source.disconnect();
      if (lfo) {
        lfo.stop();
        lfo.disconnect();
      }
      filter.disconnect();
      textureGain.disconnect();
    });
  }

  private startHarmonicPad(
    ctx: AudioContext,
    out: GainNode,
    preset: 'drone432' | 'warmPad' | 'focusPulse'
  ) {
    const freqs =
      preset === 'drone432'
        ? [108, 162, 216, 324]
        : preset === 'focusPulse'
        ? [144, 216, 288]
        : [130.81, 196.0, 246.94, 293.66];

    const subGain = ctx.createGain();
    subGain.gain.value = 0.28;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset === 'focusPulse' ? 520 : 680;
    subGain.connect(filter);
    filter.connect(out);

    const oscs: OscillatorNode[] = [];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.22 / freqs.length;
      osc.connect(g);
      g.connect(subGain);
      osc.start();
      oscs.push(osc);
    });

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = preset === 'focusPulse' ? 0.25 : 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain);
    lfoGain.connect(subGain.gain);
    lfo.start();

    this.stopNodes.push(() => {
      oscs.forEach((o) => {
        o.stop();
        o.disconnect();
      });
      lfo.stop();
      lfo.disconnect();
      subGain.disconnect();
      filter.disconnect();
    });
  }

  private startLofiChords(ctx: AudioContext, out: GainNode) {
    const chords = [
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G6
      [164.81, 196.0, 246.94, 293.66], // Em7
    ];
    let step = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 780;
    const chordGain = ctx.createGain();
    chordGain.gain.value = 0.22;
    filter.connect(chordGain);
    chordGain.connect(out);

    const playNextChord = () => {
      if (this.activePreset !== 'lofi') return;
      const now = ctx.currentTime;
      const notes = chords[step % chords.length];
      step++;
      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(0.18 / notes.length, now + 0.35);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
        osc.connect(env);
        env.connect(filter);
        osc.start(now);
        osc.stop(now + 3.5);
      });
    };

    playNextChord();
    const interval = window.setInterval(playNextChord, 3600);

    this.stopNodes.push(() => {
      window.clearInterval(interval);
      filter.disconnect();
      chordGain.disconnect();
    });
  }
}

export const soundEngine = new ProceduralSoundEngine();
