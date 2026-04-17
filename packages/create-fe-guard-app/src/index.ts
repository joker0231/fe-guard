#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import kleur from 'kleur';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'templates', 'full');

interface CliArgs {
  projectName?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {};
  for (const arg of args) {
    if (!arg.startsWith('-')) {
      result.projectName = arg;
      break;
    }
  }
  return result;
}

function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

async function copyDir(src: string, dest: string, transform: (content: string) => string): Promise<void> {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    // 处理 .gitignore：模板里用 _gitignore，生成时改名
    const destName = entry.name === '_gitignore' ? '.gitignore' : entry.name;
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, transform);
    } else {
      const content = fs.readFileSync(srcPath, 'utf-8');
      const transformed = transform(content);
      fs.writeFileSync(destPath, transformed);
    }
  }
}

async function main(): Promise<void> {
  console.log();
  console.log(kleur.bold().cyan('🛡️  create-fe-guard-app'));
  console.log(kleur.gray('  Scaffolding fe-guard-powered React project'));
  console.log();

  const args = parseArgs(process.argv);
  let projectName = args.projectName;

  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-fe-guard-app',
      validate: (value: string) =>
        isValidPackageName(value) ? true : 'Invalid package name (must be lowercase, no spaces)',
    });
    projectName = response.projectName;
  }

  if (!projectName) {
    console.log(kleur.red('✖ Aborted'));
    process.exit(1);
  }

  if (!isValidPackageName(projectName)) {
    console.log(kleur.red(`✖ Invalid project name: ${projectName}`));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory "${projectName}" exists. Overwrite?`,
      initial: false,
    });
    if (!overwrite) {
      console.log(kleur.red('✖ Aborted'));
      process.exit(1);
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  console.log();
  console.log(kleur.gray(`  → Creating ${kleur.cyan(projectName)} in ${targetDir}`));

  const transform = (content: string): string =>
    content.replace(/\{\{PROJECT_NAME\}\}/g, projectName!);

  await copyDir(TEMPLATE_DIR, targetDir, transform);

  console.log(kleur.green('  ✔ Done!'));
  console.log();
  console.log(kleur.bold('  Next steps:'));
  console.log(kleur.gray(`    cd ${projectName}`));
  console.log(kleur.gray('    pnpm install'));
  console.log(kleur.gray('    pnpm dev'));
  console.log();
}

main().catch((err) => {
  console.error(kleur.red('✖ Error:'), err);
  process.exit(1);
});