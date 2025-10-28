import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { syncUserCreation, syncUserDeletion, syncUserUpdation } from "@/inngest/functions";

// ✅ Only export the serve function
const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
  ],
});

export { GET, POST, PUT };