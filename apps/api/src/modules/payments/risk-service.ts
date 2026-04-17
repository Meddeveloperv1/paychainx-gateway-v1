export type RiskDecision = 'allow' | 'review' | 'block';

export type RiskAssessment = {
  decision: RiskDecision;
  score: number;
  flags: string[];
};

function parseBlockedCurrencies(): string[] {
  return (process.env.RISK_BLOCKED_CURRENCIES || '')
    .split(',')
    .map(v => v.trim().toUpperCase())
    .filter(Boolean);
}

function toInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function evaluateRisk(input: {
  amount: number;
  currency: string;
  paymentMethodType: string;
  customerEmail?: string | null;
  customerRef?: string | null;
}) : RiskAssessment {
  const flags: string[] = [];
  let score = 0;

  const blockedCurrencies = parseBlockedCurrencies();
  const reviewAmount = toInt(process.env.RISK_REVIEW_AMOUNT_THRESHOLD, 100000);
  const highAmount = toInt(process.env.RISK_HIGH_AMOUNT_THRESHOLD, 250000);

  const currency = input.currency.toUpperCase();

  if (blockedCurrencies.includes(currency)) {
    flags.push('blocked_currency');
    score += 100;
    return { decision: 'block', score, flags };
  }

  if (input.amount >= reviewAmount) {
    flags.push('review_amount');
    score += 30;
  }

  if (input.amount >= highAmount) {
    flags.push('high_amount');
    score += 40;
  }

  if (input.paymentMethodType === 'sandbox_card') {
    flags.push('sandbox_source');
    score += 10;
  }

  if (input.paymentMethodType === 'card_token') {
    flags.push('stored_credential');
    score += 5;
  }

  if (!input.customerEmail) {
    flags.push('missing_customer_email');
    score += 10;
  }

  if (!input.customerRef) {
    flags.push('missing_customer_ref');
    score += 5;
  }

  const decision: RiskDecision =
    score >= 70 ? 'review' : 'allow';

  return { decision, score, flags };
}
