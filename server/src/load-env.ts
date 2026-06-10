import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function findEnvFile(startDir: string): string | undefined {
  let dir = resolve(startDir);

  while (true) {
    const envPath = resolve(dir, '.env');
    if (existsSync(envPath)) return envPath;

    const parent = resolve(dir, '..');
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const envPath = findEnvFile(process.cwd());
if (envPath) {
  config({ path: envPath });
}
