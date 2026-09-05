export const REPORT_STATUS_VALUES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETE",
  "REJECTED",
] as const;

// A rejection with no explanation is as useless as no record at all - enforced here since this is the boundary a client can't skip.
export function rejectReasonRequired(data: {
  status: string;
  adminNote?: string | null;
}): boolean {
  return data.status !== "REJECTED" || Boolean(data.adminNote?.trim());
}

export const REJECT_REASON_REFINE_PARAMS: { message: string; path: string[] } =
  {
    message: "reasonRequired",
    path: ["adminNote"],
  };

export function reportValidationErrorMessage(
  t: (key: string) => string,
  issues: { message: string }[],
): string {
  const isReasonMissing = issues.some(
    (issue) => issue.message === "reasonRequired",
  );
  return isReasonMissing
    ? t("reportRejectReasonRequired")
    : t("invalidRequest");
}
