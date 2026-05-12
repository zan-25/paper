/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

export default function App() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generateQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numQuestions, difficulty }),
      });
      const data = await res.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error(err);
      alert('Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-12">
      <header className="max-w-3xl mx-auto mb-10">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg italic tracking-tighter">Q</div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">PaperGen</h1>
        </div>
        <p className="text-slate-500 text-sm">Design tailored question papers in seconds.</p>
      </header>

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Configuration</h2>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-600">Topic</label>
                    <input
                        type="text"
                        placeholder="e.g. World War II, React Hooks"
                        className="w-full text-sm border border-slate-200 rounded-md p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Question Volume</label>
                        <select
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                            className="w-full text-sm border border-slate-200 rounded-md p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value={5}>5 Questions</option>
                            <option value={10}>10 Questions</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Difficulty Level</label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-md p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={generateQuestions}
                    disabled={loading || !topic}
                    className="w-full bg-indigo-600 text-white p-3.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-sm"
                >
                    {loading ? 'Generating...' : 'Generate Questions'}
                </button>
            </div>
        </div>

        {questions.length > 0 && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Generated Questions</h2>
                <ul className="space-y-4">
                    {questions.map((q, i) => (
                        <li key={i} className="flex gap-4 group">
                            <span className="text-indigo-600 font-bold tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                            <p className="text-slate-700 leading-relaxed text-sm flex-1">{q}</p>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
}
