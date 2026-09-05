import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  defaultLocale,
  locales,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "./config";

function isSupportedLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

// No URL-prefixed locale. Resolution order: explicit cookie choice, then Accept-Language, then the default.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (isSupportedLocale(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../messages/${cookieLocale}.json`)).default,
    };
  }

  const acceptLanguage = (await headers()).get("accept-language");
  const preferred = acceptLanguage
    ?.split(",")
    .map((entry) => entry.split(";")[0]?.trim().split("-")[0]);
  const matched = preferred?.find((code) => isSupportedLocale(code));

  const locale = matched ?? defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
