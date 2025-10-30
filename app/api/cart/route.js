import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// update user cart
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { cart } = await request.json();

    // ✅ Accept both Array AND Object format
    if (!cart || (typeof cart !== 'object')) {
      return NextResponse.json({ error: 'Invalid cart data' }, { status: 400 });
    }

    // Save the cart data (both formats work with Prisma JSON field)
    await prisma.user.update({
      where: { id: userId },
      data: { cart: cart }
    });

    return NextResponse.json({ message: 'Cart updated successfully' });

  } catch (error) {
    console.error("Update cart error:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 400 });
  }
}

// Get user cart
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    
    // ✅ Validate user exists
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cart: true } // ✅ Only fetch cart data
    });

    // ✅ Handle user not found
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ cart: user.cart || [] }); // ✅ Default empty array

  } catch (error) {
    console.error("Get cart error:", error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 400 });
  }
}