export class CyberSourceAdapter {
  async sale(input) {
    return {
      processor: 'cybersource',
      success: false,
      status: 'failed',
      responsePayload: { note: 'adapter stub wired' }
    };
  }
}
