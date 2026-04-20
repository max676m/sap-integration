import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 MenaBev NPL Backend running on http://localhost:${PORT}`);
    console.log(`📝 Test UI available at http://localhost:${PORT}/`);
    console.log(`💬 Chat API at POST http://localhost:${PORT}/api/chat\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
