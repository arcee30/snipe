import { cancelAuction } from "@/services/admin";
import { withAdmin } from "@/app/api/admin/_helpers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const body = await request.json();
    const auction = await cancelAuction({
      auctionId: id,
      adminId: admin.id,
      reason: String(body.reason ?? ""),
      removeListing: Boolean(body.removeListing)
    });

    return { auction };
  });
}
