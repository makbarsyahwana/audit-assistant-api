import { Injectable } from '@nestjs/common';

/**
 * Lightweight in-process metrics store for Prometheus text exposition.
 * No external dependency needed — exports at GET /metrics.
 */
@Injectable()
export class MetricsService {
  private counters: Map<string, number> = new Map();
  private histogramValues: Map<string, number[]> = new Map();

  incCounter(name: string, labels?: Record<string, string>, value = 1) {
    const key = this.labelKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  observeHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ) {
    const key = this.labelKey(name, labels);
    const arr = this.histogramValues.get(key) || [];
    arr.push(value);
    this.histogramValues.set(key, arr);
  }

  /** Render all metrics in Prometheus text exposition format. */
  render(): string {
    const lines: string[] = [];

    for (const [key, val] of [...this.counters.entries()].sort()) {
      lines.push(`${key} ${val}`);
    }

    for (const [key, values] of [...this.histogramValues.entries()].sort()) {
      if (values.length === 0) continue;
      const baseName = key.includes('{') ? key.split('{')[0] : key;
      const labelPart = key.includes('{') ? key.slice(baseName.length) : '';
      lines.push(`${baseName}_count${labelPart} ${values.length}`);
      lines.push(
        `${baseName}_sum${labelPart} ${values.reduce((a, b) => a + b, 0).toFixed(6)}`,
      );
    }

    return lines.join('\n') + '\n';
  }

  private labelKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const parts = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${parts}}`;
  }
}
