'use client';

import { DATA_CATEGORIES, DataCategory } from '@/types';

interface DataCategorySelectorProps {
  selected: DataCategory[];
  onChange: (categories: DataCategory[]) => void;
  disabled?: boolean;
}

const CATEGORY_INFO: Record<DataCategory, { label: string; description: string; icon: string }> = {
  identity: {
    label: 'Identity Information',
    description: 'DID, wallet address, personal details',
    icon: '🪪',
  },
  verification: {
    label: 'Verification Records',
    description: 'Aadhaar, PAN, and other verification data',
    icon: '✅',
  },
  credentials: {
    label: 'Verifiable Credentials',
    description: 'Issued credentials and their metadata',
    icon: '📜',
  },
  reputation: {
    label: 'Reputation Data',
    description: 'Reputation score and history',
    icon: '⭐',
  },
  staking: {
    label: 'Staking Records',
    description: 'SOL staking history and rewards',
    icon: '💰',
  },
  transactions: {
    label: 'Transaction History',
    description: 'Blockchain transaction records',
    icon: '📊',
  },
  audit_logs: {
    label: 'Audit Logs',
    description: 'Activity and access logs',
    icon: '📋',
  },
  consent_records: {
    label: 'Consent Records',
    description: 'Consent grants and revocations',
    icon: '📝',
  },
};

export function DataCategorySelector({
  selected,
  onChange,
  disabled = false,
}: DataCategorySelectorProps) {
  const toggleCategory = (category: DataCategory) => {
    if (disabled) return;
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange([...DATA_CATEGORIES]);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Select Data Categories
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DATA_CATEGORIES.map((category) => {
          const info = CATEGORY_INFO[category];
          const isSelected = selected.includes(category);

          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              disabled={disabled}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{info.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{info.label}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-primary"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-sm text-gray-600">
          {selected.length} of {DATA_CATEGORIES.length} categories selected
        </p>
      )}
    </div>
  );
}

export default DataCategorySelector;
