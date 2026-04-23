const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const DEST = path.join(__dirname, 'build');

// Módulos nativos (C++) que esbuild NO puede empaquetar → se instalan aparte
const NATIVE_EXTERNALS = ['bcrypt', 'mysql2'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function log(icon, msg) {
  console.log(`${icon}  ${msg}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('🔨 Iniciando build con esbuild...\n');

  // 1. Limpiar build anterior
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
    log('🗑 ', 'Build anterior eliminado.');
  }
  fs.mkdirSync(DEST, { recursive: true });

  // 2. Empaquetar + minificar con esbuild
  try {
    const result = await esbuild.build({
      entryPoints: [path.join(SRC, 'src', 'app.js')],
      bundle: true,          // empaqueta imports/requires
      minify: true,          // minifica (elimina espacios, comentarios)
      platform: 'node',        // target Node.js (no browser APIs)
      target: ['node18'],    // versión mínima de Node
      outfile: path.join(DEST, 'app.js'),
      external: NATIVE_EXTERNALS, // excluye módulos nativos del bundle
      metafile: true,
    });

    // Resumen de módulos incluidos en el bundle
    const meta = result.metafile;
    const outputs = Object.keys(meta.outputs);
    const size = fs.statSync(path.join(DEST, 'app.js')).size;
    log('✅', `Bundle generado → app.js (${(size / 1024).toFixed(1)} KB)`);

  } catch (err) {
    console.error('❌ Error en esbuild:', err.message);
    process.exit(1);
  }

  // 3. Copiar package.json y package-lock.json para instalar deps nativas
  copyFile(path.join(SRC, 'package.json'), path.join(DEST, 'package.json'));
  copyFile(path.join(SRC, 'package-lock.json'), path.join(DEST, 'package-lock.json'));
  log('✅', 'package.json y package-lock.json copiados.');

  // 4. Crear package.json limpio para producción (solo deps nativas necesarias)
  const pkg = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8'));
  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    main: 'app.js',
    scripts: { start: 'node app.js' },
    dependencies: {},
  };
  // Solo incluir las deps nativas (las demás ya están en el bundle)
  for (const dep of NATIVE_EXTERNALS) {
    if (pkg.dependencies[dep]) {
      prodPkg.dependencies[dep] = pkg.dependencies[dep];
    }
  }
  fs.writeFileSync(
    path.join(DEST, 'package.json'),
    JSON.stringify(prodPkg, null, 2)
  );
  log('✅', `package.json de producción creado (solo deps nativas: ${NATIVE_EXTERNALS.join(', ')}).`);

  // 5. Resultado final
  console.log('\n────────────────────────────────────────');
  console.log('📦 Build completado en ./build');
  console.log('────────────────────────────────────────');
  console.log('\n📌 Próximos pasos:');
  console.log('   1. cd build');
  console.log('   2. npm install          ← instala bcrypt y mysql2');
  console.log('   3. Copia tu archivo .env con las variables de entorno');
  console.log('   4. node app.js\n');
})();
