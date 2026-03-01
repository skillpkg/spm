import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import inquirer from 'inquirer';
import { CATEGORIES, CATEGORY_INFO } from '@spm/shared';
import type { SkillCategory, ManifestInput } from '@spm/shared';
import { icons, c, log, logJson, getOutputMode, logError } from '../lib/output.js';

const SKILL_MD_TEMPLATE = (name: string, description: string): string => `# ${name}

${description}

## Usage

Describe how an AI agent should use this skill.

## Examples

### Example 1

**Input:** Describe a sample input.

**Output:** Describe the expected output.

## Notes

- Add any important notes or constraints here.
`;

const validateKebabCase = (input: string): boolean | string => {
  if (!input) return 'Name is required';
  if (!/^(@[a-z0-9-]+\/)?[a-z][a-z0-9-]*$/.test(input)) {
    return 'Must be kebab-case, start with a letter, optionally scoped with @org/';
  }
  if (input.length < 2 || input.length > 64) {
    return 'Name must be 2-64 characters';
  }
  return true;
};

const getDirName = (): string => {
  const base = path.basename(process.cwd());
  const kebab = base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
  if (/^[a-z][a-z0-9-]*$/.test(kebab) && kebab.length >= 2) {
    return kebab;
  }
  return 'my-skill';
};

export const registerInitCommand = (program: Command): void => {
  program
    .command('init')
    .description('Create a new skill project')
    .option('-y, --yes', 'Use defaults without prompting')
    .action(async (opts: { yes?: boolean }) => {
      const mode = getOutputMode();
      if (mode === 'silent') return;

      try {
        let name: string;
        let description: string;
        let category: SkillCategory;
        let license: string;

        if (opts.yes) {
          name = getDirName();
          description = '';
          category = 'other';
          license = 'MIT';
        } else {
          const categoryChoices = CATEGORIES.map((cat) => ({
            name: `${CATEGORY_INFO[cat].icon}  ${CATEGORY_INFO[cat].display} — ${CATEGORY_INFO[cat].description}`,
            value: cat,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Skill name (kebab-case):',
              default: getDirName(),
              validate: validateKebabCase,
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description:',
              default: '',
            },
            {
              type: 'list',
              name: 'category',
              message: 'Category:',
              choices: categoryChoices,
              default: 'other',
            },
            {
              type: 'input',
              name: 'license',
              message: 'License:',
              default: 'MIT',
            },
          ]);

          name = answers.name as string;
          description = answers.description as string;
          category = answers.category as SkillCategory;
          license = answers.license as string;
        }

        const manifest: ManifestInput = {
          name,
          version: '0.1.0',
          description: description || `A skill for ${name}`,
          category,
          license,
          keywords: [],
          agents: {
            platforms: ['*'],
          },
          spm: {
            manifest_version: 1,
          },
        };

        // Create directories
        await fs.mkdir(path.join(process.cwd(), 'scripts'), { recursive: true });
        await fs.mkdir(path.join(process.cwd(), 'tests'), { recursive: true });

        // Write manifest.json
        await fs.writeFile(
          path.join(process.cwd(), 'manifest.json'),
          JSON.stringify(manifest, null, 2) + '\n',
          'utf-8',
        );

        // Write SKILL.md
        await fs.writeFile(
          path.join(process.cwd(), 'SKILL.md'),
          SKILL_MD_TEMPLATE(name, manifest.description as string),
          'utf-8',
        );

        // Write sample eval.json
        const evalJson = {
          tests: [
            {
              name: 'basic test',
              input: 'Describe a sample input',
              expected_contains: ['expected', 'output'],
            },
          ],
        };
        await fs.writeFile(
          path.join(process.cwd(), 'tests', 'eval.json'),
          JSON.stringify(evalJson, null, 2) + '\n',
          'utf-8',
        );

        if (mode === 'json') {
          logJson({
            name,
            version: '0.1.0',
            category,
            license,
            files: ['manifest.json', 'SKILL.md', 'scripts/', 'tests/eval.json'],
          });
          return;
        }

        log('');
        log(`${icons.success} Created skill ${c.name(name)}`);
        log('');
        log(`  ${c.dim('manifest.json')}  — skill metadata`);
        log(`  ${c.dim('SKILL.md')}       — skill instructions`);
        log(`  ${c.dim('scripts/')}       — automation scripts`);
        log(`  ${c.dim('tests/')}         — eval test cases`);
        log('');
        log(`  Next steps:`);
        log(`    1. Edit ${c.path('SKILL.md')} with your skill instructions`);
        log(`    2. Add test cases to ${c.path('tests/eval.json')}`);
        log(`    3. Run ${c.cmd('spm test')} to validate`);
        log(`    4. Run ${c.cmd('spm pack')} to create a package`);
        log('');
      } catch (err) {
        if (err instanceof Error && err.message.includes('User force closed')) {
          return;
        }
        logError('Failed to initialize skill', err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
};
