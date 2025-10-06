import { db } from './db';
import { sql } from 'drizzle-orm';

async function migrateEmbeddings() {
  console.log('🔄 Starting embedding migration from 1536 to 768 dimensions...');
  
  try {
    console.log('Step 1: Dropping existing vector index...');
    await db.execute(sql`DROP INDEX IF EXISTS chunks_embedding_idx`);
    console.log('✅ Vector index dropped');

    console.log('Step 2: Dropping existing embedding column...');
    await db.execute(sql`ALTER TABLE chunks DROP COLUMN IF EXISTS embedding`);
    console.log('✅ Embedding column dropped');

    console.log('Step 3: Adding new embedding column with 768 dimensions...');
    await db.execute(sql`ALTER TABLE chunks ADD COLUMN embedding vector(768)`);
    console.log('✅ New embedding column added');

    console.log('Step 4: Creating new IVFFlat vector index for dot-product similarity...');
    await db.execute(sql`
      CREATE INDEX chunks_embedding_idx 
      ON chunks 
      USING ivfflat (embedding vector_ip_ops) 
      WITH (lists = 100)
    `);
    console.log('✅ Vector index created');

    console.log('Step 5: Getting document count...');
    const result = await db.execute(sql`SELECT COUNT(DISTINCT doc_id) as count FROM chunks`);
    const docCount = result.rows[0]?.count || 0;
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 ${docCount} documents will need re-embedding`);
    console.log('\n💡 Next steps:');
    console.log('   1. Use the /api/admin/reembed-all endpoint to regenerate embeddings');
    console.log('   2. Or re-upload documents to generate new embeddings');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  migrateEmbeddings()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { migrateEmbeddings };
