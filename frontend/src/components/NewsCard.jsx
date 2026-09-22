import { Link } from 'react-router-dom'
import { timeAgo, safeImage, categoryClass, stripHtml } from '../utils/format'
import BookmarkButton from './BookmarkButton'
import { ExternalIcon } from './icons'

export default function NewsCard({ article, bookmarkable = true }) {
  const excerpt = stripHtml(article.konten || article.excerpt || '')
  return (
    <article className={`news-card ${categoryClass(article.kategori)}`}>
      <Link className="card-thumb" to={`/berita/${article.slug}`}>
        <img src={safeImage(article.gambar)} alt="" loading="lazy" />
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span className={`badge cat ${categoryClass(article.kategori)}`}>{article.kategori || 'Other'}</span>
          <span className="card-country">{article.negara}</span>
          <span className="card-time">{timeAgo(article.created_at)}</span>
        </div>
        <h3 className="card-title">
          <Link to={`/berita/${article.slug}`}>{article.judul}</Link>
        </h3>
        {excerpt && <p className="card-summary">{excerpt}</p>}
        <div className="card-foot">
          <span className="card-source">{article.sumber}</span>
          <div className="card-actions">
            {bookmarkable && <BookmarkButton articleId={article.id} initial={article.bookmarked} />}
            <a
              className="icon-btn"
              href={article.link_asli}
              target="_blank"
              rel="noopener noreferrer"
              title="Open original source"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalIcon />
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}