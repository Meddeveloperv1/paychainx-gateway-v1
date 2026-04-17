import { processOneWebhookDelivery } from './service.js';

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startWebhookWorker() {
  if (process.env.WEBHOOK_WORKER_ENABLED !== 'true') return;
  if (timer) return;

  const pollMs = Number(process.env.WEBHOOK_WORKER_POLL_MS || '1500');

  timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processOneWebhookDelivery();
    } finally {
      running = false;
    }
  }, pollMs);

  console.log(`webhook worker started poll=${pollMs}ms`);
}
