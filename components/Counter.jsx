'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { useUser, useAuth } from '@clerk/nextjs';  // ✅ Import add karo
import { debouncedUploadCart } from "@/lib/features/cart/cartSlice";  // ✅ Import add 

const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();
     const { user } = useUser();                    // ✅ Add yeh line
    const { getToken } = useAuth();                // ✅ Add yeh line

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
        // ✅ Server sync for increase
         if (user && getToken) {
            dispatch(debouncedUploadCart(getToken))
        }
    }

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ productId }))
        // ✅ Server sync for decrease
        if (user && getToken) {
            dispatch(debouncedUploadCart(getToken))
        }

    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{cartItems[productId]}</p>
            <button onClick={addToCartHandler} className="p-1 select-none">+</button>
        </div>
    )
}

export default Counter