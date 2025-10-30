import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';

// DELETE /api/store/product/[id]
export async function DELETE(request, { params }) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    
    if (!storeId) {
      return NextResponse.json({ error: 'Not Authorized' }, { status: 401 });
    }

    const { id } = params;

    // ✅ PERFECT: Verify product belongs to seller's store
    const product = await prisma.product.findFirst({
      where: { 
        id: id,
        storeId: storeId // This is the security check!
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete the product (now we're sure it belongs to the seller)
    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Product deleted successfully" });
    
  } catch (error) {
    console.error("Delete product error:", error);
    
    // Handle Prisma specific errors
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}