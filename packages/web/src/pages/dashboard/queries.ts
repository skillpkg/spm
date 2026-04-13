import { queryOptions } from '@tanstack/react-query';
import { getAuthorStats, searchSkills, getMyOrgs, getOrgMembers } from '../../lib/api';

export const authorStatsQuery = (username: string, token: string) =>
  queryOptions({
    queryKey: ['authorStats', username],
    queryFn: () => getAuthorStats(username, token),
    enabled: !!username && !!token,
  });

export const dashboardSkillsQuery = (username: string) =>
  queryOptions({
    queryKey: ['dashboardSkills', username],
    queryFn: () => searchSkills({ author: username, per_page: 100 }),
    enabled: !!username,
  });

export const myOrgsQuery = (username: string, token: string) =>
  queryOptions({
    queryKey: ['myOrgs', username],
    queryFn: () => getMyOrgs(username, token),
    enabled: !!username && !!token,
  });

export const orgMembersQuery = (orgName: string, token: string) =>
  queryOptions({
    queryKey: ['org', orgName, 'members'],
    queryFn: () => getOrgMembers(orgName, token),
    enabled: !!orgName && !!token,
  });
