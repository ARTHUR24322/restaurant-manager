/* eslint-disable react/no-unescaped-entities */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white">
      <h1 className="text-6xl font-black italic text-primary mb-4">404</h1>
      <h2 className="text-2xl font-bold uppercase tracking-widest text-zinc-400 mb-6">Page Introuvable</h2>
      <p className="text-zinc-500 mb-8 max-w-md mx-auto">
        La ressource que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <a href="/" className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">
        Retour à l'accueil
      </a>
    </div>
  );
}
