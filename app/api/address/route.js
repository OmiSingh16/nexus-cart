import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// add new address
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const addressData = body.address || body;

    if (!addressData?.street || !addressData?.city || !addressData?.state || !addressData?.zip) {
      return NextResponse.json({ error: 'Required address fields missing' }, { status: 400 });
    }

    const newAddress = await prisma.address.create({
      data: {
        ...addressData,
        userId: userId
      },
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        state: true,
        zip: true
      }
    });

    return NextResponse.json({ 
      address: newAddress, 
      message: "Address added successfully" 
    });

  } catch (error) {
    console.error("Add address error:", error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Address already exists' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Failed to add address' }, { status: 400 });
  }
}

// get all addresses for user
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        phone: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error("Get addresses error:", error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 400 });
  }
}