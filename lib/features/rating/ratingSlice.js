import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchUserRating = createAsyncThunk(
  'rating/fetchUserRatings',
  async ({ getToken }, thunkAPI) => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/rating', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data ? data.ratings : [];
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Load initial state from localStorage
const loadInitialState = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('userRatings');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading ratings from localStorage:', error);
      return [];
    }
  }
  return [];
};

const ratingSlice = createSlice({
  name: 'rating',
  initialState: {
    ratings: loadInitialState(),
  },
  reducers: {
    addRating: (state, action) => {
      state.ratings.push(action.payload);
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userRatings', JSON.stringify(state.ratings));
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserRating.fulfilled, (state, action) => {
      state.ratings = action.payload;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userRatings', JSON.stringify(state.ratings));
      }
    });
  }
});

export const { addRating } = ratingSlice.actions;
export default ratingSlice.reducer;