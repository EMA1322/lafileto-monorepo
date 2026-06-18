# La Fileto — Visual brief Client PR 9F

## Estado

Documento de dirección visual para la refactorización visual del Client público.

Este documento no implementa código. Su objetivo es fijar una referencia estable para los PRs 9F y evitar repetir criterios visuales en cada prompt.

## Alcance

Aplica solo a `apps/client` y a los PRs visuales del Client público:

1. PR 9F-1 — Client layout foundation
2. PR 9F-2 — ConfirmPage visual + idioma + CSS Module
3. PR 9F-3 — Home visual refactor desktop
4. PR 9F-4 — Contact trust layout
5. PR 9F-5 — Header/Footer/Drawer polish
6. PR 9F-6 — ProductCard consistency pass
7. PR 9F-7 — Cart visual refinement

No aplica a Admin ni Backend salvo bloqueo real demostrado.

## Dirección visual

La Fileto debe sentirse como una web gastronómica elegante, cálida y apetecible, con identidad propia.

Debe transmitir:

- comida rica;
- cercanía barrial argentina;
- pedido simple, rápido y confiable;
- claridad para elegir, revisar y pedir por WhatsApp.

Debe evitar:

- estética genérica de IA;
- cards impersonales;
- gradientes decorativos sin intención;
- layouts demasiado template;
- apariencia de dashboard administrativo;
- textos neutros o corporativos.

## Concepto rector: Identidad visual + Antojo Digital

El producto/comida debe ser protagonista.

Los CTAs deben invitar a la acción con claridad:

- Ver menú
- Armar pedido
- Pedir por WhatsApp

Las cards deben parecer menú gastronómico, no catálogo administrativo.

Los precios, ofertas y disponibilidad deben leerse rápido.

El diseño debe dar hambre: imágenes grandes, fondos cálidos, detalles de textura, sombras suaves y jerarquía clara.

## Paleta base

La paleta puede mejorarse durante los PRs, pero debe respetar estos roles iniciales.

Tokens CSS sugeridos:

```css
--lf-appetite: #faa718; /* color principal: dorado/ámbar La Fileto */
--lf-tomato: #d94a2b; /* acento gastronómico: oferta, calor, salsa */
--lf-herb: #4e7d4a; /* frescura: categorías, estados positivos */
--lf-cream: #fff8ec; /* fondo cálido claro */
--lf-surface: #ffffff; /* cards y superficies limpias */
--lf-espresso: #201713; /* sofisticación oscura: header/footer/drawer */
--lf-charcoal: #10100e; /* texto fuerte / contraste */
```

Regla importante: `#FAA718` es el color de marca principal.

La paleta debe usarse con roles, no como decoración aleatoria.

## Tipografía

Usar una combinación tipográfica con personalidad culinaria:

- títulos con carácter;
- texto de lectura limpio;
- jerarquía clara para nombres de productos, precios, CTAs y mensajes de confianza.

Evitar una interfaz neutra tipo dashboard.

No introducir fuentes externas nuevas sin justificar impacto, carga y compatibilidad.

## Layout

El layout debe resolver el problema de desktop angosto.

Principios:

- más ancho útil en 1366, 1440 y 1920;
- bandas full-width cuando aporten identidad;
- contenedores diferenciados por función: shell, editorial, cards, formularios;
- grillas amplias donde corresponda;
- mobile-first sin overflow horizontal;
- no llenar todo el ancho sin criterio.

## Imágenes y apetito visual

La comida debe ser la señal visual primaria.

Usar:

- imágenes grandes cuando aporten deseo;
- encuadres limpios;
- aspect-ratio o dimensiones estables para evitar CLS;
- fondos cálidos y superficies limpias.

Evitar:

- fondos oscuros genéricos sin intención;
- imágenes pequeñas sin jerarquía;
- cards que parezcan listados administrativos.

## Textura y movimiento

Se permite textura sutil, con intención gastronómica/artesanal.

Reglas:

- nunca colocar textura detrás de texto crítico si afecta lectura;
- usar sombras suaves;
- usar microanimaciones humanas y discretas;
- respetar `prefers-reduced-motion`;
- aplicar hover, entrada de secciones y transiciones sin exageración.

## Tono de copy

Usar tono argentino, cercano y claro. Usar vos con naturalidad.

Evitar:

- tono corporativo;
- español neutro rígido;
- frases exageradas;
- textos genéricos de IA.

Microcopy permitido como referencia:

- Pedí rico y sin vueltas.
- Te lo preparamos al toque.
- Elegí, revisá y mandá tu pedido por WhatsApp.
- Armá tu pedido en minutos.
- Mirá el menú y elegí lo que más te tienta.

## Contratos no rompibles del Client

Los PRs visuales no deben romper:

- rutas hash existentes;
- `localStorage['cart']`;
- evento `cart:updated`;
- Header cart-count;
- payload del carrito: `id`, `name`, `price`, `image`, `source`, `quantity`;
- botones `.btn-add-to-cart`;
- atributos `data-id`, `data-name`, `data-price`, `data-image`, `data-source`;
- public settings ya conectado;
- checkout WhatsApp;
- ContactPage funcional.

## Reglas por superficie

### Home

Debe presentar la marca y despertar apetito.

Prioridades:

- hero fuerte;
- CTA claro;
- secciones con ancho desktop útil;
- categorías visuales;
- ofertas con lectura rápida;
- sensación de pedido fácil.

### Products

Debe sentirse como menú gastronómico.

Prioridades:

- lectura rápida de productos;
- precios visibles;
- estados claros;
- cards apetecibles;
- filtros y búsqueda sin apariencia administrativa.

### ProductCard

Debe parecer una pieza de menú, no una fila de catálogo.

Prioridades:

- imagen protagonista;
- nombre claro;
- precio fuerte;
- CTA visible;
- oferta/disponibilidad legible;
- contrato `.btn-add-to-cart` intacto.

### Cart

Debe transmitir revisión simple y confianza.

Prioridades:

- productos claros;
- cantidades fáciles de editar;
- total destacado;
- CTA hacia confirmación;
- empty state útil.

### ConfirmPage

Debe estar en español y alineada al sistema visual.

Prioridades:

- CSS Module;
- datos del cliente claros;
- resumen del pedido;
- CTA WhatsApp confiable;
- errores o ayuda de formulario claros.

### Contact

Debe funcionar como página de confianza.

Prioridades:

- horarios;
- ubicación/mapa;
- WhatsApp/contacto;
- medios de pago;
- datos provenientes de public settings;
- jerarquía comercial profesional.

### Header/Footer/Drawer

Deben sostener marca, navegación y confianza.

Prioridades:

- desktop más ancho;
- estado activo claro;
- drawer mobile intacto;
- Footer menos comprimido;
- contacto/confianza visibles.

## Criterio de aceptación visual general

Un PR visual 9F es aceptable si:

- mejora la identidad gastronómica sin romper contratos;
- reduce apariencia genérica/template;
- mejora desktop sin romper mobile;
- mantiene accesibilidad básica;
- respeta `prefers-reduced-motion` cuando aplique;
- pasa tests/build requeridos;
- termina con dictamen `APTO`, `APTO CON OBSERVACIONES` o `NO APTO`.

## Prohibiciones generales

No hacer en los PRs 9F:

- convertir React + Vite a Next.js;
- tocar Admin;
- tocar Backend salvo bloqueo real demostrado;
- cambiar contratos del carrito;
- cambiar rutas hash;
- rediseñar múltiples superficies en un solo PR;
- introducir dependencias nuevas sin justificación explícita;
- usar gradientes, texturas o animaciones solo como decoración sin intención.
