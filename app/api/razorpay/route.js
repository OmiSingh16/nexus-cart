import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// ✅ Frontend Verification + Webhook Handler
export async function POST(request) {
  try {
    // Check if it's webhook call (by checking headers)
    const signature = request.headers.get('x-razorpay-signature');
    
    if (signature) {
      // This is a WEBHOOK call from Razorpay
      return handleWebhook(request);
    } else {
      // This is FRONTEND verification call
      return handleFrontendVerification(request);
    }

  } catch (error) {
    console.error("Razorpay API error:", error);
    return NextResponse.json({ 
      error: "Processing failed" 
    }, { status: 500 });
  }
}

// ✅ Frontend Verification Handler
async function handleFrontendVerification(request) {
  // ✅ VARIABLE DECLARE KARO PEHLE HI
  let razorpay_order_id = null;
  
  try {
    const { razorpay_payment_id, razorpay_order_id: orderId, razorpay_signature } = await request.json();
    razorpay_order_id = orderId; // Store for error handling

    console.log('Frontend verification request:', {
      razorpay_payment_id,
      razorpay_order_id, 
      razorpay_signature
    });

    // Signature verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // ✅ Payment successful - isPaid = true + Cart Clear
      const result = await updateOrderPaymentStatus(razorpay_order_id, true);
      
      return NextResponse.json({ 
        success: true, 
        message: "Payment verified successfully",
        cartCleared: result.cartCleared
      });
    } else {
      // ❌ Payment verification failed - isPaid = false
      await updateOrderPaymentStatus(razorpay_order_id, false);
      
      return NextResponse.json({ 
        success: false, 
        error: "Payment verification failed" 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Frontend verification error:', error);
    
    // ✅ AB razorpay_order_id AVAILABLE HAI ERROR MEIN BHI
    if (razorpay_order_id) {
      await updateOrderPaymentStatus(razorpay_order_id, false);
    }
    
    return NextResponse.json({ 
      error: "Verification failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// ✅ Webhook Handler
async function handleWebhook(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    console.log('Webhook received with signature:', signature);

    // ✅ ENVIRONMENT VARIABLE CHECK
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('RAZORPAY_WEBHOOK_SECRET missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const webhookData = JSON.parse(body);
    console.log('Webhook event:', webhookData.event);

    // Handle different webhook events
    switch (webhookData.event) {
      case 'payment.captured':
        // ✅ Payment successful
        await updateOrderPaymentStatus(
          webhookData.payload.payment.entity.order_id, 
          true // isPaid = true
        );
        break;
      
      case 'payment.failed':
        // ❌ Payment failed
        await updateOrderPaymentStatus(
          webhookData.payload.payment.entity.order_id, 
          false // isPaid = false
        );
        break;

      case 'order.paid':
        // ✅ Order paid
        await updateOrderPaymentStatus(
          webhookData.payload.order.entity.id, 
          true // isPaid = true
        );
        break;

      default:
        console.log('Unhandled webhook event:', webhookData.event);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// ✅ UPDATED: Find and update all orders with Razorpay ID pattern + Clear Cart
async function updateOrderPaymentStatus(razorpayOrderId, isPaid) {
  try {
    console.log(`Updating order payment status: ${razorpayOrderId}, isPaid: ${isPaid}`);

    // ✅ FIND ALL ORDERS WITH THIS RAZORPAY ORDER ID PATTERN
    const orders = await prisma.order.findMany({
      where: {
        id: {
          startsWith: razorpayOrderId
        },
        paymentMethod: "RAZORPAY"
      },
      include: {
        user: {
          select: { id: true }
        }
      }
    });

    if (orders.length === 0) {
      console.error(`No Razorpay orders found with ID pattern: ${razorpayOrderId}`);
      return { updatedOrders: null, cartCleared: false };
    }

    console.log(`Found ${orders.length} orders to update`);

    // ✅ GET UNIQUE USER IDS (Multiple stores, same user)
    const userIds = [...new Set(orders.map(order => order.userId))];
    console.log('User IDs to clear cart:', userIds);

    // ✅ UPDATE ALL MATCHING ORDERS
    const updatePromises = orders.map(order => 
      prisma.order.update({
        where: { id: order.id },
        data: {
          isPaid: isPaid,
          updatedAt: new Date()
        }
      })
    );

    let cartCleared = false;

    // ✅ CLEAR CART ONLY FOR SUCCESSFUL PAYMENTS
    if (isPaid) {
      try {
        const cartClearPromises = userIds.map(userId =>
          prisma.user.update({
            where: { id: userId },
            data: { cart: {} }
          })
        );

        await Promise.all(cartClearPromises);
        cartCleared = true;
        console.log(`✅ Cart cleared for ${userIds.length} users`);
      } catch (cartError) {
        console.error('❌ Cart clear failed:', cartError);
        // Cart clear fail hua, but order update successful hai
      }
    }

    // ✅ EXECUTE ORDER UPDATES
    const updatedOrders = await Promise.all(updatePromises);
    console.log(`✅ Updated ${updatedOrders.length} orders successfully`);

    return {
      updatedOrders,
      cartCleared
    };

  } catch (error) {
    console.error('Prisma update error:', error);
    
    if (error.code === 'P2025') {
      console.error(`Order not found with ID pattern: ${razorpayOrderId}`);
      return { updatedOrders: null, cartCleared: false };
    }
    
    throw error;
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: "Razorpay API is working!",
    timestamp: new Date().toISOString()
  });  
}