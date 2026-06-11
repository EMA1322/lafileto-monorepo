import { runProductsContractTests } from '../test/products.contract.test.mjs';
import { runHashSyncTests } from '../test/hash-sync.test.mjs';
import { runReactViewAdapterTests } from '../test/react-view-adapter.test.mjs';

const suites = [
  { name: 'products contract helpers', runner: runProductsContractTests },
  { name: 'hash sync helpers', runner: runHashSyncTests },
  { name: 'react view adapter', runner: runReactViewAdapterTests },
];

let hasError = false;

for (const suite of suites) {
  try {
    suite.runner();
    console.log(`[admin][test] ✓ ${suite.name}`);
  } catch (error) {
    hasError = true;
    console.error(`[admin][test] ✕ ${suite.name}`);
    console.error(error);
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('[admin][test] All suites passed');
}
