import fs from 'node:fs';
let html=fs.readFileSync('dist/index.html','utf8').replace('<script src="./runtime-config.js"></script>','');
html=html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,file)=>'<script type="module">'+fs.readFileSync('dist/'+file.replace(/^\.\//,''),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/,(_,file)=>'<style>'+fs.readFileSync('dist/'+file.replace(/^\.\//,''),'utf8')+'</style>');
fs.writeFileSync('Tidebound-Pirates.html',html);
console.log('Created the single-file browser build: Tidebound-Pirates.html');
