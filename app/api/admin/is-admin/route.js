import { getAuth } from "@clerk/nextjs/server"
import authAdmin from "@/middlewares/authAdmin"
import { NextResponse } from "next/server"

export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    
    if (!userId) {
      return NextResponse.json(
        { isAdmin: false }, 
        { status: 401 }
      )
    }

    const isAdmin = await authAdmin(userId)

    if (!isAdmin) {
      return NextResponse.json(
        { isAdmin: false }, 
        { status: 401 }
      )
    }

    return NextResponse.json({ isAdmin: true })
    
  } catch (error) {
    return NextResponse.json(
      { isAdmin: false }, 
      { status: 500 }
    )
  }
}