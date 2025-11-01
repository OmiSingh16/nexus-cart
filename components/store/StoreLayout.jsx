'use client'
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { useAuth } from "@clerk/clerk-react"
import Image from "next/image"
import { assets } from "@/assets/assets"

const StoreLayout = ({ children }) => {
    const { getToken } = useAuth()
    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const hasFetched = useRef(false) // ✅ Prevent duplicate calls

    const fetchIsSeller = async () => {
        // ✅ Prevent duplicate API calls
        if (hasFetched.current) return;
        hasFetched.current = true;

        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/is-seller', {
                headers: { Authorization: `Bearer ${token}` }
            }) 
            setIsSeller(data.isSeller) 
            setStoreInfo(data.storeInfo)
        } catch (error) {
            console.error("Auth check failed:", error)
            // Optional: Add toast notification
            // toast.error("Failed to verify seller status")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIsSeller()
    }, []) // ✅ Removed getToken dependency to prevent loops

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
             <div >
    <Image className='w-28 sm:w-36 md:w-44 lg:w-50  mx-auto border-2 border-s-amber-300 border-slate-300 rounded-2xl bg-slate-50/50' src={assets.unauth} alt="Empty cart" />
</div>  
            <h1 className=" pt-1 text-2xl sm:text-4xl font-semibold text-slate-400">You are not authorized to access this page</h1>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout