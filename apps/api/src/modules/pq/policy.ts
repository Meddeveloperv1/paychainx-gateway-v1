import { getPqMode } from "./config.js";

export function getPqPolicy() {
  return {
    mode: getPqMode(),
    client_attestation_required: (process.env.PQ_CLIENT_ATTESTATION_REQUIRED || "false").toLowerCase() === "true",
    accepted_attestation_version: process.env.PQ_ATTESTATION_VERSION || "v1"
  };
}

export function validatePqRequest(headers: Record<string, any>) {
  const policy = getPqPolicy();

  if (policy.mode !== "hybrid-enforced") {
    return {
      allowed: true,
      reason: "pq-not-enforced"
    };
  }

  if (!policy.client_attestation_required) {
    return {
      allowed: true,
      reason: "pq-enforced-server-only"
    };
  }

  const attestation = headers["x-pq-client-attestation"];
  const version = headers["x-pq-attestation-version"];

  if (!attestation || typeof attestation !== "string") {
    return {
      allowed: false,
      reason: "missing-pq-client-attestation"
    };
  }

  if (version !== policy.accepted_attestation_version) {
    return {
      allowed: false,
      reason: "invalid-pq-attestation-version"
    };
  }

  return {
    allowed: true,
    reason: "pq-client-attestation-present"
  };
}
