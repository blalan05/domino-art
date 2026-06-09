const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(typeof error.error === 'string' ? error.error : 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  register: (body: { email: string; password: string; displayName: string; handle?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: import('@domino-art/shared').User; workspaces: Array<{ id: string; name: string; kind: string; role: string; createdAt: string }> }>('/auth/me'),
  colors: (workspaceId?: string) =>
    request<{ colors: import('@domino-art/shared').Color[] }>(
      '/colors',
      workspaceId ? { headers: { 'x-workspace-id': workspaceId } } : {},
    ),
  createColor: (workspaceId: string, body: Partial<import('@domino-art/shared').Color>) =>
    request('/colors', {
      method: 'POST',
      headers: { 'x-workspace-id': workspaceId },
      body: JSON.stringify(body),
    }),
  updateColor: (workspaceId: string, id: string, body: Partial<import('@domino-art/shared').Color>) =>
    request(`/colors/${id}`, {
      method: 'PATCH',
      headers: { 'x-workspace-id': workspaceId },
      body: JSON.stringify(body),
    }),
  projects: (workspaceId: string) =>
    request<{ projects: import('@domino-art/shared').Project[] }>('/projects', {
      headers: { 'x-workspace-id': workspaceId },
    }),
  getProject: (workspaceId: string, id: string) =>
    request<{ project: import('@domino-art/shared').Project }>(`/projects/${id}`, {
      headers: { 'x-workspace-id': workspaceId },
    }),
  saveProject: (workspaceId: string, body: Partial<import('@domino-art/shared').Project>) =>
    request<{ project: import('@domino-art/shared').Project }>('/projects', {
      method: 'POST',
      headers: { 'x-workspace-id': workspaceId },
      body: JSON.stringify(body),
    }),
  updateProject: (workspaceId: string, id: string, body: Partial<import('@domino-art/shared').Project>) =>
    request<{ project: import('@domino-art/shared').Project }>(`/projects/${id}`, {
      method: 'PATCH',
      headers: { 'x-workspace-id': workspaceId },
      body: JSON.stringify(body),
    }),
  createShare: (workspaceId: string, projectId: string, mode: 'view' | 'copy') =>
    request(`/projects/${projectId}/share`, {
      method: 'POST',
      headers: { 'x-workspace-id': workspaceId },
      body: JSON.stringify({ mode }),
    }),
  getShare: (token: string) => request(`/share/${token}`),
  copyShare: (workspaceId: string, token: string) =>
    request(`/share/${token}/copy`, {
      method: 'POST',
      headers: { 'x-workspace-id': workspaceId },
    }),
  exportProject: (workspaceId: string, projectId: string) =>
    request(`/projects/${projectId}/export`, {
      headers: { 'x-workspace-id': workspaceId },
    }),
  importProject: (workspaceId: string, payload: unknown) =>
    request('/projects/import', {
      method: 'POST',
      headers: { 'x-workspace-id': workspaceId },
      body: JSON.stringify({ payload }),
    }),
  discover: () => request<{ projects: Array<{ id: string; name: string; type: string; thumbnail: string | null; updatedAt: string }> }>('/social/discover'),
  artist: (handle: string) => request(`/social/artists/${handle}`),
  follow: (artistId: string) => request(`/social/follow/${artistId}`, { method: 'POST' }),
  unfollow: (artistId: string) => request(`/social/follow/${artistId}`, { method: 'DELETE' }),
  followingFeed: () => request<{ projects: Array<{ id: string; name: string; type: string; thumbnail: string | null; updatedAt: string }> }>('/social/following/feed'),
};
