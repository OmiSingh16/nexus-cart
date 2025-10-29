import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { deleteCouponOnExpiry, syncUserCreation, syncUserDeletion, syncUserUpdation } from "@/inngest/functions";

// ✅ Only export the serve function
const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,
    deleteCouponOnExpiry
  ],
});

export { GET, POST, PUT };