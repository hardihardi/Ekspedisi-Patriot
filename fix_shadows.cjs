const fs = require('fs');
const path = require('path');

const srcPages = path.join(process.cwd(), 'src', 'pages');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcPages);
let updatedFiles = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  content = content.replace(/shadow-\[0_8px_30px_rgb\(0,0,0,0\.0[48]\)\]/g, 'shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]');
  content = content.replace(/shadow-\[0_8px_30px_rgba\(0,0,0,0\.04\)\]/g, 'shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]');
  content = content.replace(/shadow-\[0_4px_22px_rgba\(0,0,0,0\.025\)\]/g, 'shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]');
  content = content.replace(/hover:shadow-\[0_8px_30px_rgba\(0,0,0,0\.065\)\]/g, 'hover:shadow-[0_4px_12px_0_rgba(67,89,113,0.15)]');
  content = content.replace(/shadow-\[0_2px_10px_rgba\(0,0,0,0\.04\)\]/g, 'shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]');
  content = content.replace(/border border-slate-100/g, 'border-0');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    updatedFiles++;
    console.log('Updated', file);
  }
});
console.log(`Updated ${updatedFiles} files.`);

