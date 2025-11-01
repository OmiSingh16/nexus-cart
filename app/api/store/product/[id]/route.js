import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';

// DELETE /api/store/product/[id] - SOFT DELETE
export async function DELETE(request, { params }) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    
    if (!storeId) {
      return NextResponse.json({ error: 'Not Authorized' }, { status: 401 });
    }

    const { id } = await params;

    // ✅ Verify product belongs to seller's store
    const product = await prisma.product.findFirst({
      where: { 
        id: id,
        storeId: storeId
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ✅ SOFT DELETE - ONLY update isActive and inStock
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { 
        isActive: false,    // Main soft delete flag
        inStock: false      // Stock bhi false
      }
    });

    return NextResponse.json({ 
      message: "Product discontinued successfully",
      product: updatedProduct
    });
    
  } catch (error) {
    console.error("Discontinue product error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ✅ Stock toggle alag folder mein hai toh PATCH METHOD HATA DO
// (Tumhara stock-toggle API alag route mein kaam karega)