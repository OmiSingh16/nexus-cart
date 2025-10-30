import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const { addressId, items, couponCode, paymentMethod } = await request.json();
    
    // Validation
    if (!addressId || !items || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "missing order details" }, { status: 401 });
    }

    let coupon = null;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });
      if (!coupon) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      }
    }

    // Check if coupon is applicable for new users
    if (couponCode && coupon.forNewUser) {
      const userorders = await prisma.order.findMany({ where: { userId } });
      if (userorders.length > 0) {
        return NextResponse.json({ error: "Coupon valid for new users only" }, { status: 400 });
      }
    }

    // Group orders by StoreId using a Map
    const orderByStore = new Map();
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      });
      const storeId = product.storeId;
      if (!orderByStore.has(storeId)) {
        orderByStore.set(storeId, []);
      }
      orderByStore.get(storeId).push({ ...item, price: product.price });
    }

    let orderIds = [];
    let fullAmount = 0;

    // RAZORPAY PAYMENT - Pehle hi handle karo
    if (paymentMethod === "RAZORPAY") {
      // Calculate total amount
      for (const [storeId, sellerItems] of orderByStore.entries()) {
        let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        if (couponCode) {
          total -= (total * coupon.discount) / 100;
        }
        fullAmount += parseFloat(total.toFixed(2));
      }

      // Validation
      if (fullAmount < 1) {
        return NextResponse.json({ error: "Amount must be at least 1 INR" }, { status: 400 });
      }

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_API_KEY,
        key_secret: process.env.RAZORPAY_API_SECRET,
      });

      const options = {
        amount: Math.round(fullAmount * 100),
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          userId: userId,
          appId: "Nexus",
        },
      };

      try {
        // 1. Razorpay order create karo
        const razorpayOrder = await razorpay.orders.create(options);

        // 2. Database mein orders create karo (multiple stores ke liye)
        for (const [storeId, sellerItems] of orderByStore.entries()) {
          let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          if (couponCode) {
            total -= (total * coupon.discount) / 100;
          }

          // Unique order ID for each store order
          const storeOrderId = `${razorpayOrder.id}_${storeId}`;
          
          const order = await prisma.order.create({
            data: {
              id: storeOrderId, // Unique ID for each store order
              total: parseFloat(total.toFixed(2)),
              userId,
              storeId,
              addressId,
              isPaid: false,
              paymentMethod: "RAZORPAY",
              status: "ORDER_PLACED",
              isCouponUsed: !!coupon,
              coupon: coupon || {},
              orderItems: {
                create: sellerItems.map((item) => ({
                  productId: item.id,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            },
          });
          orderIds.push(order.id);
        }

        console.log('✅ Razorpay orders created:', orderIds);

        return NextResponse.json({
          success: true,
          order: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_API_KEY,
          },
          orderIds: orderIds, // Frontend ko bhejo for reference
        });

      } catch (error) {
        console.error("❌ Razorpay order error:", error);
        
        let errorMessage = "Payment initiation failed";
        if (error.error?.description) {
          errorMessage = error.error.description;
        }

        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
    }

    // OTHER PAYMENT METHODS (COD, STRIPE, etc.)
    else {
      // Create orders for each seller
      for (const [storeId, sellerItems] of orderByStore.entries()) {
        let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        if (couponCode) {
          total -= (total * coupon.discount) / 100;
        }

        const order = await prisma.order.create({
          data: {
            userId,
            storeId,
            addressId,
            total: parseFloat(total.toFixed(2)),
            paymentMethod,
            isCouponUsed: !!coupon,
            coupon: coupon || {},
            orderItems: {
              create: sellerItems.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
        });
        orderIds.push(order.id);
      }

      // Clear the cart only for non-Razorpay payments
      await prisma.user.update({
        where: { id: userId },
        data: { cart: {} },
      });

      return NextResponse.json({ 
        message: "Order Placed Successfully",
        orderIds: orderIds 
      });
    }

  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// Get all orders for Users
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR: [
          { paymentMethod: PaymentMethod.COD },
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] },
          { AND: [{ paymentMethod: PaymentMethod.RAZORPAY }, { isPaid: true }] }, // ✅ Razorpay added
        ],
      },
      include: {
        orderItems: { include: { product: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}