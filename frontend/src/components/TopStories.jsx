import { Link } from 'react-router-dom'
import { timeAgo, safeImage, categoryClass } from '../utils/format'
import { useI18n } from '../i18n'
import BookmarkButton from './BookmarkButton'

export default function TopStories({ stories = [] }) {
  const { t } = useI18n()
  return (
    <aside className="panel top-stories">
      <div className="panel-title">{t('stories.title')}</div>
      {stories.length === 0 && <div className="empty">{t('stories.empty')}</div>}
      <div className="stories-list">
        {stories.map((story, i) => (
          <div className="story" key={story.id}>
            <div className="story-rank">{String(i + 1).padStart(2, '0')}</div>
            <Link className="story-img" to={`/berita/${story.slug}`}>
              <img src={safeImage(story.gambar)} alt="" loading="lazy" />
            </Link>
            <div className="story-body">
              <div className="story-meta">
                <span className={`badge cat ${categoryClass(story.kategori)}`}>{story.kategori}</span>
                <span className="story-time">{timeAgo(story.created_at)}</span>
              </div>
              <h4 className="story-title">
                <Link to={`/berita/${story.slug}`}>{story.judul}</Link>
              </h4>
              <div className="story-foot">
                <span className="story-source">{story.sumber}</span>
                <BookmarkButton articleId={story.id} initial={story.bookmarked} size={13} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}