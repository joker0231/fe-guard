#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { checkCommand } from './commands/check';
import { reportCommand } from './commands/report';

const program = new Command();

program
  .name('frontend-guard')
  .description('Frontend Guard - AI代码编译级防御器')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(checkCommand);
program.addCommand(reportCommand);

program.parse();
