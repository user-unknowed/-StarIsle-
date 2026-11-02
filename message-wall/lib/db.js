const { MongoClient } = require('mongodb');

const DB_NAME = 'message_wall';
const MESSAGES_COLLECTION = 'messages';

let client = null;

async function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('缺少 MONGODB_URI 环境变量，请参考 .env.example 配置 message-wall/.env');
  }
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    await client.connect();
    const col = client.db(DB_NAME).collection(MESSAGES_COLLECTION);
    await col.createIndex({ status: 1, createdAt: -1 });
  }
  return client.db(DB_NAME);
}

function messages() {
  if (!client) throw new Error('数据库尚未连接');
  return client.db(DB_NAME).collection(MESSAGES_COLLECTION);
}

async function close() {
  if (client) {
    await client.close();
    client = null;
  }
}

module.exports = { getDb, messages, close, DB_NAME, MESSAGES_COLLECTION };
