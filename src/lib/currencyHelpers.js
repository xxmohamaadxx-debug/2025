import { AVAILABLE_CURRENCIES, CURRENCIES, DEFAULT_CURRENCY } from './constants';

export const getCurrencyOptions = () =>
  (AVAILABLE_CURRENCIES?.length ? AVAILABLE_CURRENCIES : Object.keys(CURRENCIES)).map((code) => {
    const info = CURRENCIES[code] || { code };
    const symbol = info.symbol ? `${info.symbol} ` : '';
    const localizedName = info.nameAr || info.name || code;
    return {
      code,
      label: `${symbol}${localizedName} (${info.code || code})`,
    };
  });

export const withDefaultCurrency = (value) => value || DEFAULT_CURRENCY;

