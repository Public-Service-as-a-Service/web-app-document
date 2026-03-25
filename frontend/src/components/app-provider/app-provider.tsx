'use client';

import { GuiProvider } from '@sk-web-gui/react';
import { defaultTheme } from '@sk-web-gui/theme';
import dayjs from 'dayjs';
import 'dayjs/locale/sv';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import { ReactNode, useMemo } from 'react';

dayjs.extend(utc);
dayjs.locale('sv');
dayjs.extend(updateLocale);
dayjs.updateLocale('sv', {
  months: [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
  ],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
});

interface AppProviderProps {
  children: ReactNode;
}

const AppProvider = ({ children }: AppProviderProps) => {
  const theme = useMemo(
    () => ({
      ...defaultTheme,
      screens: {
        ...defaultTheme.screens,
        'medium-device-max': '800px',
      },
    }),
    []
  );

  return (
    <GuiProvider theme={theme}>
      {children}
    </GuiProvider>
  );
};

export default AppProvider;
