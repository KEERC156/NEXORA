import { ArrowUpRight, Bookmark, Clock3 } from 'lucide-react'
import styles from './ProductCard.module.css'

export interface Product {
  id: string
  title: string
  description: string
  category: string
  readTime: string
  accent: string
  icon: string
  url: string
}

interface ProductCardProps {
  product: Product
  favorite: boolean
  onToggleFavorite: (id: string) => void
}

export function ProductCard({ product, favorite, onToggleFavorite }: ProductCardProps) {
  return (
    <article className={styles.card} style={{ '--card-accent': product.accent } as React.CSSProperties}>
      <div className={styles.top}>
        <span className={styles.icon} aria-hidden="true">{product.icon}</span>
        <button className={`${styles.bookmark} ${favorite ? styles.saved : ''}`} onClick={() => onToggleFavorite(product.id)} aria-label={favorite ? `Remove ${product.title} from favorites` : `Favorite ${product.title}`} aria-pressed={favorite}>
          <Bookmark size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <span className={styles.category}>{product.category}</span>
      <h3>{product.title}</h3>
      <p className={styles.description}>{product.description}</p>
      <div className={styles.bottom}>
        <span><Clock3 size={13} />{product.readTime}</span>
        <a href={product.url} target="_blank" rel="noreferrer">Explore <ArrowUpRight size={14} /></a>
      </div>
    </article>
  )
}
