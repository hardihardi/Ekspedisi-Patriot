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
  
  // Replace grey text and borders
  content = content.replace(/\[#566[aA]7[fF]\]/g, 'slate-500');  
  content = content.replace(/\[#32475[cC]\]/g, 'slate-800');
  content = content.replace(/\[#a1acb8\]/g, 'slate-400'); 
  
  // Replace light backgrounds and borders
  content = content.replace(/\[#f8f7fa\]/g, 'slate-50');
  content = content.replace(/\[#f8f9fa\]/g, 'slate-50');
  content = content.replace(/\[#f5f5f0\]/g, 'slate-50');
  content = content.replace(/\[#f5f5f9\]/g, 'slate-100');
  content = content.replace(/\[#eceef1\]/g, 'slate-300'); // Let's make this 200 or 300
  content = content.replace(/\[#d9dee3\]/g, 'slate-300');
  content = content.replace(/\[#5[aA]5[aA]40\]/g, 'slate-700'); 
  
  fs.writeFileSync(file, content);
});

console.log('Colors replaced.');
