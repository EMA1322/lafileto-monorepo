import '/src/styles/global.css';
import '/src/styles/tokens.css';
import '/src/styles/header.css';
import '/src/styles/footer.css';

import { mountReactShell } from '/src/react/bootstrap.jsx';
import { mountReactFooter } from '/src/react/footerBootstrap.jsx';
import { mountReactHeader } from '/src/react/headerBootstrap.jsx';

window.addEventListener('DOMContentLoaded', () => {
  mountReactHeader();
  mountReactFooter();
  mountReactShell('main-content');
});
