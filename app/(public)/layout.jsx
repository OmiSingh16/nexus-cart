'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";  
import { fetchProducts } from "@/lib/features/product/productSlice";
import { useUser, useAuth } from '@clerk/nextjs';
import { fetchCart } from "@/lib/features/cart/cartSlice"; 
import { fetchAddresses } from "@/lib/features/address/addressSlice";
import { fetchUserRating } from "@/lib/features/rating/ratingSlice";

export default function PublicLayout({ children }) {
    const dispatch = useDispatch()
    const { user } = useUser()
    const { getToken } = useAuth()
    const { loading, error } = useSelector((state) => state.product)  

    useEffect(() => {
        dispatch(fetchProducts({}))
    }, [dispatch])  

    useEffect(() => {
        if(user){
            dispatch(fetchCart({getToken}))
            dispatch(fetchAddresses({getToken}))
            dispatch(fetchUserRating({getToken}))
        }
    }, [user, getToken])  // ✅ getToken dependency add karo

    return (
        <>
            <Banner />
            <Navbar />
            {children}
            <Footer />
        </>
    );
}