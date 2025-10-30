import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import "./globals.css";
import { ClerkProvider} from '@clerk/nextjs';
import Script from 'next/script'; // ✅ YE IMPORT ADD KARO

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "Nexus",
    description: "Nexus. - Smart e-commerce",
};

export default function RootLayout({ children }) {
    return (
        <ClerkProvider>
        <html lang="en">
            <head>
                {/* ✅ YEH RAZORPAY SCRIPT ADD KARO */}
                <Script 
                    src="https://checkout.razorpay.com/v1/checkout.js"
                    strategy="beforeInteractive"
                />
            </head>
            <body className={`${outfit.className} antialiased`}>
                <StoreProvider>
                    <Toaster />
                    {children}
                </StoreProvider>
            </body>
        </html>
        </ClerkProvider>
    );
}