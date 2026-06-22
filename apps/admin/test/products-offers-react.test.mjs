import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function routeBlock(source, routeName, nextRouteName) {
  const start = source.indexOf(`${routeName}: {`);
  assert.notEqual(start, -1, `${routeName} route should exist`);

  const end = nextRouteName
    ? source.indexOf(`${nextRouteName}: {`, start + 1)
    : source.indexOf('\n};', start + 1);
  assert.notEqual(end, -1, `${routeName} route block should have a boundary`);

  return source.slice(start, end);
}

function testProductsRouteOnly() {
  const routerSource = read('src/utils/router.js');
  const productsRoute = routeBlock(routerSource, 'products', 'categories');
  const combined = [
    'src/utils/router.js',
    'src/react/pages/ProductsPage.jsx',
    'src/react/pages/index.js',
    'src/react/products/productsList.helpers.js',
    'src/react/products/ProductOfferForm.jsx',
    'src/react/products/ProductOfferDeleteDialog.jsx',
    'package.json',
  ]
    .map(read)
    .join('\n');

  assert.match(productsRoute, /type:\s*ROUTE_TYPE_REACT/);
  assert.doesNotMatch(routerSource, /offers:\s*\{/);
  assert.doesNotMatch(routerSource, /#offers/);
  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter|<Routes\b|<Route\b/,
  );
}

function testOfferApisAndBoundaries() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const formSource = read('src/react/products/ProductOfferForm.jsx');
  const deleteSource = read('src/react/products/ProductOfferDeleteDialog.jsx');
  const helperSource = read('src/react/products/productOffer.helpers.js');
  const combined = `${pageSource}\n${formSource}\n${deleteSource}\n${helperSource}`;

  assert.match(formSource, /offersApi\.create/);
  assert.match(formSource, /offersApi\.update/);
  assert.match(deleteSource, /offersApi\.remove/);
  assert.match(pageSource, /ProductOfferForm/);
  assert.match(pageSource, /ProductOfferDeleteDialog/);
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|auth_token/);
  assert.doesNotMatch(combined, /products\.modals|openProductModal|openDeleteModal/);
}

function testOfferBadgeAndNormalization() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const listHelperSource = read('src/react/products/productsList.helpers.js');

  assert.match(pageSource, /function OfferBadge\(\{ product \}\)/);
  assert.match(pageSource, /product\.offer\.discountPercent/);
  assert.match(pageSource, /product\.offer\.finalPrice/);
  assert.match(listHelperSource, /id:\s*offer\.id\s*\?\?\s*offer\.offerId\s*\?\?\s*null/);
  assert.match(listHelperSource, /discountPercent/);
  assert.match(listHelperSource, /finalPrice/);
  assert.match(listHelperSource, /isActive:\s*true/);
}

function testOfferRbacStaysSeparate() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');

  assert.match(pageSource, /canWrite\('products'\)/);
  assert.match(pageSource, /canUpdate\('products'\)/);
  assert.match(pageSource, /canDelete\('products'\)/);
  assert.match(pageSource, /canWrite\('offers'\)/);
  assert.match(pageSource, /canUpdate\('offers'\)/);
  assert.match(pageSource, /canDelete\('offers'\)/);
  assert.match(pageSource, /canWriteOffer/);
  assert.match(pageSource, /canUpdateOffer/);
  assert.match(pageSource, /canDeleteOffer/);
  assert.match(pageSource, /!hasOffer && permissions\.canWriteOffer/);
  assert.match(pageSource, /hasOffer && permissions\.canUpdateOffer/);
  assert.match(pageSource, /hasOffer && permissions\.canDeleteOffer/);
}

function testOfferValidationAndPayloads() {
  const helperSource = read('src/react/products/productOffer.helpers.js');
  const formSource = read('src/react/products/ProductOfferForm.jsx');
  const combined = `${helperSource}\n${formSource}`;

  assert.match(helperSource, /discountPercent/);
  assert.match(helperSource, /Number\.isFinite\(discountNumber\)/);
  assert.match(helperSource, /Number\.isInteger\(discountNumber\)/);
  assert.match(helperSource, /discountNumber < 1/);
  assert.match(helperSource, /discountNumber > 100/);
  assert.match(helperSource, /productId:\s*product\?\.id/);
  assert.match(helperSource, /discountPercent:\s*Number\(values\.discountPercent\)/);
  assert.match(formSource, /offersApi\.create\(buildOfferCreatePayload\(product, values\)\)/);
  assert.match(
    formSource,
    /offersApi\.update\(product\.offer\.id, buildOfferUpdatePayload\(values\)\)/,
  );
  assert.match(formSource, /isEdit && !product\.offer\?\.id/);

  for (const forbidden of ['startDate', 'endDate', 'startsAt', 'endsAt', 'validFrom', 'validTo']) {
    assert.doesNotMatch(combined, new RegExp(`\\b${forbidden}\\b`));
  }
  assert.doesNotMatch(combined, /\bstatus\b/i);
}

function testMobileCardsExposeOfferActions() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const styles = read('src/react/pages/ProductsPage.module.css');

  assert.match(pageSource, /function ProductsCards/);
  assert.match(pageSource, /<OfferBadge product=\{product\} \/>/);
  assert.match(pageSource, /onOfferCreate=\{onOfferCreate\}/);
  assert.match(pageSource, /onOfferEdit=\{onOfferEdit\}/);
  assert.match(pageSource, /onOfferDelete=\{onOfferDelete\}/);
  assert.match(styles, /\.mobileList/);
  assert.match(styles, /\.tableScroll\s*\{[\s\S]*display:\s*none/);
}

function testProductCrudContractStillPresent() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const productFormSource = read('src/react/products/ProductForm.jsx');
  const productDeleteSource = read('src/react/products/ProductDeleteDialog.jsx');
  const offerFormSource = read('src/react/products/ProductOfferForm.jsx');
  const offerDeleteSource = read('src/react/products/ProductOfferDeleteDialog.jsx');

  assert.match(productFormSource, /productsApi\.create/);
  assert.match(productFormSource, /productsApi\.update/);
  assert.match(productDeleteSource, /productsApi\.remove/);
  assert.match(offerFormSource, /useDialogFocusTrap/);
  assert.match(offerFormSource, /initialFocus:\s*['"]#product-offer-discount-percent['"]/);
  assert.match(offerDeleteSource, /role="alertdialog"/);
  assert.match(offerDeleteSource, /initialFocus:\s*['"]#product-offer-delete-cancel['"]/);
  assert.match(pageSource, /setFormState\(\{ mode: 'create'/);
  assert.match(pageSource, /setFormState\(\{ mode: 'edit'/);
  assert.match(pageSource, /setDeleteTarget\(product\)/);
  assert.match(pageSource, /productsApi\.list\(buildProductsQuery\(filters\)\)/);
  assert.match(pageSource, /serializeFiltersToHash/);
}

function testScopeBoundaries() {
  const scriptSource = read('scripts/test.mjs');

  assert.match(scriptSource, /runProductsOffersReactTests/);
  assert.match(scriptSource, /products offers react contract/);
}

export function runProductsOffersReactTests() {
  testProductsRouteOnly();
  testOfferApisAndBoundaries();
  testOfferBadgeAndNormalization();
  testOfferRbacStaysSeparate();
  testOfferValidationAndPayloads();
  testMobileCardsExposeOfferActions();
  testProductCrudContractStillPresent();
  testScopeBoundaries();
}
