// app/api/admin/coupon/route.js
import { inngest } from "@/inngest/client"
import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// ✅ Add new Coupon 
export async function POST(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)

    if(!isAdmin){
      return NextResponse.json({error:"not authorized"},{status:401})
    }

    const { coupon } = await request.json()
    
    if (!coupon?.code) {
      return NextResponse.json({error: "Coupon code is required"}, {status: 400})
    }
    
    // ✅ Create coupon with Prisma
    const createdCoupon = await prisma.coupon.create({
      data: {
        ...coupon,
        code: coupon.code.toUpperCase()
      }
    })
    
    // ✅ Run Inngest scheduler Function to delete coupon on expire
    try {
      await inngest.send({
        name: 'app/coupon.expired',
        data:{
          code: createdCoupon.code,
          expires_at: createdCoupon.expiresAt,
        }
      })
    } catch (inngestError) {
      console.error("Inngest scheduling failed:", inngestError)
      // Continue - don't fail the coupon creation if scheduling fails
    }
    
    return NextResponse.json({message:"Coupon added successfully"})
  } catch (error) {
    console.error(error)
    
    // ✅ Prisma specific error handling
    if (error.code === 'P2002') {
      return NextResponse.json({error: "Coupon code already exists"}, {status: 409})
    }
    
    return NextResponse.json({error: error.message}, {status: 400})
  }
}

// ✅ Delete coupon
export async function DELETE(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)

    if(!isAdmin){
      return NextResponse.json({error:"not authorized"},{status:401})
    }

    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({error: "Coupon code is required"}, {status: 400})
    }
    
    await prisma.coupon.delete({
      where: { code: code.toUpperCase() }
    })
    
    return NextResponse.json({message:"Coupon deleted successfully"})
  } catch (error) {
    console.error(error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({error: "Coupon not found"}, {status: 404})
    }
    
    return NextResponse.json({error: error.message}, {status: 400})
  }
}

// ✅ Get all coupons
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)

    if(!isAdmin){
      return NextResponse.json({error:"not authorized"},{status:401})
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ coupons })
  } catch (error) {
    console.error(error)
    return NextResponse.json({error: error.message}, {status: 400})
  }
}