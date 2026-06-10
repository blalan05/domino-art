import '../load-env.js';
import { DEFAULT_PALETTE } from '@domino-art/shared';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { colors, workspaceMembers, workspaces } from './schema.js';

export async function seedWorkspaceColors(workspaceId: string) {
  const existing = await db.query.colors.findFirst({
    where: eq(colors.workspaceId, workspaceId),
  });
  if (existing) return;

  await db.insert(colors).values(
    DEFAULT_PALETTE.map((color) => ({
      workspaceId,
      name: color.name,
      hex: color.hex,
      code: color.code,
      quantityOwned: color.quantityOwned,
      sortOrder: color.sortOrder,
    })),
  );
}

async function main() {
  const personalWorkspaces = await db.query.workspaces.findMany({
    where: eq(workspaces.kind, 'personal'),
  });

  for (const workspace of personalWorkspaces) {
    await seedWorkspaceColors(workspace.id);
  }

  console.log(`Seeded palettes for ${personalWorkspaces.length} workspace(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
