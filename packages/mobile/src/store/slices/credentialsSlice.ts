import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Credential {
  id: string;
  type: string;
  status: 'verified' | 'pending' | 'revoked';
  issuedAt: string;
  expiresAt?: string;
}

interface CredentialsState {
  credentials: Credential[];
}

const initialState: CredentialsState = {
  credentials: [],
};

const credentialsSlice = createSlice({
  name: 'credentials',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<Credential[]>) => {
      state.credentials = action.payload;
    },
    addCredential: (state, action: PayloadAction<Credential>) => {
      state.credentials.push(action.payload);
    },
  },
});

export const { setCredentials, addCredential } = credentialsSlice.actions;
export default credentialsSlice.reducer;
