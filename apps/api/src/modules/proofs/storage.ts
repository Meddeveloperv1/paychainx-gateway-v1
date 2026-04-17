import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function isStorageEnabled() {
  return process.env.EVIDENCE_BUNDLE_STORAGE_ENABLED === 'true';
}

function getClient() {
  const region = process.env.EVIDENCE_BUNDLE_REGION || 'us-east-1';
  const endpoint = process.env.EVIDENCE_BUNDLE_ENDPOINT || undefined;
  const accessKeyId = process.env.EVIDENCE_BUNDLE_ACCESS_KEY || '';
  const secretAccessKey = process.env.EVIDENCE_BUNDLE_SECRET_KEY || '';

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint,
    credentials: accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined
  });
}

export async function storeEvidenceBundle(input: {
  proofId: string;
  merchantReference: string;
  payload: unknown;
}) {
  if (!isStorageEnabled()) {
    return {
      ok: false,
      uri: null
    };
  }

  const bucket = process.env.EVIDENCE_BUNDLE_BUCKET;
  if (!bucket) {
    return {
      ok: false,
      uri: null
    };
  }

  const key = `proofs/${input.merchantReference}/${input.proofId}.json`;
  const body = JSON.stringify(input.payload, null, 2);

  const client = getClient();

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json'
  }));

  const publicBase = process.env.EVIDENCE_BUNDLE_PUBLIC_BASE_URL || '';
  const uri = publicBase
    ? `${publicBase.replace(/\/$/, '')}/${key}`
    : `s3://${bucket}/${key}`;

  return {
    ok: true,
    uri
  };
}
