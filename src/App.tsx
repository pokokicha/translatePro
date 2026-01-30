import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import NewProject from './pages/NewProject';
import Glossaries from './pages/Glossaries';
import AudioTranscribe from './pages/AudioTranscribe';
import Settings from './pages/Settings';

export default function App() {
  const { theme } = useTheme();

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects/new" element={<NewProject />} />
          <Route path="projects/:id" element={<ProjectView />} />
          <Route path="glossaries" element={<Glossaries />} />
          <Route path="audio" element={<AudioTranscribe />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white dark:border-slate-700',
        }}
      />
    </div>
  );
}
