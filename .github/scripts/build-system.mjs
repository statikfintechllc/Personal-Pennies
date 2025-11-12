/**
 * Build Script for Personal-Pennies Client-Side System
 * Bundles all system modules into a single file for easy inclusion
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const systemDir = join(__dirname, '../../index.directory/assets/system');
const outputDir = join(__dirname, '../../index.directory/assets/system/dist');

async function build() {
  console.log('Building Personal-Pennies system modules...');

  try {
    // Bundle the storage layer
    await esbuild.build({
      entryPoints: [join(systemDir, 'storage/db.js')],
      bundle: true,
      outfile: join(outputDir, 'storage.bundle.js'),
      format: 'iife',
      globalName: 'PersonalPenniesStorage',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      external: ['localforage']
    });
    console.log('✓ Built storage.bundle.js');

    // Bundle the scripts
    await esbuild.build({
      entryPoints: [
        join(systemDir, 'scripts/utils.js'),
        join(systemDir, 'scripts/parseTrades.js'),
        join(systemDir, 'scripts/generateAnalytics.js')
      ],
      bundle: true,
      outfile: join(outputDir, 'scripts.bundle.js'),
      format: 'iife',
      globalName: 'PersonalPenniesScripts',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      external: ['localforage']
    });
    console.log('✓ Built scripts.bundle.js');

    // Bundle the pipeline
    await esbuild.build({
      entryPoints: [join(systemDir, 'workflows/tradePipeline.js')],
      bundle: true,
      outfile: join(outputDir, 'pipeline.bundle.js'),
      format: 'iife',
      globalName: 'PersonalPenniesPipeline',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      external: ['localforage']
    });
    console.log('✓ Built pipeline.bundle.js');

    // Bundle everything together
    await esbuild.build({
      entryPoints: [join(systemDir, 'workflows/tradePipeline.js')],
      bundle: true,
      outfile: join(outputDir, 'personal-pennies-system.bundle.js'),
      format: 'iife',
      globalName: 'PersonalPenniesSystem',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      minify: true,
      external: ['localforage']
    });
    console.log('✓ Built personal-pennies-system.bundle.js (minified)');

    console.log('\n✓ Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
