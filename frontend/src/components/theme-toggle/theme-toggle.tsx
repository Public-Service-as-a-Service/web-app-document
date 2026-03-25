'use client';

import { useGui } from '@sk-web-gui/theme';
import { ColorSchemeMode } from '@sk-web-gui/theme';
import { Sun, Moon, Monitor } from 'lucide-react';

const modes = [
  { mode: ColorSchemeMode.Light, Icon: Sun, label: 'Ljust' },
  { mode: ColorSchemeMode.Dark, Icon: Moon, label: 'Mörkt' },
  { mode: ColorSchemeMode.System, Icon: Monitor, label: 'System' },
] as const;

const ThemeToggle = () => {
  const { colorScheme, setColorScheme } = useGui();

  return (
    <div className="flex items-center rounded-[0.8rem] bg-primitives-overlay-darken-1 p-[0.3rem]">
      {modes.map(({ mode, Icon, label }) => {
        const active = colorScheme === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setColorScheme(mode)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-[0.6rem] transition-all ${
              active
                ? 'bg-background-100 text-dark-primary shadow-sm'
                : 'text-dark-secondary hover:text-dark-primary'
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
