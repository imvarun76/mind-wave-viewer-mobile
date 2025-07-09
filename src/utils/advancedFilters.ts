
// Advanced signal processing utilities for EEG noise reduction

export class DCBlocker {
  private x1 = 0;
  private y1 = 0;
  private alpha: number;

  constructor(cutoffFreq = 0.1, samplingRate = 250) {
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    const dt = 1 / samplingRate;
    this.alpha = rc / (rc + dt);
  }

  process(input: number): number {
    const output = this.alpha * (this.y1 + input - this.x1);
    this.x1 = input;
    this.y1 = output;
    return output;
  }

  reset() {
    this.x1 = this.y1 = 0;
  }
}

export class ArtifactDetector {
  private threshold: number;
  private windowSize: number;
  private buffer: number[] = [];

  constructor(threshold = 500, windowSize = 10) {
    this.threshold = threshold;
    this.windowSize = windowSize;
  }

  detectArtifact(value: number): boolean {
    this.buffer.push(Math.abs(value));
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    // Check for sudden amplitude changes
    if (this.buffer.length >= 2) {
      const current = this.buffer[this.buffer.length - 1];
      const previous = this.buffer[this.buffer.length - 2];
      const change = Math.abs(current - previous);
      
      if (change > this.threshold) {
        return true;
      }
    }

    // Check for saturation
    return Math.abs(value) > this.threshold * 2;
  }
}

export class AdaptiveFilter {
  private buffer: number[] = [];
  private coefficients: number[] = [];
  private learningRate: number;

  constructor(order = 8, learningRate = 0.01) {
    this.learningRate = learningRate;
    this.coefficients = new Array(order).fill(0);
  }

  process(input: number, reference: number): number {
    this.buffer.unshift(input);
    if (this.buffer.length > this.coefficients.length) {
      this.buffer.pop();
    }

    // Calculate output
    let output = 0;
    for (let i = 0; i < Math.min(this.buffer.length, this.coefficients.length); i++) {
      output += this.coefficients[i] * this.buffer[i];
    }

    // Adapt coefficients (LMS algorithm)
    const error = reference - output;
    for (let i = 0; i < Math.min(this.buffer.length, this.coefficients.length); i++) {
      this.coefficients[i] += this.learningRate * error * this.buffer[i];
    }

    return output;
  }
}

export class PowerLineNotchFilter {
  private filters: Array<{x1: number, x2: number, y1: number, y2: number}> = [];
  private coefficients: Array<{b0: number, b1: number, b2: number, a1: number, a2: number}> = [];

  constructor(frequencies: number[], samplingRate = 250, bandwidth = 2) {
    frequencies.forEach(freq => {
      const omega = 2 * Math.PI * freq / samplingRate;
      const alpha = Math.sin(omega) * Math.sinh(Math.log(2) / 2 * bandwidth * omega / Math.sin(omega));
      
      const b0 = 1;
      const b1 = -2 * Math.cos(omega);
      const b2 = 1;
      const norm = 1 + alpha;
      
      this.coefficients.push({
        b0: b0 / norm,
        b1: b1 / norm,
        b2: b2 / norm,
        a1: b1 / norm,
        a2: b2 / norm
      });
      
      this.filters.push({x1: 0, x2: 0, y1: 0, y2: 0});
    });
  }

  process(input: number): number {
    let output = input;
    
    for (let i = 0; i < this.filters.length; i++) {
      const filter = this.filters[i];
      const coeff = this.coefficients[i];
      
      const result = coeff.b0 * output + coeff.b1 * filter.x1 + coeff.b2 * filter.x2
                    - coeff.a1 * filter.y1 - coeff.a2 * filter.y2;
      
      filter.x2 = filter.x1;
      filter.x1 = output;
      filter.y2 = filter.y1;
      filter.y1 = result;
      
      output = result;
    }
    
    return output;
  }
}

// Signal quality assessment
export const assessSignalQuality = (data: number[]): {
  snr: number;
  artifactRatio: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
} => {
  if (data.length < 10) return { snr: 0, artifactRatio: 1, quality: 'poor' };

  // Calculate signal-to-noise ratio
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const signal = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
  
  // Estimate noise (high frequency components)
  let noise = 0;
  for (let i = 1; i < data.length; i++) {
    noise += Math.pow(data[i] - data[i-1], 2);
  }
  noise = Math.sqrt(noise / (data.length - 1));
  
  const snr = signal / (noise + 0.001); // Avoid division by zero
  
  // Count artifacts (values beyond reasonable EEG range)
  const artifacts = data.filter(val => Math.abs(val) > 200).length;
  const artifactRatio = artifacts / data.length;
  
  let quality: 'poor' | 'fair' | 'good' | 'excellent';
  if (snr > 10 && artifactRatio < 0.05) quality = 'excellent';
  else if (snr > 5 && artifactRatio < 0.1) quality = 'good';
  else if (snr > 2 && artifactRatio < 0.2) quality = 'fair';
  else quality = 'poor';
  
  return { snr, artifactRatio, quality };
};
