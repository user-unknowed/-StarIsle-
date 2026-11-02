// MongoDB Atlas 访问封装（每次请求建立连接，低流量场景足够）
import { MongoClient } from 'mongodb';

const DB_NAME = 'message_wall';

export async function withCollection(env, fn) {
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI secret 未配置');
  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
  });
  try {
    await client.connect();
    const col = client.db(DB_NAME).collection('messages');
    return await fn(col);
  } finally {
    try { await client.close(); } catch (e) { /* ignore */ }
  }
}

// 保证索引存在（幂等）
export async function ensureIndex(env) {
  await withCollection(env, (col) => col.createIndex({ status: 1, createdAt: -1 }));
}