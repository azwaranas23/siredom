'use client';

import React from 'react';
import { Delete, KeyRound, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface NumpadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  displayMode?: 'pin' | 'number';
  showSubmitButton?: boolean;
  submitText?: string;
}

export const Numpad: React.FC<NumpadProps> = ({
  value,
  onChange,
  onSubmit,
  maxLength = 4,
  displayMode = 'pin',
  showSubmitButton = true,
  submitText = 'MASUK WASIT MEJA',
}) => {
  const handleKeyClick = (key: string) => {
    if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="w-full max-w-xs mx-auto space-y-4">
      {/* Display: Number vs PIN Dots */}
      {displayMode === 'number' ? (
        <div className="bg-slate-950 px-6 py-3.5 rounded-2xl border-2 border-cyan-500/60 flex items-center justify-center min-h-[64px] shadow-inner font-mono">
          <span className="text-4xl font-black text-cyan-300 tracking-wider">
            {value || '0'}
          </span>
        </div>
      ) : (
        <div className="bg-gray-950 p-4 rounded-2xl border-2 border-gray-800 flex items-center justify-center gap-3">
          {Array.from({ length: maxLength }).map((_, idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                idx < value.length
                  ? 'bg-cyan-400 border-cyan-300 shadow-neonBlue scale-110'
                  : 'border-gray-700 bg-gray-900'
              }`}
            ></div>
          ))}
        </div>
      )}

      {/* Grid Keypad 3x4 */}
      <div className="grid grid-cols-3 gap-2.5 font-mono">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <motion.button
            key={num}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleKeyClick(num)}
            className="h-14 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-extrabold text-xl shadow-md flex items-center justify-center cursor-pointer"
          >
            {num}
          </motion.button>
        ))}

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleClear}
          className="h-14 rounded-2xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer"
        >
          CLEAR
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleKeyClick('0')}
          className="h-14 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-extrabold text-xl shadow-md flex items-center justify-center cursor-pointer"
        >
          0
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleDelete}
          className="h-14 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 flex items-center justify-center cursor-pointer"
        >
          <Delete className="w-5 h-5 text-gray-300" />
        </motion.button>
      </div>

      {/* Submit Button */}
      {showSubmitButton && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={value.length < maxLength}
          onClick={onSubmit}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-gray-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <KeyRound className="w-4 h-4" />
          {submitText}
        </motion.button>
      )}
    </div>
  );
};
