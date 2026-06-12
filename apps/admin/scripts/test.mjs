import { runProductsContractTests } from '../test/products.contract.test.mjs';
import { runHashSyncTests } from '../test/hash-sync.test.mjs';
import { runDashboardReactTests } from '../test/dashboard-react.test.mjs';
import { runLoginReactTests } from '../test/login-react.test.mjs';
import { runProductsListReactTests } from '../test/products-list-react.test.mjs';
import { runReactViewAdapterTests } from '../test/react-view-adapter.test.mjs';
import { runReactUiFoundationTests } from '../test/react-ui-foundation.test.mjs';

const suites = [
  { name: 'products contract helpers', runner: runProductsContractTests },
  { name: 'hash sync helpers', runner: runHashSyncTests },
  { name: 'dashboard react contract', runner: runDashboardReactTests },
  { name: 'login react contract', runner: runLoginReactTests },
  { name: 'products list react contract', runner: runProductsListReactTests },
  { name: 'react view adapter', runner: runReactViewAdapterTests },
  { name: 'react ui foundation', runner: runReactUiFoundationTests },
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
