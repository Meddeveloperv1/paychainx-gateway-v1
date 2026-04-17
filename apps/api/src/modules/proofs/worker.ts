import { processOneProofJob } from './queue.js';

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startProofWorker() {
  if (process.env.PROOF_WORKER_ENABLED !== 'true') return;
  if (timer) return;

  const pollMs = Number(process.env.PROOF_QUEUE_POLL_MS || '1000');

  timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processOneProofJob();
    } catch (_) {
    } finally {
      running = false;
    }
  }, pollMs);

  console.log(`proof worker started poll=${pollMs}ms`);
}
