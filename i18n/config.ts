// Starting with English only - adding a locale is just a new messages/<code>.json file plus one more entry here.
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE_NAME = "locale";
