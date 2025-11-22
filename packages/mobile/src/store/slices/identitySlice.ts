import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { identityService, Identity } from '../../services';

interface IdentityState {
  identity: Identity | null;
  identityId: string | null;
  did: string | null;
  publicKey: string | null;
  verificationStatus: {
    aadhaar: 'verified' | 'pending' | 'failed' | 'none';
    pan: 'verified' | 'pending' | 'failed' | 'none';
    education: 'verified' | 'pending' | 'failed' | 'none';
  };
  reputationScore: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: IdentityState = {
  identity: null,
  identityId: null,
  did: null,
  publicKey: null,
  verificationStatus: {
    aadhaar: 'none',
    pan: 'none',
    education: 'none',
  },
  reputationScore: 500,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchIdentity = createAsyncThunk(
  'identity/fetch',
  async (identityId: string, { rejectWithValue }) => {
    try {
      const identity = await identityService.getById(identityId);
      return identity;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch identity');
    }
  }
);

export const fetchIdentityByOwner = createAsyncThunk(
  'identity/fetchByOwner',
  async (ownerAddress: string, { rejectWithValue }) => {
    try {
      const identity = await identityService.getByOwner(ownerAddress);
      return identity;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Identity not found');
    }
  }
);

export const createIdentity = createAsyncThunk(
  'identity/create',
  async (
    { ownerAddress, didDocument }: { ownerAddress: string; didDocument?: object },
    { rejectWithValue }
  ) => {
    try {
      const identity = await identityService.create(ownerAddress, didDocument);
      return identity;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create identity');
    }
  }
);

export const updateIdentityDID = createAsyncThunk(
  'identity/updateDID',
  async (
    { identityId, didDocument }: { identityId: string; didDocument: object },
    { rejectWithValue }
  ) => {
    try {
      const identity = await identityService.updateDID(identityId, didDocument);
      return identity;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update DID');
    }
  }
);

// Helper to extract verification status from bitmap
const parseVerificationBitmap = (bitmap: number): IdentityState['verificationStatus'] => {
  return {
    aadhaar: (bitmap & 0x01) !== 0 ? 'verified' : 'none',
    pan: (bitmap & 0x02) !== 0 ? 'verified' : 'none',
    education: (bitmap & 0x08) !== 0 ? 'verified' : 'none',
  };
};

const identitySlice = createSlice({
  name: 'identity',
  initialState,
  reducers: {
    setIdentity: (state, action: PayloadAction<Partial<IdentityState>>) => {
      return { ...state, ...action.payload };
    },
    updateVerificationStatus: (
      state,
      action: PayloadAction<{
        type: keyof IdentityState['verificationStatus'];
        status: 'verified' | 'pending' | 'failed' | 'none';
      }>
    ) => {
      state.verificationStatus[action.payload.type] = action.payload.status;
    },
    clearIdentity: (state) => {
      state.identity = null;
      state.identityId = null;
      state.did = null;
      state.publicKey = null;
      state.verificationStatus = { aadhaar: 'none', pan: 'none', education: 'none' };
      state.reputationScore = 500;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Identity
      .addCase(fetchIdentity.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIdentity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.identity = action.payload;
        state.identityId = action.payload.id;
        state.did = action.payload.did || null;
        state.publicKey = action.payload.ownerAddress;
        state.verificationStatus = parseVerificationBitmap(action.payload.verificationBitmap || 0);
        state.reputationScore = action.payload.reputationScore || 500;
      })
      .addCase(fetchIdentity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch by Owner
      .addCase(fetchIdentityByOwner.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIdentityByOwner.fulfilled, (state, action) => {
        state.isLoading = false;
        state.identity = action.payload;
        state.identityId = action.payload.id;
        state.did = action.payload.did || null;
        state.publicKey = action.payload.ownerAddress;
        state.verificationStatus = parseVerificationBitmap(action.payload.verificationBitmap || 0);
        state.reputationScore = action.payload.reputationScore || 500;
      })
      .addCase(fetchIdentityByOwner.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Identity
      .addCase(createIdentity.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createIdentity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.identity = action.payload;
        state.identityId = action.payload.id;
        state.did = action.payload.did || null;
        state.publicKey = action.payload.ownerAddress;
        state.reputationScore = 500;
      })
      .addCase(createIdentity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update DID
      .addCase(updateIdentityDID.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateIdentityDID.fulfilled, (state, action) => {
        state.isLoading = false;
        state.identity = action.payload;
        state.did = action.payload.did || null;
      })
      .addCase(updateIdentityDID.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setIdentity, updateVerificationStatus, clearIdentity, clearError } =
  identitySlice.actions;
export default identitySlice.reducer;
