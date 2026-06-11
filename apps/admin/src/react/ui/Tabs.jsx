import { useId } from 'react';
import styles from './Tabs.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Tabs({ activeValue, className = '', items = [], onValueChange, ...props }) {
  const generatedId = useId();
  const activeItem = items.find((item) => item.value === activeValue) || items[0];

  return (
    <div className={cx(styles.tabs, className)} {...props}>
      <div className={styles.list} role="tablist">
        {items.map((item) => {
          const selected = item.value === activeItem?.value;
          const tabId = `${generatedId}-${item.value}-tab`;
          const panelId = `${generatedId}-${item.value}-panel`;

          return (
            <button
              className={cx(styles.tab, selected && styles.selected)}
              disabled={item.disabled}
              id={tabId}
              key={item.value}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                if (!item.disabled && onValueChange) onValueChange(item.value);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.value === activeItem?.value;

        return (
          <section
            className={styles.panel}
            hidden={!selected}
            id={`${generatedId}-${item.value}-panel`}
            key={`${item.value}-panel`}
            role="tabpanel"
            aria-labelledby={`${generatedId}-${item.value}-tab`}
          >
            {item.content}
          </section>
        );
      })}
    </div>
  );
}
