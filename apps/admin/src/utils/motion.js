import { animate } from '@motionone/dom';

const IN_PRESETS = {
  fadeUp: {
    keyframes: {
      opacity: [0, 1],
      transform: ['translateY(6px) scale(0.98)', 'translateY(0) scale(1)'],
    },
    options: {
      duration: 0.2,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    },
    finalStyle: {
      opacity: '1',
      transform: 'translateY(0) scale(1)',
    },
  },
};

const OUT_PRESETS = {
  fadeUp: {
    keyframes: {
      opacity: [1, 0],
      transform: ['translateY(0) scale(1)', 'translateY(6px) scale(0.98)'],
    },
    options: {
      duration: 0.16,
      easing: 'ease-in',
      fill: 'both',
    },
    finalStyle: {
      opacity: '0',
      transform: 'translateY(6px) scale(0.98)',
    },
  },
};

const countUpState = new WeakMap();

export function shouldReduceMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function resolvePreset(presets, preset) {
  return presets[preset] || presets.fadeUp;
}

function applyFinalStyle(el, styleMap) {
  if (!el || !styleMap) return;
  Object.entries(styleMap).forEach(([prop, value]) => {
    el.style[prop] = value;
  });
}

export function animateIn(el, preset = 'fadeUp') {
  if (!el) return null;
  const config = resolvePreset(IN_PRESETS, preset);
  if (shouldReduceMotion()) {
    applyFinalStyle(el, config.finalStyle);
    return null;
  }
  return animate(el, config.keyframes, config.options);
}

export function animateOut(el, preset = 'fadeUp') {
  if (!el) return null;
  const config = resolvePreset(OUT_PRESETS, preset);
  if (shouldReduceMotion()) {
    applyFinalStyle(el, config.finalStyle);
    return null;
  }
  return animate(el, config.keyframes, config.options);
}

export function countUp(el, toValue, options = {}) {
  if (!el) return;
  const target = Number.parseInt(toValue, 10);
  const finalValue = Number.isFinite(target) ? target : 0;

  const activeToken = countUpState.get(el);
  if (activeToken) activeToken.cancelled = true;

  if (shouldReduceMotion()) {
    el.textContent = String(finalValue);
    return;
  }

  const fromValue = Number.parseInt(el.textContent || '0', 10);
  const startValue = Number.isFinite(fromValue) ? fromValue : 0;
  const durationMs = Math.min(700, Math.max(400, Number(options.duration) || 550));
  const token = { cancelled: false };
  countUpState.set(el, token);

  const startAt = performance.now();
  const easeOutCubic = (t) => 1 - (1 - t) ** 3;

  const tick = (now) => {
    if (token.cancelled) return;
    const progress = Math.min(1, (now - startAt) / durationMs);
    const eased = easeOutCubic(progress);
    const value = Math.round(startValue + (finalValue - startValue) * eased);
    el.textContent = String(value);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      countUpState.delete(el);
    }
  };

  requestAnimationFrame(tick);
}
