import { runProductsContractTests } from '../test/products.contract.test.mjs';

const suites = [
  { name: 'products contract helpers', runner: runProductsContractTests },
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
