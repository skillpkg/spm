import { queryOptions } from '@tanstack/react-query';
import { getOrg, getOrgSkills } from '../../lib/api';

export const orgQuery = (name: string) =>
  queryOptions({
    queryKey: ['org', name],
    queryFn: () => getOrg(name),
    enabled: !!name,
  });

export const orgSkillsQuery = (name: string) =>
  queryOptions({
    queryKey: ['org', name, 'skills'],
    queryFn: () => getOrgSkills(name),
    enabled: !!name,
  });
