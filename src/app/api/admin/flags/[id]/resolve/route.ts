import { resolveModerationFlag } from "@/services/admin";
import { withAdmin } from "@/app/api/admin/_helpers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const flag = await resolveModerationFlag({
      flagId: id,
      adminId: admin.id,
      notes: String(body.notes ?? "")
    });

    return { flag };
  });
}
