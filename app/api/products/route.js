import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// get product list
export async function GET(request) {
  try {
    // ✅ Better filtering at database level
    const products = await prisma.product.findMany({
      where: { 
        inStock: true,
        store: {
          isActive: true  // ✅ Database level filtering
        }
      },
      include: {
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            logo: true,
            username: true
            // ✅ Only necessary store fields
          }
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    // ✅ No need for manual filtering now
    return NextResponse.json({ products })

  } catch (error) {
    console.error("Get products error:", error)
    return NextResponse.json({ error: "An internal server error occurred" }, { status: 500 })
  }
}