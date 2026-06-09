CREATE TYPE "public"."workspace_kind" AS ENUM('personal', 'team');
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'editor', 'viewer');
CREATE TYPE "public"."project_type" AS ENUM('field', 'wall', 'floorplan');
CREATE TYPE "public"."project_visibility" AS ENUM('private', 'unlisted', 'public');
CREATE TYPE "public"."share_mode" AS ENUM('view', 'copy');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "display_name" text NOT NULL,
  "handle" text NOT NULL UNIQUE,
  "bio" text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "kind" "workspace_kind" DEFAULT 'personal' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role" "workspace_role" DEFAULT 'owner' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_member_unique" ON "workspace_members" ("workspace_id", "user_id");

CREATE TABLE IF NOT EXISTS "follows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "follower_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "artist_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "follow_unique" ON "follows" ("follower_id", "artist_id");

CREATE TABLE IF NOT EXISTS "colors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "hex" text NOT NULL,
  "code" text,
  "quantity_owned" integer DEFAULT 0 NOT NULL,
  "weight" integer,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "type" "project_type" NOT NULL,
  "visibility" "project_visibility" DEFAULT 'private' NOT NULL,
  "data" jsonb NOT NULL,
  "thumbnail" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "token" text NOT NULL UNIQUE,
  "mode" "share_mode" DEFAULT 'view' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
