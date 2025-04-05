const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const PLUGINS_DIR = path.join(process.cwd(), 'public', 'plugins');

// Copy non-TypeScript files
function copyAdditionalFiles(pluginDir, distDir) {
  const files = fs.readdirSync(pluginDir);
  files.forEach(file => {
    const filePath = path.join(pluginDir, file);
    if (fs.statSync(filePath).isFile() && 
        !file.endsWith('.ts') && 
        !file.endsWith('.tsx') &&
        file !== 'index.js' &&
        file !== 'index.js.map' &&
        // Don't copy CSS directly, they will be handled by esbuild
        !file.endsWith('.css')) { 
      const destPath = path.join(distDir, file);
      fs.copyFileSync(filePath, destPath);
    }
  });

  // Copy component and operation files
  ['components', 'operations'].forEach(dir => {
    const srcDir = path.join(pluginDir, dir);
    if (fs.existsSync(srcDir)) {
      const destDir = path.join(distDir, dir);
      ensureDirectoryExists(destDir);
      const files = fs.readdirSync(srcDir);
      files.forEach(file => {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.css')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      });
    }
  });
}

// Ensure directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Clean directory
function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  ensureDirectoryExists(dir);
}

// Compile TypeScript files for each plugin
async function buildPlugins() {
  // Get all plugin directories
  const pluginDirs = fs.readdirSync(PLUGINS_DIR)
    .filter(dir => fs.statSync(path.join(PLUGINS_DIR, dir)).isDirectory());

  for (const pluginDir of pluginDirs) {
    console.log(`Building plugin: ${pluginDir}`);
    
    const pluginPath = path.join(PLUGINS_DIR, pluginDir);
    const entryPoint = fs.existsSync(path.join(pluginPath, 'index.tsx')) 
      ? 'index.tsx' 
      : 'index.ts';
    
    try {
      // Always clean the dist directory first to avoid stale files
      cleanDirectory(path.join(pluginPath, 'dist'));

      await esbuild.build({
        entryPoints: [path.join(pluginPath, entryPoint)],
        bundle: true,
        outfile: path.join(pluginPath, 'dist', 'index.js'),
        format: 'esm',
        platform: 'browser',
        target: ['es2020'],
        sourcemap: 'inline',
        loader: {
          '.ts': 'tsx',
          '.tsx': 'tsx',
          '.js': 'jsx',
          '.jsx': 'jsx',
          '.css': 'css',
          '.svg': 'file',
          '.png': 'file',
          '.jpg': 'file'
        },
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        external: ['react', 'react-dom'],
        define: {
          'process.env.NODE_ENV': '"production"'
        },
        // Important: ensure CSS modules are handled as part of the JS bundle
        // This prevents global CSS files from being generated
        assetNames: '[name]',
        publicPath: '/plugins/' + pluginDir + '/dist',
        metafile: true,
        minify: true
      }).then(result => {
        // Copy metafile for debugging if needed
        fs.writeFileSync(
          path.join(pluginPath, 'dist', 'meta.json'),
          JSON.stringify(result.metafile)
        );
      });
      
      // Copy additional files
      copyAdditionalFiles(pluginPath, path.join(pluginPath, 'dist'));
      
      console.log(`Successfully built ${pluginDir}`);
    } catch (error) {
      console.error(`Failed to build ${pluginDir}:`, error);
      process.exit(1);
    }
  }
}

buildPlugins().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});