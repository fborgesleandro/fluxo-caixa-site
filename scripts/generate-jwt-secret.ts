import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

function main() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env não encontrado');
    process.exit(1);
  }

  let env = fs.readFileSync(envPath, 'utf8');
  const secret = crypto.randomBytes(48).toString('base64url');
  
  if (/^JWT_SECRET=/m.test(env)) {
    env = env.replace(/^JWT_SECRET=.*/m, `JWT_SECRET="${secret}"`);
  } else {
    env += `\nJWT_SECRET="${secret}"\n`;
  }

  fs.writeFileSync(envPath, env, 'utf8');
  console.log('✅ JWT_SECRET atualizado no .env com 48 bytes aleatórios criptograficamente seguros (base64url).');
}

main();
