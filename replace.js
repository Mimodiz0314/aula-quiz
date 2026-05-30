import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const replacements = [
  { from: /kahootRed/g, to: 'brandDanger' },
  { from: /kahootBlue/g, to: 'brandPrimary' },
  { from: /kahootYellow/g, to: 'brandAccent' },
  { from: /kahootGreen/g, to: 'brandSuccess' },
  { from: /text-kahootBlue/g, to: 'text-brandPrimary' }, // just in case
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { from, to } of replacements) {
        if (from.test(content)) {
          content = content.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(SRC_DIR);
