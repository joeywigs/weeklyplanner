'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';

export function NotesForCara() {
  const { caraNotes, addCaraNote, removeCaraNote, copyCaraNotes } =
    usePlanner();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  function handleAdd() {
    const text = input.trim();
    if (!text) return;
    addCaraNote(text);
    setInput('');
  }

  function handleCopy() {
    copyCaraNotes();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <h2 className="text-sm font-bold text-gray-900">Notes for Cara</h2>
          {caraNotes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
              {caraNotes.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add note for Cara..."
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-gray-50 border border-[var(--border)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shrink-0"
          >
            Add
          </button>
        </div>

        {/* Notes list */}
        {caraNotes.length > 0 ? (
          <>
            <ul className="space-y-1">
              {caraNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-start gap-2 text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 break-words">{note.text}</span>
                  <button
                    onClick={() => removeCaraNote(note.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 3l6 6M9 3l-6 6"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`w-full text-xs py-2 rounded-lg border font-medium transition-colors ${
                copied
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-purple-300 text-purple-600 hover:bg-purple-50'
              }`}
            >
              {copied ? 'Copied to clipboard!' : 'Copy all notes to clipboard'}
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2 italic">
            No notes yet
          </p>
        )}
      </div>
    </div>
  );
}
