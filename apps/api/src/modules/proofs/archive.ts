import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const endpoint = process.env.SPACES_ENDPOINT;
const region = process.env.SPACES_REGION || 'sfo2';
const accessKeyId = process.env.SPACES_KEY;
const secretAccessKey = process.env.SPACES_SECRET;
const bucket = process.env.SPACES_BUCKET || 'paychainx-pq-proof-vault';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('SPACES_NOT_CONFIGURED');
  }

  client = new S3Client({
    region,
    endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return client;
}

export async function archiveProofToSpaces(input: {
  proofId: string;
  paymentAttemptId: string;
  merchantReference: string | null;
  proofHash: string;
  proofStatus: string;
  createdAt: Date;
  processor?: string | null;
  processorTransactionId?: string | null;
}) {
  const key = `proofs/${input.proofId}.json`;

  const body = JSON.stringify({
    proof_id: input.proofId,
    payment_attempt_id: input.paymentAttemptId,
    merchant_reference: input.merchantReference,
    proof_hash: input.proofHash,
    proof_status: input.proofStatus,
    created_at: input.createdAt,
    processor: input.processor ?? null,
    processor_transaction_id: input.processorTransactionId ?? null
  });

  const s3 = getClient();

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json'
  }));

  console.log('spaces_proof_archived', { bucket, key });

  return {
    bucket,
    key,
    uri: `s3://${bucket}/${key}`
  };
}
