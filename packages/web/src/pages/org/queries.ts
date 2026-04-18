import { queryOptions } from '@tanstack/react-query';
import { getOrg, getOrgSkills, getOrgMembers } from '../../lib/api';

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

export const orgMembersQuery = (name: string, token: string) =>
  queryOptions({
    queryKey: ['org', name, 'members'],
    queryFn: () => getOrgMembers(name, token),
    enabled: !!name && !!token,
  });
