import { withAdmin } from "@/app/api/admin/_helpers";
import { setUserAdminStatus } from "@/services/admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const body = await request.json();
    const user = await setUserAdminStatus({
      userId: id,
      isAdmin: Boolean(body.isAdmin),
      adminId: admin.id
    });

    return { user };
  });
}
