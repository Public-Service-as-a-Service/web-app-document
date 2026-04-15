'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

const modes = [
  { mode: 'light' as const, Icon: Sun, label: 'Ljust' },
  { mode: 'dark' as const, Icon: Moon, label: 'Mörkt' },
  { mode: 'system' as const, Icon: Monitor, label: 'System' },
];

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  return (
    <div className="flex items-center rounded-lg bg-muted p-0.5">
      {modes.map(({ mode, Icon, label }) => {
        const active = mounted && theme === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
