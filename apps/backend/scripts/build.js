import { execSync } from 'child_process';

const target = execSync('rustc --print host-tuple').toString().trim();

execSync(`bun build ./src/index.ts --compile --outfile ../native/src-tauri/binaries/backend-${target}`);
