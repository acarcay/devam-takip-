import { useEffect, useRef } from 'react';
import { createWorker } from 'tesseract.js';

export default function WebViewOCR({ webViewRef, onMessage }) {
  const callback = useRef(onMessage);
  callback.current = onMessage;
  useEffect(() => {
    let closed = false, worker = null, activeJob = null;
    webViewRef.current = { async postMessage(json) {
      const msg = JSON.parse(json);
      if (activeJob === msg.jobId || closed) return;
      activeJob = msg.jobId;
      try {
        worker = await createWorker('tur+eng', 1, { logger: m => {
          if (!closed) callback.current({ type: 'PROGRESS', jobId: msg.jobId, percent: Math.round((m.progress || 0) * 100), status: 'Görsel okunuyor…' });
        } });
        if (closed) { await worker.terminate(); return; }
        const result = await worker.recognize(msg.image);
        if (!closed) callback.current({ type: 'SUCCESS', jobId: msg.jobId, text: result.data.text });
      } catch (error) {
        if (!closed) callback.current({ type: 'ERROR', jobId: msg.jobId, message: error.message });
      } finally { if (worker) await worker.terminate(); worker = null; }
    } };
    callback.current({ type: 'READY' });
    return () => { closed = true; webViewRef.current = null; if (worker) worker.terminate(); };
  }, [webViewRef]);
  return null;
}
