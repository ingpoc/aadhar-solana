import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { credentialService, Credential, CredentialVerification } from '../../services';

interface CredentialsState {
  credentials: Credential[];
  selectedCredential: Credential | null;
  verification: CredentialVerification | null;
  isLoading: boolean;
  isVerifying: boolean;
  error: string | null;
}

const initialState: CredentialsState = {
  credentials: [],
  selectedCredential: null,
  verification: null,
  isLoading: false,
  isVerifying: false,
  error: null,
};

// Async thunks
export const fetchCredentials = createAsyncThunk(
  'credentials/fetchAll',
  async (identityId: string, { rejectWithValue }) => {
    try {
      const credentials = await credentialService.getByIdentity(identityId);
      return credentials;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch credentials'
      );
    }
  }
);

export const fetchCredentialById = createAsyncThunk(
  'credentials/fetchById',
  async (credentialId: string, { rejectWithValue }) => {
    try {
      const credential = await credentialService.getById(credentialId);
      return credential;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch credential'
      );
    }
  }
);

export const verifyCredential = createAsyncThunk(
  'credentials/verify',
  async (credentialId: string, { rejectWithValue }) => {
    try {
      const verification = await credentialService.verify(credentialId);
      return verification;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to verify credential'
      );
    }
  }
);

const credentialsSlice = createSlice({
  name: 'credentials',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<Credential[]>) => {
      state.credentials = action.payload;
    },
    addCredential: (state, action: PayloadAction<Credential>) => {
      const exists = state.credentials.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.credentials.push(action.payload);
      }
    },
    updateCredential: (state, action: PayloadAction<Credential>) => {
      const index = state.credentials.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.credentials[index] = action.payload;
      }
    },
    selectCredential: (state, action: PayloadAction<string | null>) => {
      if (action.payload === null) {
        state.selectedCredential = null;
      } else {
        state.selectedCredential =
          state.credentials.find((c) => c.id === action.payload) || null;
      }
    },
    clearVerification: (state) => {
      state.verification = null;
    },
    clearCredentials: (state) => {
      state.credentials = [];
      state.selectedCredential = null;
      state.verification = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all credentials
      .addCase(fetchCredentials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCredentials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.credentials = action.payload;
      })
      .addCase(fetchCredentials.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single credential
      .addCase(fetchCredentialById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCredentialById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCredential = action.payload;
        // Also update in list if exists
        const index = state.credentials.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.credentials[index] = action.payload;
        } else {
          state.credentials.push(action.payload);
        }
      })
      .addCase(fetchCredentialById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Verify credential
      .addCase(verifyCredential.pending, (state) => {
        state.isVerifying = true;
        state.error = null;
      })
      .addCase(verifyCredential.fulfilled, (state, action) => {
        state.isVerifying = false;
        state.verification = action.payload;
      })
      .addCase(verifyCredential.rejected, (state, action) => {
        state.isVerifying = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCredentials,
  addCredential,
  updateCredential,
  selectCredential,
  clearVerification,
  clearCredentials,
  clearError,
} = credentialsSlice.actions;
export default credentialsSlice.reducer;
