import type { RepoInfo } from "../types";

interface RepoLandingPageProps {
  repos: RepoInfo[];
  onSelectRepo: (path: string) => void;
  onAddRepo: () => void;
  onRemoveRepo: (path: string) => void;
}

export function RepoLandingPage({
  repos,
  onSelectRepo,
  onAddRepo,
  onRemoveRepo,
}: RepoLandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Review</h1>
          <p className="text-gray-400">Select a repository to get started</p>
        </div>

        {repos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Recent Repositories
            </h2>
            <div className="space-y-2">
              {repos.map((repo) => (
                <div
                  key={repo.path}
                  className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-700 transition-colors group"
                >
                  <button
                    onClick={() => onSelectRepo(repo.path)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-white font-medium">{repo.name}</div>
                    <div className="text-gray-500 text-sm truncate">
                      {repo.path}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRepo(repo.path);
                    }}
                    className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Remove from list"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onAddRepo}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Repository
        </button>
      </div>
    </div>
  );
}
