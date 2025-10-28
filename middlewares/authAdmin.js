import { currentUser } from "@clerk/nextjs/server";

const authAdmin = async (userId) => {
  try {
    if (!userId) return false;
    
    const user = await currentUser();
    if (!user) return false;
    
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (!userEmail) return false;

    const adminEmails = process.env.ADMIN_EMAILS?.split(',')
      .map(email => email.trim().toLowerCase()) || [];

    return adminEmails.includes(userEmail);
    
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

export default authAdmin;