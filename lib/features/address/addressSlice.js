import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// ✅ Async thunks for server operations
export const fetchAddresses = createAsyncThunk(
  'address/fetchAddresses',
  async ({ getToken }, thunkAPI) => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/address', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data.addresses
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const addAddressToServer = createAsyncThunk(
  'address/addAddressToServer',
  async ({ address, getToken }, thunkAPI) => {
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/address', address, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data.address
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const updateAddressOnServer = createAsyncThunk(
  'address/updateAddressOnServer',
  async ({ id, updatedData, getToken }, thunkAPI) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(`/api/address/${id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data.address
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message)
    }
  }
)

export const deleteAddressFromServer = createAsyncThunk(
  'address/deleteAddressFromServer',
  async ({ id, getToken }, thunkAPI) => {
    try {
      const token = await getToken()
      await axios.delete(`/api/address/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return id // ✅ Return ID for local delete
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message)
    }
  }
)

const addressSlice = createSlice({
  name: 'address',
  initialState: {
    list: [],
    selectedAddress: null,
    loading: false,
    error: null
  },
  reducers: {
    // ✅ Local actions (without server sync)
    addAddress: (state, action) => {
      state.list.push(action.payload)
    },
    updateAddress: (state, action) => {
      const { id, updatedData } = action.payload
      const addressIndex = state.list.findIndex(address => address.id === id)
      if (addressIndex !== -1) {
        state.list[addressIndex] = { ...state.list[addressIndex], ...updatedData }
      }
    },
    deleteAddress: (state, action) => {
      const { id } = action.payload
      state.list = state.list.filter(address => address.id !== id)
      if (state.selectedAddress?.id === id) {
        state.selectedAddress = null
      }
    },
    selectAddress: (state, action) => {
      const { id } = action.payload
      state.selectedAddress = state.list.find(address => address.id === id) || null
    },
    clearSelectedAddress: (state) => {
      state.selectedAddress = null
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // ✅ Fetch Addresses
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // ✅ Add Address
      .addCase(addAddressToServer.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addAddressToServer.fulfilled, (state, action) => {
        state.loading = false
        state.list.push(action.payload)
      })
      .addCase(addAddressToServer.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // ✅ Update Address
      .addCase(updateAddressOnServer.fulfilled, (state, action) => {
        const updatedAddress = action.payload
        const index = state.list.findIndex(addr => addr.id === updatedAddress.id)
        if (index !== -1) {
          state.list[index] = updatedAddress
        }
      })
      // ✅ Delete Address
      .addCase(deleteAddressFromServer.fulfilled, (state, action) => {
        const deletedId = action.payload
        state.list = state.list.filter(address => address.id !== deletedId)
        if (state.selectedAddress?.id === deletedId) {
          state.selectedAddress = null
        }
      })
  }
})

export const { 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  selectAddress, 
  clearSelectedAddress,
  setError,
  clearError
} = addressSlice.actions

export default addressSlice.reducer