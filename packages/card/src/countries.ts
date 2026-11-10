/**
 * Supported card countries. Wirex supports 72 countries and the US is NOT among them
 * (docs/product-spec.md section 9). The authoritative list lives in config and is verified against
 * https://docs.wirexapp.com/docs/supported-countries. This starter set is a placeholder subset to
 * develop against; replace with the confirmed list before launch.
 */
export const SUPPORTED_COUNTRIES_DEFAULT: string[] = [
  // Europe (subset)
  'GB',
  'IE',
  'FR',
  'DE',
  'ES',
  'IT',
  'PT',
  'NL',
  'BE',
  'LU',
  'AT',
  'CH',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'CZ',
  'SK',
  'HU',
  'RO',
  'BG',
  'GR',
  'HR',
  'SI',
  'EE',
  'LV',
  'LT',
  'CY',
  'MT',
  // Other regions (subset)
  'AE',
  'UA',
  'KZ',
  'GE',
  'JP',
  'NG',
  'SG',
  'AU',
  'NZ',
  'BR',
  'MX',
  'AR',
  'CL',
  'CO',
];
