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
    <div className="min-h-screen bg-ctp-base aperture-grid flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ctp-text mb-2">AI Review</h1>
          <p className="text-ctp-subtext">Select a repository to get started</p>
        </div>

        {repos.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-0.5 h-3.5 bg-ctp-peach rounded-full flex-shrink-0" />
              <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
                Recent Repositories
              </span>
            </div>
            <div className="space-y-2">
              {repos.map((repo) => (
                <div
                  key={repo.path}
                  className="flex items-center justify-between px-4 py-3 bg-ctp-mantle border border-ctp-surface1 rounded-md hover:border-ctp-mauve cursor-pointer transition-colors group"
                >
                  <button
                    onClick={() => onSelectRepo(repo.path)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-ctp-text font-medium">{repo.name}</div>
                    <div className="text-ctp-overlay0 text-sm truncate">
                      {repo.path}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRepo(repo.path);
                    }}
                    className="text-ctp-overlay0 hover:text-ctp-red transition-colors opacity-0 group-hover:opacity-100 p-1"
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
          className="w-full px-4 py-3 border border-dashed border-ctp-surface1 rounded-md text-ctp-subtext hover:border-ctp-mauve hover:text-ctp-text transition-colors text-sm"
        >
          <span className="flex items-center justify-center gap-2">
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
          </span>
        </button>
      </div>
    </div>
  );
}
