const fs = require('fs');

const files = [
  './src/pages/Homepage.tsx',
  './src/pages/PublicVerify.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      content = content.replace(/\[#697a8d\]/g, 'slate-500');
      content = content.replace(/\[#8592A3\]/g, 'slate-400');
      content = content.replace(/\[#03c3ec\]/g, 'primary-400'); 
      content = content.replace(/\[#dff7e9\]/g, 'emerald-100'); 
      content = content.replace(/\[#e8dff5\]/g, 'purple-100');
      content = content.replace(/\[#f6ebf4\]/g, 'purple-50');
      content = content.replace(/\[#fce1e4\]/g, 'red-50');
      content = content.replace(/\[#32475c\]/g, 'slate-800');
      content = content.replace(/\[#5f61e6\]/g, 'primary-600');
      content = content.replace(/\[#e7e7ff\]/g, 'primary-100');
      
      fs.writeFileSync(file, content);
  }
});

console.log('Done replacement.');
