import { db } from "@/lib/db";
import type { Prisma, Report, ReportMessage, ReportStatus } from "@prisma/client";
import type { DbClient } from "./client";

const WITH_REPORTER_AND_MESSAGES = {
  include: {
    user: { select: { username: true } },
    messages: {
      include: { sender: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
    },
  },
} satisfies Prisma.ReportDefaultArgs;

export type ReportWithDetails = Prisma.ReportGetPayload<
  typeof WITH_REPORTER_AND_MESSAGES
>;

export const reportRepository = {
  create(
    params: {
      userId?: string;
      contactUsername?: string;
      contactInfo?: string;
      subject: string;
      message: string;
    },
    client: DbClient = db,
  ): Promise<Report> {
    return client.report.create({ data: params });
  },

  findById(
    id: string,
    client: DbClient = db,
  ): Promise<ReportWithDetails | null> {
    return client.report.findUnique({
      where: { id },
      ...WITH_REPORTER_AND_MESSAGES,
    });
  },

  addMessage(
    params: {
      reportId: string;
      senderId?: string;
      isAdmin: boolean;
      message: string;
    },
    client: DbClient = db,
  ): Promise<ReportMessage & { sender: { username: string } | null }> {
    return client.reportMessage.create({
      data: params,
      include: { sender: { select: { username: true } } },
    });
  },

  listAll(client: DbClient = db): Promise<ReportWithDetails[]> {
    return client.report.findMany({
      ...WITH_REPORTER_AND_MESSAGES,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });
  },

  // Recent open reports for preview card.
  async listOpenRecent(
    limit = 5,
    client: DbClient = db,
  ): Promise<ReportWithDetails[]> {
    return client.report.findMany({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      ...WITH_REPORTER_AND_MESSAGES,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  listForUser(
    userId: string,
    client: DbClient = db,
  ): Promise<ReportWithDetails[]> {
    return client.report.findMany({
      where: { userId },
      ...WITH_REPORTER_AND_MESSAGES,
      orderBy: { createdAt: "desc" },
    });
  },

  countActive(client: DbClient = db): Promise<number> {
    return client.report.count({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
  },

  setStatus(
    id: string,
    status: ReportStatus,
    adminNote: string | null,
    client: DbClient = db,
  ): Promise<Report> {
    const isTerminal = status === "COMPLETE" || status === "REJECTED";
    return client.report.update({
      where: { id },
      data: { status, adminNote, resolvedAt: isTerminal ? new Date() : null },
    });
  },

  async setStatusMany(
    ids: string[],
    status: ReportStatus,
    adminNote: string | null,
    client: DbClient = db,
  ): Promise<number> {
    const isTerminal = status === "COMPLETE" || status === "REJECTED";
    const result = await client.report.updateMany({
      where: { id: { in: ids } },
      data: { status, adminNote, resolvedAt: isTerminal ? new Date() : null },
    });
    return result.count;
  },
};
