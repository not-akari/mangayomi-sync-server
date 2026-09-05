import { db } from "@/lib/db";

export const exportRepository = {
  // Everything a user could call "my data", excluding passwordHash and other accounts; catalog data is inlined, not just a foreign id.
  async exportUserData(userId: string) {
    const [user, settings, mangas, tracks, histories, updates] =
      await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            email: true,
            role: true,
            createdAt: true,
            avatarUrl: true,
          },
        }),
        db.settings.findUnique({ where: { userId } }),
        db.manga.findMany({
          where: { userId },
          include: {
            catalogEntry: true,
            categories: { include: { category: { select: { name: true } } } },
            chapterStates: { include: { catalogChapter: true } },
          },
        }),
        db.track.findMany({ where: { userId } }),
        db.history.findMany({ where: { userId } }),
        db.update.findMany({ where: { userId } }),
      ]);

    return { user, settings, mangas, tracks, histories, updates };
  },
};
