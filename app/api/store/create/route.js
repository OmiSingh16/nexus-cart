import imagekit from "@/configs/imageKit";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Database query with retry logic for Neon connection issues
const executeWithRetry = async (operation, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'P1001' && i < retries - 1) { // Connection timeout error
        console.log(`Database connection timeout, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 10000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};

// Create the store
export async function POST(request) {
  try {
    console.log('🎯 POST /api/store/create called');
    
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get data from form
    const formData = await request.formData();

    const name = formData.get("name");
    const username = formData.get("username");
    const description = formData.get("description");
    const email = formData.get("email");
    const contact = formData.get("contact");
    const address = formData.get("address");
    const image = formData.get("image");

    // Validate required fields
    if (!name || !username || !description || !email || !contact || !address || !image) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Check if user already has a store with retry
    const existingStore = await executeWithRetry(() =>
      prisma.store.findFirst({
        where: { userId: userId }
      })
    );

    if (existingStore) {
      return NextResponse.json({ 
        status: existingStore.status,
        message: `Store already ${existingStore.status}`
      });
    }

    // Check if username is already taken with retry
    const isUsernameTaken = await executeWithRetry(() =>
      prisma.store.findFirst({
        where: { username: username.toLowerCase() }
      })
    );
    
    if (isUsernameTaken) {
      return NextResponse.json({
        error: "Username already taken"
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate contact number (basic validation)
    const contactRegex = /^[0-9+\-\s()]{10,}$/;
    if (!contactRegex.test(contact.replace(/\s/g, ''))) {
      return NextResponse.json({ error: "Invalid contact number" }, { status: 400 });
    }

    // Image upload to ImageKit
    let optimizedImage;
    try {
      const buffer = Buffer.from(await image.arrayBuffer());
      const response = await imagekit.upload({
        file: buffer,
        fileName: `store-logo-${Date.now()}-${image.name}`,
        folder: "logos"
      });

      optimizedImage = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: 'auto' },
          { format: 'webp' },
          { width: '512' }   
        ] 
      });
    } catch (uploadError) {
      console.error('Image upload failed:', uploadError);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 400 });
    }

    // Create new store with retry
    const newStore = await executeWithRetry(() =>
      prisma.store.create({
        data: {
          userId,
          name: name.trim(),
          description: description.trim(),
          username: username.toLowerCase().trim(),
          email: email.trim(),
          contact: contact.trim(),
          address: address.trim(),
          logo: optimizedImage,
          status: "pending" // Explicitly set status
        }
      })
    );

    // Link Store to user with retry
    await executeWithRetry(() =>
      prisma.user.update({
        where: { id: userId },
        data: { store: { connect: { id: newStore.id } } }
      })
    );

    return NextResponse.json({ 
      message: "Store application submitted successfully! Waiting for approval.",
      status: "pending"
    });

  } catch (error) {
    console.error('Store creation error:', error);
    
    // Handle specific errors
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
    }
    
    if (error.code === 'P1001') {
      return NextResponse.json({ error: "Database connection failed. Please try again." }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}

// Check if user has already registered a store
export async function GET(request) {
  try {
    console.log('🔍 GET /api/store/create called');
    
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has a store with retry
    const store = await executeWithRetry(() =>
      prisma.store.findFirst({
        where: { userId: userId },
        select: {
          status: true,
          name: true,
          username: true
        }
      })
    );

    if (store) {
      return NextResponse.json({ 
        status: store.status,
        storeName: store.name,
        username: store.username
      });
    }
    
    return NextResponse.json({ status: "Not Registered" });
    
  } catch (error) {
    console.error('Store status check error:', error);
    
    // If database connection fails, return "Not Registered" to allow form submission
    if (error.code === 'P1001') {
      return NextResponse.json({ 
        status: "Not Registered",
        message: "Database temporarily unavailable" 
      });
    }
    
    return NextResponse.json({ 
      error: error.message || "Failed to check store status" 
    }, { status: 500 });
  }
}