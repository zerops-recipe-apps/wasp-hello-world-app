import type { RecordVisit } from "wasp/server/operations";

/** Bump the single VisitStat row — called once when the home page loads. */
export const recordVisit: RecordVisit<void, { count: number }> = async (
  _args,
  context,
) => {
  const stat = await context.entities.VisitStat.update({
    where: { id: 1 },
    data: { count: { increment: 1 } },
  });

  return { count: stat.count };
};
