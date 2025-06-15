
// Digital signal processing filters for EEG data
export type FilterType = 'none' | 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface FilterConfig {
  type: FilterType;
  lowCutoff?: number;   // Hz
  highCutoff?: number;  // Hz
  notchFreq?: number;   // Hz (for notch filter)
  order?: number;       // Filter order
  samplingRate: number; // Hz
}

// Simple Butterworth-like IIR filter implementation
class IIRFilter {
  private a: number[];
  private b: number[];
  private x: number[] = [];
  private y: number[] = [];

  constructor(b: number[], a: number[]) {
    this.b = b;
    this.a = a;
    this.x = new Array(b.length).fill(0);
    this.y = new Array(a.length).fill(0);
  }

  process(input: number): number {
    // Shift input history
    this.x.unshift(input);
    this.x.pop();

    // Calculate output
    let output = 0;
    
    // Feed-forward (numerator)
    for (let i = 0; i < this.b.length; i++) {
      output += this.b[i] * this.x[i];
    }
    
    // Feed-back (denominator)
    for (let i = 1; i < this.a.length; i++) {
      output -= this.a[i] * this.y[i - 1];
    }
    
    output /= this.a[0];

    // Shift output history
    this.y.unshift(output);
    this.y.pop();

    return output;
  }

  reset() {
    this.x.fill(0);
    this.y.fill(0);
  }
}

// Moving average filter (simple low-pass)
export class MovingAverageFilter {
  private buffer: number[] = [];
  private windowSize: number;

  constructor(windowSize: number) {
    this.windowSize = windowSize;
  }

  process(input: number): number {
    this.buffer.push(input);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
    
    const sum = this.buffer.reduce((acc, val) => acc + val, 0);
    return sum / this.buffer.length;
  }

  reset() {
    this.buffer = [];
  }
}

// Simple first-order high-pass filter
export class HighPassFilter {
  private previousInput = 0;
  private previousOutput = 0;
  private alpha: number;

  constructor(cutoffFreq: number, samplingRate: number) {
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    const dt = 1 / samplingRate;
    this.alpha = rc / (rc + dt);
  }

  process(input: number): number {
    const output = this.alpha * (this.previousOutput + input - this.previousInput);
    this.previousInput = input;
    this.previousOutput = output;
    return output;
  }

  reset() {
    this.previousInput = 0;
    this.previousOutput = 0;
  }
}

// 50/60Hz notch filter (simple)
export class NotchFilter {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private a1: number;
  private a2: number;
  private b0: number;
  private b1: number;
  private b2: number;

  constructor(notchFreq: number, samplingRate: number, bandwidth = 2) {
    const omega = 2 * Math.PI * notchFreq / samplingRate;
    const alpha = Math.sin(omega) * Math.sinh(Math.log(2) / 2 * bandwidth * omega / Math.sin(omega));
    
    this.b0 = 1;
    this.b1 = -2 * Math.cos(omega);
    this.b2 = 1;
    
    const norm = 1 + alpha;
    this.a1 = this.b1 / norm;
    this.a2 = this.b2 / norm;
    this.b0 /= norm;
    this.b1 /= norm;
    this.b2 /= norm;
  }

  process(input: number): number {
    const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                   - this.a1 * this.y1 - this.a2 * this.y2;
    
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;
    
    return output;
  }

  reset() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
}

// Main filtering function
export const applyFilter = (data: number[], config: FilterConfig): number[] => {
  if (config.type === 'none' || data.length === 0) {
    return [...data];
  }

  let filter: MovingAverageFilter | HighPassFilter | NotchFilter;
  
  switch (config.type) {
    case 'lowpass':
      // Use moving average for simple low-pass filtering
      const windowSize = Math.max(1, Math.floor(config.samplingRate / (config.highCutoff || 30) / 2));
      filter = new MovingAverageFilter(windowSize);
      break;
      
    case 'highpass':
      filter = new HighPassFilter(config.lowCutoff || 0.5, config.samplingRate);
      break;
      
    case 'bandpass':
      // Apply high-pass then low-pass
      const hpFilter = new HighPassFilter(config.lowCutoff || 0.5, config.samplingRate);
      const lpWindowSize = Math.max(1, Math.floor(config.samplingRate / (config.highCutoff || 30) / 2));
      const lpFilter = new MovingAverageFilter(lpWindowSize);
      
      return data.map(value => {
        const hpOutput = hpFilter.process(value);
        return lpFilter.process(hpOutput);
      });
      
    case 'notch':
      filter = new NotchFilter(config.notchFreq || 50, config.samplingRate);
      break;
      
    default:
      return [...data];
  }

  return data.map(value => filter.process(value));
};

// Preset filter configurations for common EEG applications
export const getPresetFilterConfigs = (samplingRate: number): Record<string, FilterConfig> => ({
  none: {
    type: 'none',
    samplingRate
  },
  'low-noise': {
    type: 'lowpass',
    highCutoff: 40,
    samplingRate
  },
  'dc-remove': {
    type: 'highpass',
    lowCutoff: 0.5,
    samplingRate
  },
  'eeg-band': {
    type: 'bandpass',
    lowCutoff: 0.5,
    highCutoff: 40,
    samplingRate
  },
  'notch-50hz': {
    type: 'notch',
    notchFreq: 50,
    samplingRate
  },
  'notch-60hz': {
    type: 'notch',
    notchFreq: 60,
    samplingRate
  }
});
