import { db } from './dist/db/client.js';

try {
  const result = await db.execute(`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'proof_vault'
    order by ordinal_position
  `);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(err);
  process.exit(1);
}
