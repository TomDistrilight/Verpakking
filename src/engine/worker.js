// Rekent in een aparte thread, zodat het scherm blijft reageren.
import { bereken } from './bereken';
self.onmessage = (e) => {
    try {
        self.postMessage({ ok: true, resultaat: bereken(e.data) });
    }
    catch (err) {
        self.postMessage({ ok: false, fout: err instanceof Error ? err.message : String(err) });
    }
};
