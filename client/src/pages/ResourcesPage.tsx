import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, BookmarkCheck, LibraryBig, Search, Sparkles } from 'lucide-react'
import { ProductCard, type Product } from '../components/ProductCard'
import styles from './WorkspacePages.module.css'

const products: Product[] = [
  { id: 'khan-academy', title: 'Khan Academy', description: 'Clear, approachable lessons across math, science, and the humanities.', category: 'Learning', readTime: 'Self-paced', accent: '#7bd5aa', icon: '✳', url: 'https://www.khanacademy.org/' },
  { id: 'mit-ocw', title: 'MIT OpenCourseWare', description: 'Explore course materials and lectures from a world-class university.', category: 'Coursework', readTime: 'Open courses', accent: '#ff9d8e', icon: '◈', url: 'https://ocw.mit.edu/' },
  { id: 'zotero', title: 'Zotero', description: 'Collect, organize, cite, and share research with less busywork.', category: 'Research', readTime: 'Reading list', accent: '#f0a2be', icon: '▤', url: 'https://www.zotero.org/' },
  { id: 'anki', title: 'Anki', description: 'A flashcard system that helps you remember what you learn.', category: 'Study tools', readTime: 'Practice', accent: '#8bb6ff', icon: '▧', url: 'https://apps.ankiweb.net/' },
  { id: 'overleaf', title: 'Overleaf', description: 'Write and collaborate on technical documents in your browser.', category: 'Writing', readTime: 'Collaborative', accent: '#80d4c3', icon: '◉', url: 'https://www.overleaf.com/' },
  { id: 'mdn', title: 'MDN Web Docs', description: 'A trusted, in-depth reference for web platform technologies.', category: 'Reference', readTime: 'Documentation', accent: '#b49cff', icon: '⌘', url: 'https://developer.mozilla.org/' },
]

const categories = ['All resources', ...new Set(products.map((product) => product.category))]

export function ResourcesPage() {
  const [category, setCategory] = useState('All resources')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const filtered = useMemo(() => products.filter((product) => (category === 'All resources' || product.category === category) && `${product.title} ${product.description} ${product.category}`.toLowerCase().includes(query.toLowerCase())), [category, query])
  function toggleFavorite(id: string) { setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }

  return <div className={styles.page}>
    <div className={styles.pageHeading}><div><div className={styles.dateLabel}><LibraryBig size={13} /> THOUGHTFUL TOOLS FOR LEARNING</div><h1>Resource showcase</h1><p>A hand-picked starting point for your next study session.</p></div><div className={styles.resourceCount}><BookmarkCheck size={15} />{favorites.length} saved on this page</div></div>
    <section className={styles.resourceIntro}><span className={styles.resourceSpark}><Sparkles size={16} /></span><div><strong>Good resources make good work easier.</strong><p>Browse a few trusted tools and learning libraries. Favorites stay in this browser session.</p></div><span className={styles.resourceAssignment}>REACT PROPS + STATE</span></section>
    <section aria-label="Learning resources">
      <div className={styles.resourceToolbar}><label className={styles.searchBox}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources…" aria-label="Search resources" /></label><label className={styles.categorySelect}><ArrowDownWideNarrow size={14} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className={styles.resourceGrid}>{filtered.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onToggleFavorite={toggleFavorite} />)}</div>
      {!filtered.length && <div className={styles.emptyState}><span className={styles.emptyIcon}><Search size={20} /></span><h2>No resources found</h2><p>Try a different search or category.</p></div>}
    </section>
    <p className={styles.assignmentNote}>Each resource card receives typed product data through props. Favorites and category selection demonstrate React state; favorites remain selected while this page is open. This curated library is separate from your private account data.</p>
  </div>
}
