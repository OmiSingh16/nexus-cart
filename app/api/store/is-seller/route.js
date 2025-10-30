import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Please login' }, { status: 401 });
    }

    const store = await prisma.store.findFirst({
      where: { 
        userId: userId,
        status: 'approved'
      }
    })

    return NextResponse.json({ 
      isSeller: !!store,
      storeInfo: store 
    })
    
  } catch (error) {
    console.error("Is-seller API error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}