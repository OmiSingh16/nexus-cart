import { inngest } from "./client";
import prisma from "@/lib/prisma";


export const syncUserCreation = inngest.createFunction(
  { 
    id: "sync-user-create" 
  },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: data.id }
      });

      if (existingUser) {
        return { success: true, message: "User already exists" };
      }

      await prisma.user.create({
        data: {
          id: data.id,
          email: data.email_addresses[0]?.email_address || "no-email@example.com",
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || "User",
          image: data.image_url || "",
          cart: "{}"
        }
      });

      return { success: true, message: "User created" };
      
    } catch (error) {
      throw error;
    }
  }
);

export const syncUserUpdation = inngest.createFunction(
  { 
    id: 'sync-user-update' 
  },
  { event: 'clerk/user.updated' },
  async ({ event }) => {
    const { data } = event;
    
    try {
      await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data.email_addresses[0]?.email_address,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          image: data.image_url || "",
        }  
      });
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
);

export const syncUserDeletion = inngest.createFunction(
  { 
    id: 'sync-user-delete'
  },
  { event: 'clerk/user.deleted' },
  async ({ event }) => {
    const { data } = event;
    
    try {
      await prisma.user.delete({
        where: { id: data.id } 
      });
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
);

// Inngest Function to delete cupon on expiry
export const deleteCouponOnExpiry = inngest.createFunction(
  {id:'delete-coupon-on-expiry'},
  {event: 'app/coupon.expired'},
  async ({event , step})=>{
    const {data}= event
    const expiryDate= new Date(data.expires-at)
    await step.sleepUntil('wait-for-expiry',expiryDate)

    await step.run('delete-coupon-from-database',async()=>{
      await prisma.coupon.delete({
        where:{code: data.code}
      })
    })
  }
)