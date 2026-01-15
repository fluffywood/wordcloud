/**
 * Header component with title and instructions
 */
export default function Header() {
  return (
    <header className="text-center py-6">
      {/* Live indicator badge */}
      <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-surface rounded-full">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
        </span>
        <span className="text-sm text-text-secondary font-medium">LIVE</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
        Help Decide What I Build!
      </h1>

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
        Submit your ideas and vote on the best ones
      </p>

      {/* Instruction text */}
      <p className="mt-4 text-sm text-text-muted">
        Submit an idea below or click words in the cloud to vote
      </p>
    </header>
  )
}
