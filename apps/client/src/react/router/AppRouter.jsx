import { HashRouter, Route, Routes } from 'react-router-dom';
import { BaseLayout } from '../layouts/BaseLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { ProductsPage } from '../pages/ProductsPage.jsx';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<BaseLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="r" element={<HomePage />} />
          <Route path="r/*" element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="r/products" element={<ProductsPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
