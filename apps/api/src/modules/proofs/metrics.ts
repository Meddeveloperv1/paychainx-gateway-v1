import { db } from '../../db/client.js';

export async function getProofQueueMetrics() {
  const rows = await db.execute(`
    select status, count(*) as count
    from proof_jobs
    group by status
    order by status
  `);

  return rows.rows;
}
