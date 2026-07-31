import type { GetVisitStat } from "wasp/server/operations";

export const getVisitStat: GetVisitStat<void, { count: number }> = async (
  _args,
  context,
) => {
  const stat = await context.entities.VisitStat.findUniqueOrThrow({
    where: { id: 1 },
  });

  return { count: stat.count };
};
