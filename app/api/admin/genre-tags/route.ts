import { NextResponse } from "next/server";
import { statsRepository } from "@/lib/repositories/stats-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { requireScope } from "@/lib/api/api-guards";

export async function GET(): Promise<NextResponse> {
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;
  const [allTags, { nsfwSymbols }] = await Promise.all([
    statsRepository.distinctGenreTags(),
    serverSettingsRepository.get(),
  ]);
  // Symbol-bearing tags are handled by nsfwSymbols as their own signal, not selectable here as a word tag.
  const tags = allTags.filter(
    (tag) => !nsfwSymbols.some((symbol) => tag.includes(symbol)),
  );
  return NextResponse.json({ tags });
}
