import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma"; // Tumhara Prisma client path

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
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json();

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
      // ✅ Payment successful - isPaid = true
      await updateOrderPaymentStatus(razorpay_order_id, true);
      
      return NextResponse.json({ 
        success: true, 
        message: "Payment verified successfully"
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
    await updateOrderPaymentStatus(razorpay_order_id, false);
    return NextResponse.json({ 
      error: "Verification failed" 
    }, { status: 500 });
  }
}

// ✅ Webhook Handler
async function handleWebhook(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    console.log('Webhook received with signature:', signature);

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
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}

// ✅ Prisma Database Update Function - isPaid update karega
async function updateOrderPaymentStatus(razorpayOrderId, isPaid) {
  try {
    console.log(`Updating order payment status: ${razorpayOrderId}, isPaid: ${isPaid}`);

    // Prisma update query - Razorpay order ID = Order table ka id
    const updatedOrder = await prisma.order.update({
      where: {
        id: razorpayOrderId
      },
      data: {
        isPaid: isPaid,
        updatedAt: new Date()
      }
    });

    console.log('Order updated successfully:', updatedOrder.id);
    return updatedOrder;

  } catch (error) {
    console.error('Prisma update error:', error);
    
    // Agar order nahi mila toh log karo
    if (error.code === 'P2025') {
      console.error(`Order not found with ID: ${razorpayOrderId}`);
      // Yahan tum error handle kar sakte ho - maybe new order create karo?
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