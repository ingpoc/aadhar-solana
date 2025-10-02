import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IdentityState {
  identityId: string | null;
  did: string | null;
  publicKey: string | null;
  verificationStatus: {
    aadhaar: 'verified' | 'pending' | 'failed';
    pan: 'verified' | 'pending' | 'failed';
    education: 'verified' | 'pending' | 'failed';
  };
  reputationScore: number;
}

const initialState: IdentityState = {
  identityId: null,
  did: null,
  publicKey: null,
  verificationStatus: {
    aadhaar: 'pending',
    pan: 'pending',
    education: 'pending',
  },
  reputationScore: 500,
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
      action: PayloadAction<{ type: keyof IdentityState['verificationStatus']; status: 'verified' | 'pending' | 'failed' }>,
    ) => {
      state.verificationStatus[action.payload.type] = action.payload.status;
    },
  },
});

export const { setIdentity, updateVerificationStatus } = identitySlice.actions;
export default identitySlice.reducer;
