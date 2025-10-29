import StoreLayout from "@/components/store/StoreLayout";
import { SignedIn, SignedOut, SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Nexus. - Store Dashboard",
  description: "Nexus. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {
  return (
    <>
      <SignedIn>
        <StoreLayout>{children}</StoreLayout>
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-[#97ebe7] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
          <SignIn fallbackRedirectUrl="/store" routing="hash" />
        </div>
      </SignedOut>
    </>
  );
}
