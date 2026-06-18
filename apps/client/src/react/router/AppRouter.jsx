import { HashRouter, Route, Routes } from 'react-router-dom';
import { BaseLayout } from '../layouts/BaseLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { ProductsPage } from '../pages/ProductsPage.jsx';
import { CartPage } from '../pages/CartPage.jsx';
import { ConfirmPage } from '../pages/ConfirmPage.jsx';
import { ContactPage } from '../pages/ContactPage.jsx';

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
          <Route path="contact" element={<ContactPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="r/contact" element={<ContactPage />} />
          <Route path="r/contacto" element={<ContactPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="r/cart" element={<CartPage />} />
          <Route path="confirm" element={<ConfirmPage />} />
          <Route path="r/confirm" element={<ConfirmPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
