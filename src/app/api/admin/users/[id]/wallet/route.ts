import { adjustUserWallet } from "@/services/admin";
import { withAdmin } from "@/app/api/admin/_helpers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const body = await request.json();
    const wallet = await adjustUserWallet({
      userId: id,
      amount: Number(body.amount),
      reason: String(body.reason ?? ""),
      adminId: admin.id
    });

    return { wallet };
  });
}
