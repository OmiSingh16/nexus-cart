import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// update seller order status
export async function POST(request) {
  try {
    const { userId } = getAuth(request)
    const storeId = await authSeller(userId)

    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
    }

    const { orderId, status } = await request.json()

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 })
    }

    const order = await prisma.order.update({
      where: { id: orderId, storeId },
      data: { status }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ message: "Order status updated" })

  } catch (error) {
    console.error("Update order error:", error)

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// get all order for seller
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const storeId = await authSeller(userId)

    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 100;
    const skip = (page - 1) * limit;

    const orders = await prisma.order.findMany({
      where: { storeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        address: {
          select: {
            id: true,
            name: true,
            email: true,
            street: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const totalOrders = await prisma.order.count({
      where: { storeId }
    })

    return NextResponse.json({ 
      orders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        hasMore: (page * limit) < totalOrders
      }
    })

  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}