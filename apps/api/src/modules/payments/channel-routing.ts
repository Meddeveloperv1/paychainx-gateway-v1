export type PaymentChannel = 'api' | 'ecommerce' | 'moto' | 'terminal';

export type ChannelRoutingResult = {
  channel: PaymentChannel;
  terminal_id: string | null;
  device_id: string | null;
};

function envBool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === 'true';
}

export function resolveChannelRouting(input: {
  channel?: string;
  terminal_id?: string;
  device_id?: string;
}) : ChannelRoutingResult {
  const channel = (input.channel ?? 'api') as PaymentChannel;

  if (!['api', 'ecommerce', 'moto', 'terminal'].includes(channel)) {
    throw new Error(`UNSUPPORTED_CHANNEL: ${channel}`);
  }

  if (channel === 'moto' && !envBool(process.env.CHANNEL_MOTO_ENABLED, true)) {
    throw new Error('CHANNEL_DISABLED: moto');
  }

  if (channel === 'terminal' && !envBool(process.env.CHANNEL_TERMINAL_ENABLED, true)) {
    throw new Error('CHANNEL_DISABLED: terminal');
  }

  if (channel === 'terminal' && !input.terminal_id) {
    throw new Error('TERMINAL_ID_REQUIRED');
  }

  return {
    channel,
    terminal_id: input.terminal_id ?? null,
    device_id: input.device_id ?? null
  };
}
