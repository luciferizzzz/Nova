const SkeletonCard = () => (
  <div className="news-card skeleton">
    <div className="card-thumb skeleton-block" />
    <div className="card-body">
      <div className="skeleton-line w30" />
      <div className="skeleton-line w90" />
      <div className="skeleton-line w70" />
      <div className="skeleton-line w50" />
    </div>
  </div>
)

export function FeedSkeleton({ count = 4 }) {
  return (
    <div className="news-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default function Loading({ text = 'Loading…' }) {
  return <div className="loading">{text}</div>
}