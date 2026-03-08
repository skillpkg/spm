import type { AppEnv } from '../../types.js';
import { auditLog } from '../../db/schema.js';

export const audit = async (
  db: AppEnv['Variables']['db'],
  actorId: string,
  action: string,
  details: Record<string, unknown>,
  opts?: { skillId?: string; versionId?: string },
) => {
  await db.insert(auditLog).values({
    actorId,
    action,
    skillId: opts?.skillId,
    versionId: opts?.versionId,
    details,
  });
};
