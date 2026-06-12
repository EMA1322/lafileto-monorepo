import { runProductsContractTests } from '../test/products.contract.test.mjs';
import { runProductsCrudReactTests } from '../test/products-crud-react.test.mjs';
import { runProductsOffersReactTests } from '../test/products-offers-react.test.mjs';
import { runHashSyncTests } from '../test/hash-sync.test.mjs';
import { runDashboardReactTests } from '../test/dashboard-react.test.mjs';
import { runLoginReactTests } from '../test/login-react.test.mjs';
import { runProductsListReactTests } from '../test/products-list-react.test.mjs';
import { runReactViewAdapterTests } from '../test/react-view-adapter.test.mjs';
import { runReactUiFoundationTests } from '../test/react-ui-foundation.test.mjs';
import { runCategoriesReactTests } from '../test/categories-react.test.mjs';
import { runUsersRolesReactTests } from '../test/users-roles-react.test.mjs';

const suites = [
  { name: 'products contract helpers', runner: runProductsContractTests },
  { name: 'products crud react contract', runner: runProductsCrudReactTests },
  { name: 'products offers react contract', runner: runProductsOffersReactTests },
  { name: 'hash sync helpers', runner: runHashSyncTests },
  { name: 'dashboard react contract', runner: runDashboardReactTests },
  { name: 'login react contract', runner: runLoginReactTests },
  { name: 'products list react contract', runner: runProductsListReactTests },
  { name: 'categories react contract', runner: runCategoriesReactTests },
  { name: 'users roles react contract', runner: runUsersRolesReactTests },
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
