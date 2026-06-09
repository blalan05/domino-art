import { relations } from 'drizzle-orm';
import {
  colors,
  follows,
  projectImages,
  projectShares,
  projects,
  users,
  workspaceMembers,
  workspaces,
} from './schema.js';

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  followers: many(follows, { relationName: 'artistFollowers' }),
  following: many(follows, { relationName: 'followerFollowing' }),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  colors: many(colors),
  projects: many(projects),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const colorsRelations = relations(colors, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [colors.workspaceId],
    references: [workspaces.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  shares: many(projectShares),
  images: many(projectImages),
}));

export const projectSharesRelations = relations(projectShares, ({ one }) => ({
  project: one(projects, {
    fields: [projectShares.projectId],
    references: [projects.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'followerFollowing',
  }),
  artist: one(users, {
    fields: [follows.artistId],
    references: [users.id],
    relationName: 'artistFollowers',
  }),
}));
