import { defineStore } from 'pinia';
import type { Color, Project, User } from '@domino-art/shared';
import { api } from '@/lib/api';

interface WorkspaceSummary {
  id: string;
  name: string;
  kind: string;
  role: string;
  createdAt: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    workspaces: [] as WorkspaceSummary[],
    currentWorkspaceId: null as string | null,
    colors: [] as Color[],
    projects: [] as Project[],
    loading: false,
    error: '' as string,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    currentWorkspace: (state) =>
      state.workspaces.find((workspace) => workspace.id === state.currentWorkspaceId) ?? null,
  },
  actions: {
    async bootstrap() {
      try {
        const data = await api.me();
        this.user = data.user;
        this.workspaces = data.workspaces;
        this.currentWorkspaceId = data.workspaces[0]?.id ?? null;
        if (this.currentWorkspaceId) {
          await this.refreshWorkspaceData();
        }
      } catch {
        this.user = null;
      }
    },
    async register(payload: { email: string; password: string; displayName: string; handle?: string }) {
      this.loading = true;
      this.error = '';
      try {
        const data = await api.register(payload) as {
          user: User;
          workspace: { id: string; name: string; kind: string; createdAt: string };
        };
        this.user = data.user;
        this.workspaces = [{ ...data.workspace, role: 'owner' }];
        this.currentWorkspaceId = data.workspace.id;
        await this.claimDemoProject(data.workspace.id);
        await this.refreshWorkspaceData();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Registration failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async claimDemoProject(workspaceId: string) {
      const { loadDemoState, clearDemoState } = await import('@/lib/idb');
      const demo = await loadDemoState();
      const hasContent = demo.project.data.cells.some(Boolean);
      if (!hasContent) return;
      await api.saveProject(workspaceId, {
        name: demo.project.name,
        type: 'field',
        data: demo.project.data,
        visibility: 'private',
      });
      await clearDemoState();
    },
    async login(payload: { email: string; password: string }) {
      this.loading = true;
      this.error = '';
      try {
        const data = await api.login(payload) as { user: User };
        this.user = data.user;
        await this.bootstrap();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Login failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      await api.logout();
      this.user = null;
      this.workspaces = [];
      this.currentWorkspaceId = null;
      this.colors = [];
      this.projects = [];
    },
    async refreshWorkspaceData() {
      if (!this.currentWorkspaceId) return;
      const [colorsData, projectsData] = await Promise.all([
        api.colors(this.currentWorkspaceId),
        api.projects(this.currentWorkspaceId),
      ]);
      this.colors = colorsData.colors;
      this.projects = projectsData.projects;
    },
    setWorkspace(workspaceId: string) {
      this.currentWorkspaceId = workspaceId;
      return this.refreshWorkspaceData();
    },
  },
});
