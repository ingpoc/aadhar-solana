import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reputationService, ReputationScore, ReputationEvent } from '../../services';

interface ReputationState {
  score: ReputationScore | null;
  history: ReputationEvent[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ReputationState = {
  score: null,
  history: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchReputationScore = createAsyncThunk(
  'reputation/fetchScore',
  async (identityId: string, { rejectWithValue }) => {
    try {
      const score = await reputationService.getScore(identityId);
      return score;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch score');
    }
  }
);

export const fetchReputationHistory = createAsyncThunk(
  'reputation/fetchHistory',
  async (
    { identityId, page, limit }: { identityId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const result = await reputationService.getHistory(identityId, page, limit);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch history');
    }
  }
);

const reputationSlice = createSlice({
  name: 'reputation',
  initialState,
  reducers: {
    clearReputation: (state) => {
      state.score = null;
      state.history = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Score
      .addCase(fetchReputationScore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReputationScore.fulfilled, (state, action) => {
        state.isLoading = false;
        state.score = action.payload;
      })
      .addCase(fetchReputationScore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch History
      .addCase(fetchReputationHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReputationHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.history = action.payload.items;
      })
      .addCase(fetchReputationHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearReputation, clearError } = reputationSlice.actions;
export default reputationSlice.reducer;
