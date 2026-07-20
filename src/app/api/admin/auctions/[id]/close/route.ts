import { closeAuctionNow } from "@/services/admin";
import { withAdmin } from "@/app/api/admin/_helpers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAdmin(async (admin) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const auction = await closeAuctionNow({
      auctionId: id,
      adminId: admin.id,
      reason: String(body.reason ?? "Closed by admin")
    });

    return { auction };
  });
}
