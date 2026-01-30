import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Loader2,
  Book,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { glossariesApi } from '../lib/api';
import { LANGUAGES } from '@shared/types';
import type { Glossary, GlossaryTerm } from '@shared/types';

export default function Glossaries() {
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(null);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [showNewGlossaryModal, setShowNewGlossaryModal] = useState(false);
  const [showNewTermModal, setShowNewTermModal] = useState(false);

  useEffect(() => {
    loadGlossaries();
  }, []);

  async function loadGlossaries() {
    try {
      const data = await glossariesApi.list();
      setGlossaries(data);
    } catch (error) {
      toast.error('Failed to load glossaries');
    } finally {
      setLoading(false);
    }
  }

  async function loadTerms(glossaryId: string) {
    setLoadingTerms(true);
    try {
      const data = await glossariesApi.getTerms(glossaryId);
      setTerms(data);
    } catch (error) {
      toast.error('Failed to load terms');
    } finally {
      setLoadingTerms(false);
    }
  }

  async function handleSelectGlossary(glossary: Glossary) {
    setSelectedGlossary(glossary);
    await loadTerms(glossary.id);
  }

  async function handleDeleteGlossary(id: string) {
    if (!confirm('Delete this glossary and all its terms?')) return;

    try {
      await glossariesApi.delete(id);
      setGlossaries((prev) => prev.filter((g) => g.id !== id));
      if (selectedGlossary?.id === id) {
        setSelectedGlossary(null);
        setTerms([]);
      }
      toast.success('Glossary deleted');
    } catch (error) {
      toast.error('Failed to delete glossary');
    }
  }

  async function handleDeleteTerm(termId: string) {
    if (!selectedGlossary) return;

    try {
      await glossariesApi.deleteTerm(selectedGlossary.id, termId);
      setTerms((prev) => prev.filter((t) => t.id !== termId));
      toast.success('Term deleted');
    } catch (error) {
      toast.error('Failed to delete term');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Glossaries</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage translation memory and terminology
          </p>
        </div>
        <button onClick={() => setShowNewGlossaryModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Glossary
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Glossaries List */}
        <div className="card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Your Glossaries</h2>
          </div>
          <div className="divide-y">
            {glossaries.length === 0 ? (
              <div className="p-8 text-center">
                <Book className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">No glossaries yet</p>
              </div>
            ) : (
              glossaries.map((glossary) => (
                <div
                  key={glossary.id}
                  onClick={() => handleSelectGlossary(glossary)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                    selectedGlossary?.id === glossary.id
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{glossary.name}</p>
                    <p className="text-sm text-slate-500">
                      {glossary.sourceLanguage.toUpperCase()} → {glossary.targetLanguage.toUpperCase()}
                      {' • '}
                      {glossary.termsCount} terms
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Terms List */}
        <div className="lg:col-span-2 card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">
              {selectedGlossary ? selectedGlossary.name : 'Select a glossary'}
            </h2>
            {selectedGlossary && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewTermModal(true)}
                  className="btn-secondary text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Term
                </button>
                <button
                  onClick={() => handleDeleteGlossary(selectedGlossary.id)}
                  className="btn-ghost text-red-600 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!selectedGlossary ? (
            <div className="p-8 text-center text-slate-500">
              Select a glossary to view its terms
            </div>
          ) : loadingTerms ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : terms.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No terms in this glossary
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-700/50">
                    <th className="text-left p-3 text-sm font-medium">Source Term</th>
                    <th className="text-left p-3 text-sm font-medium">Target Term</th>
                    <th className="text-left p-3 text-sm font-medium">Notes</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {terms.map((term) => (
                    <tr key={term.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-3">{term.sourceTerm}</td>
                      <td className="p-3">{term.targetTerm}</td>
                      <td className="p-3 text-slate-500">{term.notes || '-'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteTerm(term.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Glossary Modal */}
      <AnimatePresence>
        {showNewGlossaryModal && (
          <NewGlossaryModal
            onClose={() => setShowNewGlossaryModal(false)}
            onCreated={(glossary) => {
              setGlossaries((prev) => [glossary, ...prev]);
              setShowNewGlossaryModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* New Term Modal */}
      <AnimatePresence>
        {showNewTermModal && selectedGlossary && (
          <NewTermModal
            glossaryId={selectedGlossary.id}
            onClose={() => setShowNewTermModal(false)}
            onCreated={(term) => {
              setTerms((prev) => [...prev, term]);
              setShowNewTermModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewGlossaryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (glossary: Glossary) => void;
}) {
  const [name, setName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('bg');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const glossary = await glossariesApi.create({ name, sourceLanguage, targetLanguage });
      onCreated(glossary);
      toast.success('Glossary created');
    } catch (error) {
      toast.error('Failed to create glossary');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="New Glossary">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Source Language</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="input"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Target Language</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="input"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading || !name} className="btn-primary flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewTermModal({
  glossaryId,
  onClose,
  onCreated,
}: {
  glossaryId: string;
  onClose: () => void;
  onCreated: (term: GlossaryTerm) => void;
}) {
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const term = await glossariesApi.addTerm(glossaryId, { sourceTerm, targetTerm, notes: notes || undefined });
      onCreated(term);
      toast.success('Term added');
    } catch (error) {
      toast.error('Failed to add term');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Add Term">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Source Term</label>
          <input
            type="text"
            value={sourceTerm}
            onChange={(e) => setSourceTerm(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Target Term</label>
          <input
            type="text"
            value={targetTerm}
            onChange={(e) => setTargetTerm(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[80px]"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading || !sourceTerm || !targetTerm} className="btn-primary flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md card p-6 z-50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  );
}
