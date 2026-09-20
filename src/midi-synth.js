// Lightweight Web Audio MIDI/Chime Synthesizer
// Pure procedural Web Audio synthesis with zero external audio assets.

const NOTE_FREQS = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98
};

export const TRACKS = {
  'music_box': {
    id: 'music_box',
    name: '🎵 浪漫八音盒',
    description: '清脆温柔的八音盒微光旋律',
    instrument: 'bell',
    bpm: 104,
    notes: [
      // Canon-inspired gentle melody in C Major
      ['E5', 0.5, 0.0], ['G5', 0.5, 0.5], ['C6', 1.0, 1.0], ['B5', 0.5, 2.0], ['G5', 0.5, 2.5],
      ['A5', 0.5, 3.0], ['C6', 0.5, 3.5], ['G5', 1.0, 4.0], ['F5', 0.5, 5.0], ['E5', 0.5, 5.5],
      ['D5', 0.5, 6.0], ['F5', 0.5, 6.5], ['E5', 1.0, 7.0], ['D5', 0.5, 8.0], ['C5', 0.5, 8.5],
      ['D5', 1.5, 9.0], ['G4', 0.5, 10.5], ['E5', 1.0, 11.0], ['D5', 1.0, 12.0], ['C5', 2.0, 13.0],
      // Harmony accompaniment bass notes
      ['C4', 1.5, 0.0], ['G3', 1.5, 2.0], ['A3', 1.5, 4.0], ['E3', 1.5, 6.0],
      ['F3', 1.5, 8.0], ['C4', 1.5, 10.0], ['F3', 1.5, 12.0], ['G3', 1.5, 14.0]
    ],
    duration: 16.0
  },
  'sea_breeze': {
    id: 'sea_breeze',
    name: '🌊 海风与吉他',
    description: '悠扬舒缓的暖阳海浪微调',
    instrument: 'guitar',
    bpm: 92,
    notes: [
      ['G4', 0.8, 0.0], ['B4', 0.8, 0.8], ['D5', 0.8, 1.6], ['G5', 1.2, 2.4],
      ['E5', 0.8, 4.0], ['G5', 0.8, 4.8], ['C6', 1.2, 5.6],
      ['D5', 0.8, 7.2], ['F5', 0.8, 8.0], ['A5', 1.2, 8.8],
      ['C5', 0.8, 10.4], ['E5', 0.8, 11.2], ['G5', 2.0, 12.0],
      // Bass line
      ['G3', 2.0, 0.0], ['C4', 2.0, 4.0], ['D3', 2.0, 7.2], ['G3', 2.5, 10.4]
    ],
    duration: 15.0
  },
  'canon': {
    id: 'canon',
    name: '✨ 卡农微光',
    description: '经典治愈的岁月重奏',
    instrument: 'piano',
    bpm: 96,
    notes: [
      ['E5', 1.0, 0.0], ['D5', 1.0, 1.0], ['C5', 1.0, 2.0], ['B4', 1.0, 3.0],
      ['A4', 1.0, 4.0], ['G4', 1.0, 5.0], ['A4', 1.0, 6.0], ['B4', 1.0, 7.0],
      ['C5', 0.5, 8.0], ['E5', 0.5, 8.5], ['G5', 0.5, 9.0], ['F5', 0.5, 9.5],
      ['E5', 0.5, 10.0], ['C5', 0.5, 10.5], ['E5', 0.5, 11.0], ['D5', 0.5, 11.5],
      ['C5', 0.5, 12.0], ['A4', 0.5, 12.5], ['C5', 0.5, 13.0], ['B4', 0.5, 13.5],
      ['A4', 0.5, 14.0], ['F4', 0.5, 14.5], ['G4', 1.0, 15.0],
      // Warm chords
      ['C4', 1.8, 0.0], ['G3', 1.8, 2.0], ['A3', 1.8, 4.0], ['E3', 1.8, 6.0],
      ['F3', 1.8, 8.0], ['C3', 1.8, 10.0], ['F3', 1.8, 12.0], ['G3', 1.8, 14.0]
    ],
    duration: 16.0
  },
  'starry': {
    id: 'starry',
    name: '🌌 星空夜曲',
    description: '宁静空灵的夜阑轻语',
    instrument: 'bell',
    bpm: 80,
    notes: [
      ['C5', 1.0, 0.0], ['E5', 1.0, 1.0], ['G5', 1.5, 2.0], ['B5', 0.5, 3.5],
      ['A5', 1.5, 4.0], ['E5', 1.0, 5.5], ['D5', 2.0, 6.5],
      ['E5', 1.0, 9.0], ['G5', 1.0, 10.0], ['A5', 1.5, 11.0], ['G5', 0.5, 12.5],
      ['E5', 1.5, 13.0], ['D5', 1.0, 14.5], ['C5', 2.5, 15.5],
      // Ambient drone
      ['A3', 3.0, 0.0], ['F3', 3.0, 4.0], ['C3', 3.0, 8.0], ['G3', 3.5, 12.0]
    ],
    duration: 18.0
  },
  'none': {
    id: 'none',
    name: '🔇 仅海浪声',
    description: '不播放旋律，静听自然潮汐',
    notes: [],
    duration: 0
  }
};

class MiniSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.waveGain = null;
    this.isPlaying = false;
    this.currentTrackId = 'music_box';
    this.loopTimer = null;
    this.scheduledNodes = [];
    this.waveNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.waveGain = this.ctx.createGain();
      this.waveGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.waveGain.connect(this.ctx.destination);

      this.initOceanWaves();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // 温柔自然的海浪环境音合成（粉噪/白噪 + LFO 缓慢潮汐滤波器）
  initOceanWaves() {
    if (!this.ctx || this.waveNodes.length > 0) return;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.04;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // 模拟浪涌浪退的动态低通滤波
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.14, this.ctx.currentTime); // 约 7 秒一个海浪周期
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      whiteNoise.connect(filter);
      filter.connect(this.waveGain);

      whiteNoise.start(0);
      lfo.start(0);

      this.waveNodes.push(whiteNoise, lfo, filter, lfoGain);
    } catch (e) {
      console.warn('海浪音初始化失败', e);
    }
  }

  playNote(freq, startTime, duration, instrument = 'bell') {
    if (!this.ctx || !freq) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (instrument === 'bell') {
      // 八音盒：纯净正弦音，泛音晶莹
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(duration * 1.5, 0.6));
    } else if (instrument === 'guitar') {
      // 温暖木吉他：三角波
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.38, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 1.8);
    } else {
      // 卡农钢琴：柔和正弦波
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.30, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 2.0);
    }

    osc.frequency.setValueAtTime(freq, startTime);
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration * 2.2);

    this.scheduledNodes.push(osc, gain);
  }

  play(trackId = 'music_box', loop = true) {
    this.stopMelody();
    this.init();

    this.currentTrackId = trackId;
    this.isPlaying = true;

    // 确保海浪声音量正常
    if (this.waveGain && this.ctx) {
      this.waveGain.gain.setValueAtTime(trackId === 'none' ? 0.22 : 0.10, this.ctx.currentTime);
    }

    if (trackId === 'none' || !TRACKS[trackId]) return;

    const track = TRACKS[trackId];
    if (!track.notes || track.notes.length === 0) return;

    const scheduleTrack = () => {
      if (!this.isPlaying || this.currentTrackId !== trackId) return;
      if (!this.ctx) return;
      const now = this.ctx.currentTime + 0.05;

      for (const [noteName, dur, offset] of track.notes) {
        const freq = NOTE_FREQS[noteName];
        if (freq) {
          this.playNote(freq, now + offset, dur, track.instrument);
        }
      }

      if (loop) {
        this.loopTimer = setTimeout(scheduleTrack, track.duration * 1000);
      }
    };

    scheduleTrack();
  }

  stopMelody() {
    clearTimeout(this.loopTimer);
    this.loopTimer = null;
    
    for (const node of this.scheduledNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) {}
    }
    this.scheduledNodes = [];
  }

  stop() {
    this.isPlaying = false;
    this.stopMelody();
    if (this.waveGain && this.ctx) {
      this.waveGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  preview(trackId, onEnd) {
    this.stopMelody();
    if (trackId === 'none') {
      if (this.waveGain && this.ctx) {
        this.waveGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      }
      if (onEnd) onEnd();
      return;
    }
    this.play(trackId, false);
    const track = TRACKS[trackId];
    if (track && track.duration) {
      this.loopTimer = setTimeout(() => {
        this.stopMelody();
        if (onEnd) onEnd();
      }, track.duration * 1000);
    }
  }

  setVolume(vol) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }
}

export const synth = new MiniSynth();

