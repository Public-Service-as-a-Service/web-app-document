import { exec } from 'child_process';
import path from 'path';
import fs from 'node:fs';
import { config } from 'dotenv';
import { ExecException } from 'node:child_process';
config();

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');

const callback = (error: ExecException | null, stdout: string, stderr: string) => {
  if (error) {
    console.log(`error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  console.log(`Data-contract-generator: ${stdout}`);
};

const main = async () => {
  if (!fs.existsSync(`${PATH_TO_OUTPUT_DIR}/backend`)) {
    fs.mkdirSync(`${PATH_TO_OUTPUT_DIR}/backend`, { recursive: true });
  }
  console.log('Downloading and generating api-docs for backend');
  await exec(
    `curl -o ${PATH_TO_OUTPUT_DIR}/backend/swagger.json ${process.env.NEXT_PUBLIC_API_URL}/swagger.json`
  );
  await exec(
    `npx swagger-typescript-api --modular -p ${PATH_TO_OUTPUT_DIR}/backend/swagger.json -o ${PATH_TO_OUTPUT_DIR}/backend --no-client --clean-output --extract-enums`,
    callback
  );
};

main();
