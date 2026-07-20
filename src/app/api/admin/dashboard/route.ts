import { getAdminDashboard } from "@/services/admin";
import { withAdmin } from "@/app/api/admin/_helpers";

export async function GET() {
  return withAdmin(async (admin) => ({
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      displayName: admin.displayName
    },
    dashboard: await getAdminDashboard()
  }));
}
