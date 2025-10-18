# UI Kit naranja — Admin

> Tema oscuro alegre para el panel de administración. Incluye tokens globales, componentes base en CSS y helpers de UI listos para usar.

## Tokens (`styles/core/tokens.css`)

Variables principales:

- `--color-bg`, `--color-surface`, `--color-text` para fondo y texto.
- Marca: `--brand-600` (#FDC300), `--brand-700`, `--brand-800`.
- Estados: `--success-600`, `--info-600`, `--warning-600`, `--danger-600`.
- Tipografía (`--font-sans`), tamaños (`--fs-*`) y espaciados (`--space-*`).
- Sombras suaves (`--shadow-soft`, `--shadow-md`, `--shadow-lg`) y radios (`--radius-*`).
- Animaciones (`--dur-*`, `--easing`) y foco (`--focus-ring`).

> Todos los componentes usan estas variables, por lo que es sencillo ajustar la identidad cromática futura.

## Base (`styles/core/base.css`)

- Reset ligero con `box-sizing`, `color-scheme: dark` y body sin márgenes.
- Utilidades `.container`, `.row`, `.stack` con spacing automático.
- Focus visible consistente usando `--focus-ring`.
- Helper `.sr-only` para contenido accesible.

## Componentes (`styles/components/components.css`)

### Botones

```html
<button class="btn">Default</button>
<button class="btn btn--primary">Primary</button>
<button class="btn btn--secondary">Secondary</button>
<button class="btn btn--ghost">Ghost</button>
<button class="btn btn--success">Success</button>
<button class="btn btn--danger">Danger</button>
<button class="btn btn--primary btn--sm">Pequeño</button>
<button class="btn btn--primary btn--lg">Grande</button>
```

### Inputs y selects

```html
<label class="stack">
  <span>Nombre</span>
  <input class="input" placeholder="Ej: Naranja Alegre" />
</label>
<label class="stack">
  <span>Descripción</span>
  <textarea class="textarea" rows="3"></textarea>
</label>
<label class="stack">
  <span>Rol</span>
  <select class="select">
    <option>role-admin</option>
    <option>role-cocinero</option>
  </select>
</label>
```

### Card

```html
<div class="card">
  <h3>Estado del sistema</h3>
  <p>Todo funcionando 👌</p>
</div>
```

### Tabla

```html
<div class="table-wrap">
  <table class="table">
    <thead>
      <tr>
        <th>Usuario</th>
        <th>Rol</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Admin</td>
        <td><span class="badge badge--success">role-admin</span></td>
        <td>ACTIVE</td>
      </tr>
      <tr>
        <td>Cocinero</td>
        <td><span class="badge badge--muted">role-cocinero</span></td>
        <td>INACTIVE</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Switch

```html
<button class="switch" role="switch" aria-checked="true">
  <span class="switch__dot"></span>
</button>
```

### Modal

```html
<div class="modal" hidden>
  <div class="modal__panel" role="dialog" aria-modal="true">
    <button class="btn btn--ghost btn--sm modal__close" aria-label="Cerrar">&times;</button>
    <h2 class="modal__title">Modal de ejemplo</h2>
    <div class="modal__body">
      Contenido editable según la vista.
    </div>
    <div class="modal__actions">
      <button class="btn btn--secondary">Cancelar</button>
      <button class="btn btn--primary">Guardar</button>
    </div>
  </div>
</div>
```

### Toast

```html
<div class="toast toast--success toast--visible">Cambios guardados</div>
<div class="toast toast--error toast--visible">Hubo un problema</div>
```

## Helpers JS

### Snackbar (`utils/snackbar.js`)

```js
import { showToast } from '@/utils/snackbar.js';

// Mensaje simple
showToast({ message: 'Actualización exitosa' });

// Variante custom y duración más larga
showToast({
  message: 'Ups, revisá los datos',
  type: 'error',
  timeout: 4000,
});
```

> Para compatibilidad se mantiene `showSnackbar(...)`, que internamente delega en `showToast`.

### Modal (`utils/modal.js`)

```js
import { openModal } from '@/utils/modal.js';

const modal = openModal({
  title: 'Crear módulo',
  content: `
    <p>Completá los datos obligatorios para continuar.</p>
    <label class="stack stack--tight">
      <span>Nombre</span>
      <input class="input" placeholder="Ej: Inventario" />
    </label>
  `,
  actions: [
    { label: 'Cancelar', variant: 'ghost' },
    {
      label: 'Guardar',
      variant: 'primary',
      onClick: () => console.log('guardar clickeado'),
    },
  ],
});

// Ejemplo de cierre manual (p.ej. después de una promesa)
setTimeout(() => modal.close(), 3000);
```

## Prueba rápida

1. `pnpm -F admin dev`
2. Abrir cualquier vista del Admin: los estilos core se cargan automáticamente.
3. Desde la consola del navegador ejecutar los ejemplos de `showToast`/`openModal` para validar helpers.

> Este kit no modifica flujos existentes: sólo provee estilos y utilidades reutilizables para próximas pantallas.
