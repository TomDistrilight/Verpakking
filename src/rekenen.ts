import type { Invoer, Resultaat } from './engine/types';
import { bereken } from './engine/bereken';

let werker: Worker | null = null;

/** Rekent in een web worker; valt terug op de hoofdthread als workers niet beschikbaar zijn. */
export function rekenAsync(invoer: Invoer): Promise<Resultaat> {
  if (typeof Worker === 'undefined') return Promise.resolve().then(() => bereken(invoer));
  werker?.terminate();
  werker = new Worker(new URL('./engine/worker.ts', import.meta.url), { type: 'module' });
  const w = werker;
  return new Promise((resolve, reject) => {
    w.onmessage = (e: MessageEvent<{ ok: boolean; resultaat?: Resultaat; fout?: string }>) => {
      w.terminate();
      if (werker === w) werker = null;
      if (e.data.ok && e.data.resultaat) resolve(e.data.resultaat);
      else reject(new Error(e.data.fout ?? 'Onbekende fout bij het rekenen.'));
    };
    w.onerror = (e) => {
      w.terminate();
      reject(new Error(e.message || 'De berekening is mislukt.'));
    };
    w.postMessage(invoer);
  });
}
