import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getArticle } from '../services/api'
import { safeImage, formatDate, stripHtml, categoryClass } from '../utils/format'
import BookmarkButton from '../components/BookmarkButton'
import Loading from '../components/Loading'
import { ArrowLeftIcon, ExternalIcon } from '../components/icons'

export default function ArticleDetail() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    getArticle(slug)
      .then(setArticle)
      .catch((err) => setError(err.message || 'Article not found'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <Loading />
  if (error) {
    return (
      <div className="page">
        <div className="empty panel">{error}</div>
        <Link className="back-link" to="/news">
          <ArrowLeftIcon /> Back to All News
        </Link>
      </div>
    )
  }
  if (!article) return null

  const content = stripHtml(article.konten || '')

  return (
    <div className="page">
      <div className="article">
        <Link className="back-link" to="/news">
          <ArrowLeftIcon /> Back to All News
        </Link>

        <div className="panel article-main">
          <div className="article-meta">
            <span className={`badge cat ${categoryClass(article.kategori)}`}>{article.kategori || 'Other'}</span>
            <span className="badge">{article.negara}</span>
            <span className="badge">{article.bahasa}</span>
          </div>
          <h1 className="article-title">{article.judul}</h1>
          <div className="article-byline">
            <span className="article-source">{article.sumber}</span>
            <span className="article-date">{formatDate(article.created_at)}</span>
          </div>
          <img className="article-img" src={safeImage(article.gambar)} alt="" loading="lazy" />
          {content ? (
            <p className="article-content">{content}</p>
          ) : (
            <p className="article-content dim">No excerpt available from the RSS source.</p>
          )}
          <div className="article-actions">
            <BookmarkButton articleId={article.id} initial={article.bookmarked} size={15} />
            <a className="read-more" href={article.link_asli} target="_blank" rel="noopener noreferrer">
              BACA SELENGKAPNYA <ExternalIcon />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}