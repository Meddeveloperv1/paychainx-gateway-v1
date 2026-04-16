export async function callPQSidecar(_payload: unknown) {
  return {
    ok: false,
    mode: 'disabled',
    message: 'PQ sidecar not enabled'
  };
}
