import { computePosition, offset, flip, shift, autoUpdate } from '@floating-ui/dom';

const TOOLTIP_BOUND_ATTR = 'tooltipBound';
const TOOLTIP_ID_PREFIX = 'tooltip';
const TOOLTIP_GAP_PX = 8;

let tooltipUid = 0;

const tooltipRegistry = new WeakMap();

function nextTooltipId() {
  tooltipUid += 1;
  return `${TOOLTIP_ID_PREFIX}-${tooltipUid}`;
}

function addDescribedBy(triggerEl, tooltipId) {
  const current = (triggerEl.getAttribute('aria-describedby') || '').trim();
  const tokens = current ? current.split(/\s+/).filter(Boolean) : [];
  if (!tokens.includes(tooltipId)) {
    tokens.push(tooltipId);
    triggerEl.setAttribute('aria-describedby', tokens.join(' '));
  }
}

function removeDescribedBy(triggerEl, tooltipId) {
  const current = (triggerEl.getAttribute('aria-describedby') || '').trim();
  if (!current) return;

  const tokens = current
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token !== tooltipId);

  if (tokens.length === 0) {
    triggerEl.removeAttribute('aria-describedby');
    return;
  }

  triggerEl.setAttribute('aria-describedby', tokens.join(' '));
}

export function createTooltip(triggerEl, options = {}) {
  if (!(triggerEl instanceof Element)) return null;

  const content = String(options.content || '').trim();
  if (!content) return null;

  const placement = String(options.placement || 'top');
  const tooltipEl = document.createElement('div');
  const tooltipContentEl = document.createElement('div');

  const tooltipId = nextTooltipId();

  tooltipEl.className = 'tooltip';
  tooltipEl.id = tooltipId;
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.dataset.tooltipPlacement = placement;

  tooltipContentEl.className = 'tooltip__content';
  tooltipContentEl.textContent = content;

  tooltipEl.appendChild(tooltipContentEl);
  document.body.appendChild(tooltipEl);

  const updatePosition = async () => {
    const { x, y, placement: resolvedPlacement } = await computePosition(triggerEl, tooltipEl, {
      placement,
      middleware: [offset(TOOLTIP_GAP_PX), flip(), shift({ padding: TOOLTIP_GAP_PX })],
    });

    Object.assign(tooltipEl.style, {
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`,
    });
    tooltipEl.dataset.tooltipPlacement = resolvedPlacement;
  };

  const stopAutoUpdate = autoUpdate(triggerEl, tooltipEl, updatePosition);
  updatePosition();
  addDescribedBy(triggerEl, tooltipId);

  return {
    triggerEl,
    tooltipEl,
    tooltipId,
    cleanup: () => {
      stopAutoUpdate?.();
      tooltipEl.remove();
    },
  };
}

export function closeTooltip(triggerEl) {
  if (!(triggerEl instanceof Element)) return;
  const state = tooltipRegistry.get(triggerEl);
  if (!state) return;

  state.cleanup?.();
  removeDescribedBy(triggerEl, state.tooltipId);
  tooltipRegistry.delete(triggerEl);
}

function openTooltip(triggerEl) {
  if (!(triggerEl instanceof Element)) return;

  const existing = tooltipRegistry.get(triggerEl);
  if (existing) return;

  const content = triggerEl.dataset.tooltip;
  const placement = triggerEl.dataset.tooltipPlacement || 'top';
  const created = createTooltip(triggerEl, { content, placement });
  if (!created) return;

  tooltipRegistry.set(triggerEl, created);
}

export function initTooltips(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  const triggers = scope.querySelectorAll('[data-tooltip]');

  triggers.forEach((triggerEl) => {
    if (!(triggerEl instanceof HTMLElement)) return;
    if (triggerEl.dataset[TOOLTIP_BOUND_ATTR] === 'true') return;

    triggerEl.dataset[TOOLTIP_BOUND_ATTR] = 'true';

    triggerEl.addEventListener('mouseenter', () => openTooltip(triggerEl));
    triggerEl.addEventListener('mouseleave', () => closeTooltip(triggerEl));
    triggerEl.addEventListener('focus', () => openTooltip(triggerEl));
    triggerEl.addEventListener('blur', () => closeTooltip(triggerEl));
    triggerEl.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeTooltip(triggerEl);
    });
  });
}
