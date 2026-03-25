import { redirect } from 'next/navigation';
import i18nConfig from './i18nConfig';

const RootIndex = () => {
  redirect(`/${i18nConfig.defaultLocale}`);
};

export default RootIndex;
