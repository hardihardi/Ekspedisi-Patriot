const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
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

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replacements
  content = content.replace(/\[#696[cC][fF]{2}\]/g, 'primary-600');
  content = content.replace(/\[#5[fF]61[eE]6\]/g, 'primary-700');
  
  // Replace indigo-* and blue-* with primary-*
  // We use word boundaries to avoid replacing parts of other words
  content = content.replace(/\bindigo-([0-9]+)\b/g, 'primary-$1');
  content = content.replace(/\bblue-([0-9]+)\b/g, 'primary-$1');
  
  fs.writeFileSync(file, content);
});

console.log('Replacement complete.');
