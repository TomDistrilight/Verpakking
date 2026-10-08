// Rekent in een aparte thread, zodat het scherm blijft reageren.
import { bereken } from './bereken';
import type { Invoer } from './types';

self.onmessage = (e: MessageEvent<Invoer>) => {
  try {
    (self as unknown as Worker).postMessage({ ok: true, resultaat: bereken(e.data) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, fout: err instanceof Error ? err.message : String(err) });
  }
};
