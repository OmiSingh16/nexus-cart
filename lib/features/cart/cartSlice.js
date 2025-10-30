import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

const createDebouncedUpload = () => {
  let timer = null
  return (callback, delay) => {
    clearTimeout(timer)
    timer = setTimeout(callback, delay)
  }
}

export const uploadCart = createAsyncThunk('cart/uploadCart', 
  async ({ getToken }, thunkAPI) => {
    try {
      const { cartItems } = thunkAPI.getState().cart
      const token = await getToken()
      
      const { data } = await axios.post('/api/cart', 
        { cart: cartItems }, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      return data
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const debouncedUploadCart = (getToken) => {
  return (dispatch, getState) => {
    const debounce = createDebouncedUpload()
    
    return new Promise((resolve) => {
      debounce(async () => {
        try {
          await dispatch(uploadCart({ getToken })).unwrap()
          resolve()
        } catch (error) {
          resolve()
        }
      }, 1000)
    })
  }
}

export const fetchCart = createAsyncThunk('cart/fetchCart', 
  async ({ getToken }, thunkAPI) => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/cart', 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return data
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message)
    }
  }
)

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    total: 0,
    cartItems: typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('localCart') || '{}')
      : {},
    loading: false,
    error: null
  },
  reducers: {
    addToCart: (state, action) => {
      const { productId } = action.payload
      
      state.cartItems[productId] = (state.cartItems[productId] || 0) + 1
      state.total += 1
      
      // ✅ Local storage update
      if (typeof window !== 'undefined') {
        localStorage.setItem('localCart', JSON.stringify(state.cartItems))
      }
    },
    removeFromCart: (state, action) => {
      const { productId } = action.payload
      
      if (state.cartItems[productId]) {
        state.cartItems[productId]--
        state.total -= 1
        if (state.cartItems[productId] === 0) {
          delete state.cartItems[productId]
        }
        
        // ✅ Local storage update
        if (typeof window !== 'undefined') {
          localStorage.setItem('localCart', JSON.stringify(state.cartItems))
        }
      }
    },
    deleteItemFromCart: (state, action) => {
      const { productId } = action.payload
      
      if (state.cartItems[productId]) {
        state.total -= state.cartItems[productId]
        delete state.cartItems[productId]
        
        // ✅ Local storage update
        if (typeof window !== 'undefined') {
          localStorage.setItem('localCart', JSON.stringify(state.cartItems))
        }
      }
    },
    clearCart: (state) => {
      state.cartItems = {}
      state.total = 0
      
      // ✅ Local storage clear
      if (typeof window !== 'undefined') {
        localStorage.removeItem('localCart')
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false
        
        let cartData = action.payload.cart
        if (typeof cartData === 'string') {
          try {
            cartData = JSON.parse(cartData)
          } catch {
            cartData = {}
          }
        }
        
        state.cartItems = cartData || {}
        state.total = Object.values(state.cartItems).reduce((acc, item) => acc + item, 0)
        
        // ✅ Server cart se local storage update
        if (typeof window !== 'undefined') {
          localStorage.setItem('localCart', JSON.stringify(state.cartItems))
        }
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(uploadCart.pending, (state) => {
        state.loading = true
      })
      .addCase(uploadCart.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(uploadCart.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions
export default cartSlice.reducer