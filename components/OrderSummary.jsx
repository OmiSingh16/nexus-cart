import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { fetchCart } from '@/lib/features/cart/cartSlice';

const OrderSummary = ({ totalPrice, items }) => {
    const { user } = useUser()
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const router = useRouter();

    const addressList = useSelector(state => state.address.list);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
           if(!user){ 
            return toast('Please login to proceed')
        }
        const token = await getToken();
        const {data} = await axios.post('/api/coupon',{code: couponCodeInput},{headers:{Authorization:`Bearer ${token}`}})
        
        setCoupon(data.coupon)
        toast.success('Coupon Applied')
        } catch (error) {
           if (error?.response?.data?.error || error?.message) {
                toast.error(error?.response?.data?.error || error.message)
            } 
        }
    }

    // ✅ NEW: Razorpay Payment Handler
    const handleRazorpayPayment = async (orderData) => {
        try {
            setLoading(true);
            const token = await getToken();
            
            // 1. Create order in backend
            const { data } = await axios.post('/api/orders', orderData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!data.success) {
                throw new Error(data.error || 'Order creation failed');
            }

            // 2. Razorpay payment options
            const options = {
                key: data.order.key,
                amount: data.order.amount,
                currency: data.order.currency,
                name: "Nexus Store",
                description: "Order Payment",
                order_id: data.order.id,
                handler: async function (response) {
                    try {
                        // 3. Payment verification
                        const verificationResponse = await fetch('/api/razorpay', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verificationResult = await verificationResponse.json();
                        
                        if (verificationResult.success) {
                            // ✅ Payment successful
                            toast.success('Payment successful!');
                            dispatch(fetchCart({ getToken }));
                            router.push('/orders?payment=success');
                        } else {
                            // ❌ Payment failed
                            toast.error('Payment verification failed');
                            router.push('/orders?payment=failed');
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        toast.error('Payment processing error');
                        router.push('/orders?payment=error');
                    }
                },
                prefill: {
                    name: user?.fullName || '',
                    email: user?.primaryEmailAddress?.emailAddress || '',
                    contact: user?.phoneNumbers?.[0]?.phoneNumber || ''
                },
                theme: {
                    color: "#3399cc"
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                        toast.error('Payment cancelled');
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();

        } catch (error) {
            console.error('Razorpay payment error:', error);
            toast.error(error?.response?.data?.error || error.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        try {
            if (!user) { 
                return toast.error('Please login to place an order');
            } 
            if (!selectedAddress) { 
                return toast.error('Please select an address');
            } 

            const token = await getToken();
            const finalAmount = coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)) : totalPrice;

            const orderData = {
                addressId: selectedAddress.id,
                items,
                paymentMethod
            }

            if (coupon) {
                orderData.couponCode = coupon.code;
            }

            // ✅ RAZORPAY PAYMENT
            if (paymentMethod === 'RAZORPAY') {
                // Additional validation for Razorpay
                if (finalAmount < 1) {
                    return toast.error('Amount must be at least 1 INR for online payment');
                }
                
                await handleRazorpayPayment(orderData);
            } 
            // ✅ COD PAYMENT (Existing logic)
            else {
                const { data } = await axios.post('/api/orders', orderData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                toast.success(data.message);
                router.push('/orders');
                dispatch(fetchCart({ getToken }));
            }

        } catch (error) {
            console.error('Order placement error:', error);
            if (error?.response?.data?.error || error?.message) {
                toast.error(error?.response?.data?.error || error.message);
            }
        }
    }

    // Calculate final amount for display
    const finalAmount = coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)) : totalPrice;

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            
            {/* Payment Methods */}
            <div className='flex gap-2 items-center'>
                <input 
                    type="radio" 
                    id="COD" 
                    onChange={() => setPaymentMethod('COD')} 
                    checked={paymentMethod === 'COD'} 
                    className='accent-gray-500' 
                />
                <label htmlFor="COD" className='cursor-pointer'>COD</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input 
                    type="radio" 
                    id="RAZORPAY" 
                    name='payment' 
                    onChange={() => setPaymentMethod('RAZORPAY')} 
                    checked={paymentMethod === 'RAZORPAY'} 
                    className='accent-gray-500' 
                />
                <label htmlFor="RAZORPAY" className='cursor-pointer'>UPI/Card Payment</label>
            </div>

            {/* Address Section */}
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select 
                                        className='border border-slate-400 p-2 w-full my-3 outline-none rounded' 
                                        onChange={(e) => setSelectedAddress(addressList[e.target.value])} 
                                    >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>
                                                    {address.name}, {address.city}, {address.state}, {address.zip}
                                                </option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)}>
                                Add Address <PlusIcon size={18} />
                            </button>
                        </div>
                    )
                }
            </div>

            {/* Price Breakdown */}
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>Free</p>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                
                {/* Coupon Section */}
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                            <input 
                                onChange={(e) => setCouponCodeInput(e.target.value)} 
                                value={couponCodeInput} 
                                type="text" 
                                placeholder='Coupon Code' 
                                className='border border-slate-400 p-1.5 rounded w-full outline-none' 
                            />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>

            {/* Total and Place Order Button */}
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>{currency}{finalAmount.toLocaleString()}</p>
            </div>
            
            <button 
                onClick={e => toast.promise(handlePlaceOrder(e), { 
                    loading: paymentMethod === 'RAZORPAY' ? 'Opening Payment...' : 'Placing Order...',
                    success: paymentMethod === 'RAZORPAY' ? 'Payment window opened' : 'Order placed successfully',
                    error: 'Failed to place order'
                })} 
                disabled={loading || !selectedAddress}
                className={`w-full py-2.5 rounded transition-all ${
                    loading || !selectedAddress 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-slate-700 hover:bg-slate-900 active:scale-95'
                } text-white`}
            >
                {loading ? 'Processing...' : `Place Order (${paymentMethod === 'RAZORPAY' ? 'Online Payment' : 'COD'})`}
            </button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
        </div>
    )
}

export default OrderSummary;