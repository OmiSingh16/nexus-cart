import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Get Dashboard data for seller (total orders, total earnings, total products)
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);

    // ✅ Validate storeId
    if (!storeId) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // ✅ Optimized version with parallel aggregations
    const [ordersAggregate, productsCount, ratings] = await Promise.all([
      // Get orders summary
      prisma.order.aggregate({
        where: { storeId },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Get products count
      prisma.product.count({
        where: { storeId },
      }),

      // Get ratings with relationships
      prisma.rating.findMany({
        where: {
          productId: {
            in: (
              await prisma.product.findMany({
                where: { storeId },
                select: { id: true },
              })
            ).map((p) => p.id),
          },
        },
        include: { user: true, product: true },
      }),
    ]);

    const dashboardData = {
      ratings, // ✅ Fixed variable name
      totalOrders: ordersAggregate._count.id || 0,
      totalEarnings: Math.round(ordersAggregate._sum.total || 0),
      totalProducts: productsCount,
    };

    return NextResponse.json({ dashboardData });
  } catch (error) {
    console.error("Dashboard API Error:", error);

    // ✅ Better error handling
    if (error.code === "P2025" || error.message?.includes("not found")) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 400 }
    );
  }
}
